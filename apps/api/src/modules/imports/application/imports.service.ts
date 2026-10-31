import { Injectable } from "@nestjs/common";
import {
  centavosATexto,
  montoACentavos,
  normalizarTexto,
  validarVoucher,
  type AmarreDetectado,
  type ConfirmarImportacionEntrada,
  type HojaImportacion,
  type Importacion,
  type ImportacionResumen,
  type ObservacionImportacion,
  type UsuarioSesion,
  type VoucherEntrada,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { LedgerService } from "../../ledger";
import { PeriodsService } from "../../periods";
import { errores } from "../../../shared/http/api-error";
import { leerHojaModelo, type HojaLeida, type VoucherImportado } from "../domain/model-sheet-parser";
import { ImportsRepository, type CuentaDestino, type ImportacionRegistro } from "../infrastructure/imports.repository";
import { ModelExcelReader } from "../infrastructure/model-excel.reader";
import { datosGuardadosSchema, resumenGuardadoSchema, type DatosGuardados, type ResumenGuardado } from "../infrastructure/stored-import.schema";

const MAXIMO_OBSERVACIONES_RESPUESTA = 500;
const CAMPOS_AVISO_OMITIDOS = new Set(["razonSocial", "fechaOperacion"]);

function aEntrada(voucher: VoucherImportado): VoucherEntrada {
  return {
    nroOperacion: voucher.nroOperacion.slice(0, 30),
    fechaOperacion: voucher.fechaOperacion,
    analitico: voucher.analitico,
    documento: voucher.documento,
    razonSocial: voucher.razonSocial,
    medioPagoCodigo: voucher.medioPagoCodigo,
    tipoCambio: voucher.tipoCambio,
    lineas: voucher.lineas.map((linea) => ({ detalle: linea.detalle, ingreso: linea.ingreso, egreso: linea.egreso, cuentaContableCodigo: linea.cuentaContableCodigo })),
  };
}

function claveNumero(voucher: VoucherImportado): string {
  return `${voucher.anio}-${voucher.mes}-${voucher.numero}`;
}

function aImportacion(registro: ImportacionRegistro, resumen: ResumenGuardado): Importacion {
  return {
    id: registro.id,
    archivo: registro.archivo,
    estado: registro.estado,
    hojas: resumen.hojas,
    observaciones: resumen.observaciones.slice(0, MAXIMO_OBSERVACIONES_RESPUESTA),
    totalObservaciones: resumen.observaciones.length,
    proveedoresNuevos: resumen.proveedoresNuevos,
    amarres: resumen.amarres,
    importados: registro.importados,
    creadoPorNombre: registro.creadoPor.nombre,
    creadoEn: registro.creadoEn.toISOString(),
  };
}

@Injectable()
export class ImportsService {
  constructor(
    private readonly repositorio: ImportsRepository,
    private readonly lector: ModelExcelReader,
    private readonly libro: LedgerService,
    private readonly periodos: PeriodsService,
    private readonly auditoria: AuditService,
  ) {}

  async listar(): Promise<ImportacionResumen[]> {
    const registros = await this.repositorio.listar();
    return registros.map((registro) => {
      const resumen = resumenGuardadoSchema.parse(registro.resumen);
      return {
        id: registro.id,
        archivo: registro.archivo,
        estado: registro.estado,
        importados: registro.importados,
        creadoPorNombre: registro.creadoPor.nombre,
        creadoEn: registro.creadoEn.toISOString(),
        vouchers: resumen.vouchers,
        omitidos: resumen.omitidos,
      };
    });
  }

  async obtener(id: string): Promise<Importacion> {
    const registro = await this.existente(id);
    return aImportacion(registro, resumenGuardadoSchema.parse(registro.resumen));
  }

  async previsualizar(contenido: Buffer, archivo: string, actor: UsuarioSesion): Promise<Importacion> {
    const hojas = (await this.lector.leer(contenido))
      .map((hoja) => leerHojaModelo(hoja.nombre, hoja.filas))
      .filter((hoja) => hoja.vouchers.length > 0 || hoja.observaciones.length > 0);
    if (hojas.length === 0) {
      throw errores.validacion("No se encontró ninguna hoja visible con las columnas del modelo (N# Voucher, Fecha, Ruc, Detalle, Ingreso, Egreso, CTA, COD).");
    }

    const observaciones: ObservacionImportacion[] = hojas.flatMap((hoja) => hoja.observaciones);
    const invalidos = new Set<VoucherImportado>();
    const marcar = (voucher: VoucherImportado, mensaje: string): void => {
      invalidos.add(voucher);
      observaciones.push({ hoja: voucher.hoja, fila: voucher.fila, voucher: voucher.codigo, nivel: "error", mensaje });
    };

    const todos = hojas.flatMap((hoja) => hoja.vouchers.map((voucher) => ({ hoja, voucher })));
    const vistos = new Map<string, string>();
    for (const { voucher } of todos) {
      const clave = claveNumero(voucher);
      const otraHoja = vistos.get(clave);
      if (otraHoja !== undefined) {
        marcar(voucher, `El número ${voucher.codigo} de ${voucher.anio} ya aparece en la hoja ${otraHoja}.`);
      } else {
        vistos.set(clave, voucher.hoja);
      }
    }

    const meses = [...new Set(todos.map(({ voucher }) => `${voucher.anio}-${voucher.mes}`))];
    for (const clave of meses) {
      const [anio = 0, mes = 0] = clave.split("-").map(Number);
      const usados = await this.periodos.numerosUsados(anio, mes);
      for (const { voucher } of todos) {
        const cuenta = voucher.anio === anio && voucher.mes === mes ? usados.get(voucher.numero) : undefined;
        if (cuenta !== undefined && !invalidos.has(voucher)) {
          marcar(voucher, `El voucher ${voucher.codigo} de ${voucher.anio} ya está registrado en el sistema (${cuenta}).`);
        }
      }
    }

    const contexto = await this.libro.contextoDeValidacion(todos.map(({ voucher }) => voucher.documento));
    for (const { hoja, voucher } of todos) {
      if (invalidos.has(voucher)) {
        continue;
      }
      const problemas = validarVoucher(aEntrada(voucher), {
        moneda: hoja.moneda,
        periodo: { anio: voucher.anio, mes: voucher.mes },
        cuentasContables: contexto.cuentasContables,
        mediosPago: contexto.mediosPago,
        tiposComprobante: contexto.tiposComprobante,
        entidadConocida: contexto.documentosConocidos.has(voucher.documento),
      });
      const errorDeVoucher = problemas.filter((problema) => problema.nivel === "error");
      if (errorDeVoucher.length > 0) {
        marcar(voucher, errorDeVoucher.map((problema) => (problema.linea !== null && voucher.lineas.length > 1 ? `Línea ${problema.linea + 1}: ${problema.mensaje}` : problema.mensaje)).join(" "));
        continue;
      }
      for (const aviso of problemas.filter((problema) => problema.nivel === "aviso" && !CAMPOS_AVISO_OMITIDOS.has(problema.campo))) {
        observaciones.push({ hoja: voucher.hoja, fila: voucher.fila, voucher: voucher.codigo, nivel: "aviso", mensaje: aviso.mensaje });
      }
    }

    const validos = todos.filter(({ voucher }) => !invalidos.has(voucher));
    const amarres = await this.detectarAmarres(validos.map(({ voucher }) => voucher), observaciones);
    const cuentas = await this.repositorio.cuentasTesoreria();
    const resumenHojas = hojas.map((hoja) => this.resumenHoja(hoja, invalidos, cuentas));
    const proveedoresNuevos = new Set(validos.map(({ voucher }) => voucher.documento).filter((documento) => !contexto.documentosConocidos.has(documento))).size;

    const datos: DatosGuardados = {
      hojas: hojas.map((hoja) => ({ nombre: hoja.nombre, moneda: hoja.moneda, vouchers: hoja.vouchers.filter((voucher) => !invalidos.has(voucher)) })),
    };
    const resumen: ResumenGuardado = {
      hojas: resumenHojas,
      observaciones: observaciones.sort((a, b) => a.hoja.localeCompare(b.hoja) || a.fila - b.fila),
      proveedoresNuevos,
      amarres,
      vouchers: validos.length,
      omitidos: invalidos.size,
    };
    const registro = await this.repositorio.crear({ archivo: archivo.slice(0, 200), datos, resumen, creadoPorId: actor.id });
    return aImportacion(registro, resumen);
  }

  async confirmar(id: string, entrada: ConfirmarImportacionEntrada, actor: UsuarioSesion): Promise<Importacion> {
    const registro = await this.existente(id);
    if (registro.estado !== "VALIDADA") {
      throw errores.conflicto(registro.estado === "IMPORTADA" ? "Esta importación ya se realizó." : "Esta importación fue descartada.");
    }
    const datos = datosGuardadosSchema.parse(registro.datos);
    const resumen = resumenGuardadoSchema.parse(registro.resumen);
    const destinos = await this.destinos(datos, entrada);

    const aImportar = datos.hojas.flatMap((hoja) => {
      const cuenta = destinos.get(hoja.nombre);
      return cuenta ? hoja.vouchers.map((voucher) => ({ voucher, cuenta })) : [];
    });
    if (aImportar.length === 0) {
      throw errores.validacion("Asigna al menos una hoja a una cuenta de tesorería.");
    }

    const meses = [...new Set(aImportar.map(({ voucher }) => `${voucher.anio}-${voucher.mes}`))];
    for (const clave of meses) {
      const [anio = 0, mes = 0] = clave.split("-").map(Number);
      const usados = await this.periodos.numerosUsados(anio, mes);
      const ocupado = aImportar.find(({ voucher }) => voucher.anio === anio && voucher.mes === mes && usados.has(voucher.numero));
      if (ocupado) {
        throw errores.conflicto(`El voucher ${ocupado.voucher.codigo} de ${anio} se registró después de la vista previa. Vuelve a subir el archivo.`);
      }
    }

    const importados = await this.repositorio.transaccionLarga(async (tx) => {
      if (!(await this.repositorio.cambiarEstado(tx, id, "IMPORTADA", aImportar.length))) {
        throw errores.conflicto("Esta importación ya no está pendiente.");
      }
      const periodos = new Map<string, { id: string; maximo: number }>();
      for (const { voucher, cuenta } of aImportar) {
        const clave = `${voucher.anio}-${voucher.mes}`;
        let periodo = periodos.get(clave);
        if (!periodo) {
          periodo = { id: await this.periodos.periodoAbierto(tx, voucher.anio, voucher.mes), maximo: 0 };
          periodos.set(clave, periodo);
        }
        periodo.maximo = Math.max(periodo.maximo, voucher.numero);
        await this.libro.crearImportado(tx, aEntrada(voucher), {
          periodoId: periodo.id,
          numero: voucher.numero,
          cuentaTesoreriaId: cuenta.id,
          moneda: cuenta.moneda,
          creadoPorId: actor.id,
          importacionId: id,
        });
      }
      for (const periodo of periodos.values()) {
        await this.periodos.elevarCorrelativo(tx, periodo.id, periodo.maximo);
      }
      const amarresAplicados: string[] = [];
      for (const amarre of resumen.amarres) {
        if (await this.repositorio.aplicarAmarre(tx, amarre.cuentaContableCodigo, amarre.destinoDebeCodigo, amarre.destinoHaberCodigo)) {
          amarresAplicados.push(`${amarre.cuentaContableCodigo}→${amarre.destinoDebeCodigo}/${amarre.destinoHaberCodigo}`);
        }
      }
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "importacion",
        entidadId: id,
        accion: "IMPORTAR",
        despues: {
          archivo: registro.archivo,
          vouchers: aImportar.length,
          hojas: [...destinos.entries()].map(([hoja, cuenta]) => `${hoja} → ${cuenta.nombre}`),
          amarres: amarresAplicados,
        },
      });
      return aImportar.length;
    });

    return aImportacion({ ...registro, estado: "IMPORTADA", importados }, resumen);
  }

  async descartar(id: string, actor: UsuarioSesion): Promise<Importacion> {
    const registro = await this.existente(id);
    await this.repositorio.transaccion(async (tx) => {
      if (!(await this.repositorio.cambiarEstado(tx, id, "DESCARTADA", null))) {
        throw errores.conflicto("Solo se puede descartar una importación pendiente.");
      }
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "importacion", entidadId: id, accion: "ANULAR", despues: { archivo: registro.archivo } });
    });
    return aImportacion({ ...registro, estado: "DESCARTADA" }, resumenGuardadoSchema.parse(registro.resumen));
  }

  private async destinos(datos: DatosGuardados, entrada: ConfirmarImportacionEntrada): Promise<Map<string, CuentaDestino>> {
    const cuentas = new Map((await this.repositorio.cuentasTesoreria()).map((cuenta) => [cuenta.id, cuenta]));
    const resultado = new Map<string, CuentaDestino>();
    const usadas = new Set<string>();
    for (const hoja of datos.hojas) {
      const asignacion = entrada.asignaciones.find((actual) => actual.hoja === hoja.nombre);
      if (!asignacion) {
        throw errores.validacion(`Indica a qué cuenta va la hoja ${hoja.nombre} o márcala para no importarla.`);
      }
      if (asignacion.cuentaTesoreriaId === null) {
        continue;
      }
      const cuenta = cuentas.get(asignacion.cuentaTesoreriaId);
      const campo = `hoja.${hoja.nombre}`;
      if (!cuenta || !cuenta.activa) {
        throw errores.validacion(`La cuenta elegida para ${hoja.nombre} no existe o está desactivada.`, { [campo]: "Cuenta no válida." });
      }
      if (cuenta.moneda !== hoja.moneda) {
        throw errores.validacion(`La hoja ${hoja.nombre} está en ${hoja.moneda === "PEN" ? "soles" : "dólares"} y la cuenta ${cuenta.nombre} no.`, { [campo]: "La moneda no coincide." });
      }
      if (usadas.has(cuenta.id)) {
        throw errores.validacion(`La cuenta ${cuenta.nombre} está asignada a más de una hoja.`, { [campo]: "Cuenta repetida." });
      }
      usadas.add(cuenta.id);
      resultado.set(hoja.nombre, cuenta);
    }
    return resultado;
  }

  private async detectarAmarres(vouchers: VoucherImportado[], observaciones: ObservacionImportacion[]): Promise<AmarreDetectado[]> {
    const pares = new Map<string, Map<string, number>>();
    const codigos = new Set<string>();
    for (const linea of vouchers.flatMap((voucher) => voucher.lineas)) {
      if (!linea.destinoDebe || !linea.destinoHaber) {
        continue;
      }
      codigos.add(linea.cuentaContableCodigo).add(linea.destinoDebe).add(linea.destinoHaber);
      const porCuenta = pares.get(linea.cuentaContableCodigo) ?? new Map<string, number>();
      const par = `${linea.destinoDebe}/${linea.destinoHaber}`;
      porCuenta.set(par, (porCuenta.get(par) ?? 0) + 1);
      pares.set(linea.cuentaContableCodigo, porCuenta);
    }
    const plan = new Map((await this.repositorio.cuentasContables([...codigos])).map((cuenta) => [cuenta.codigo, cuenta]));
    const amarres: AmarreDetectado[] = [];
    for (const [codigo, porPar] of pares) {
      const cuenta = plan.get(codigo);
      if (!cuenta || cuenta.destinoDebeCodigo || cuenta.destinoHaberCodigo) {
        continue;
      }
      const ordenados = [...porPar.entries()].sort((a, b) => b[1] - a[1]);
      const [principal, ...otros] = ordenados;
      if (!principal) {
        continue;
      }
      const [debe = "", haber = ""] = principal[0].split("/");
      if (!plan.get(debe)?.activa || !plan.get(haber)?.activa) {
        continue;
      }
      if (otros.length > 0) {
        observaciones.push({
          hoja: "Amarres",
          fila: 0,
          voucher: null,
          nivel: "aviso",
          mensaje: `La CTA ${codigo} usa varios destinos (${ordenados.map(([par, veces]) => `${par} ×${veces}`).join(", ")}); se propone el más usado.`,
        });
      }
      amarres.push({ cuentaContableCodigo: codigo, destinoDebeCodigo: debe, destinoHaberCodigo: haber, lineas: principal[1] });
    }
    return amarres.sort((a, b) => a.cuentaContableCodigo.localeCompare(b.cuentaContableCodigo));
  }

  private resumenHoja(hoja: HojaLeida, invalidos: ReadonlySet<VoucherImportado>, cuentas: CuentaDestino[]): HojaImportacion {
    const validos = hoja.vouchers.filter((voucher) => !invalidos.has(voucher));
    const lineas = validos.flatMap((voucher) => voucher.lineas);
    const sugerida = cuentas.find((cuenta) => cuenta.activa && cuenta.moneda === hoja.moneda && normalizarTexto(cuenta.nombre).replace(/[^A-Z0-9]/g, "") === normalizarTexto(hoja.nombre).replace(/[^A-Z0-9]/g, ""));
    return {
      nombre: hoja.nombre,
      moneda: hoja.moneda,
      vouchers: validos.length,
      lineas: lineas.length,
      omitidos: hoja.vouchers.length - validos.length,
      meses: [...new Set(validos.map((voucher) => `${voucher.anio}-${String(voucher.mes).padStart(2, "0")}`))].sort(),
      ingreso: centavosATexto(lineas.reduce((total, linea) => total + montoACentavos(linea.ingreso), 0)),
      egreso: centavosATexto(lineas.reduce((total, linea) => total + montoACentavos(linea.egreso), 0)),
      cuentaSugeridaId: sugerida?.id ?? null,
    };
  }

  private async existente(id: string): Promise<ImportacionRegistro> {
    const registro = await this.repositorio.buscar(id);
    if (!registro) {
      throw errores.noEncontrado("La importación no existe.");
    }
    return registro;
  }
}

