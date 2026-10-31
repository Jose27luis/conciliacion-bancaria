import { Injectable } from "@nestjs/common";
import {
  formatoVoucher,
  MESES,
  montoACentavos,
  normalizarDocumento,
  normalizarMonto,
  normalizarTexto,
  parsearAnalitico,
  puedeModificarVoucher,
  textoAnalitico,
  validarVoucher,
  type Analitico,
  type AnularVoucherEntrada,
  type AvisoLote,
  type ExportacionQuery,
  type Hoja,
  type HojaQuery,
  type Libro,
  type LibroQuery,
  type LoteRegistrado,
  type LoteVouchersEntrada,
  type Moneda,
  type UsuarioSesion,
  type Voucher,
  type VoucherEntrada,
} from "@conciliacion/contracts";
import type { Prisma } from "@prisma/client";
import { AuditService } from "../../audit";
import { EntitiesService } from "../../entities";
import { PeriodsService } from "../../periods";
import { errores } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { LedgerExcelWriter } from "../infrastructure/ledger-excel.writer";
import { LedgerRepository, type CuentaParaHoja, type DatosCabecera, type DatosLinea, type VoucherRegistro } from "../infrastructure/ledger.repository";

const TIPO_CAMBIO_SOLES = "1.000";

export type ArchivoExportado = { nombre: string; contenido: Buffer };

export type ContextoCatalogos = {
  cuentasContables: ReadonlySet<string>;
  mediosPago: ReadonlySet<string>;
  tiposComprobante: ReadonlySet<string>;
  documentosConocidos: ReadonlySet<string>;
};

export type DestinoImportado = {
  periodoId: string;
  numero: number;
  cuentaTesoreriaId: string;
  moneda: Moneda;
  creadoPorId: string;
  importacionId: string;
};

function aVoucher(registro: VoucherRegistro): Voucher {
  const analitico: Analitico | null =
    registro.tipoComprobanteCodigo && registro.serie && registro.numeroComprobante
      ? { tipo: registro.tipoComprobanteCodigo, serie: registro.serie, numero: registro.numeroComprobante }
      : null;
  return {
    id: registro.id,
    codigo: formatoVoucher(registro.periodo.mes, registro.numero),
    numero: registro.numero,
    anio: registro.periodo.anio,
    mes: registro.periodo.mes,
    cuentaTesoreriaId: registro.cuentaTesoreriaId,
    cuentaTesoreriaNombre: registro.cuentaTesoreria.nombre,
    moneda: registro.cuentaTesoreria.moneda,
    fechaOperacion: registro.fechaOperacion.toISOString().slice(0, 10),
    nroOperacion: registro.nroOperacion,
    analitico: textoAnalitico(analitico),
    entidad: registro.entidad,
    medioPagoCodigo: registro.medioPagoCodigo,
    medioPagoDescripcion: registro.medioPago.descripcion,
    tipoCambio: registro.tipoCambio.toFixed(3),
    estado: registro.estado,
    motivoAnulacion: registro.motivoAnulacion,
    lineas: registro.lineas.map((linea, indice) => ({
      id: linea.id,
      linea: indice + 1,
      detalle: linea.detalle,
      ingreso: linea.ingreso.toFixed(2),
      egreso: linea.egreso.toFixed(2),
      cuentaContableCodigo: linea.cuentaContableCodigo,
      cuentaContableDenominacion: linea.cuentaContable.denominacion,
    })),
    creadoPorId: registro.creadoPorId,
    creadoPorNombre: registro.creadoPor.nombre,
    creadoEn: registro.creadoEn.toISOString(),
  };
}

function resumenAuditoria(voucher: Voucher): Prisma.InputJsonValue {
  return {
    codigo: voucher.codigo,
    cuenta: voucher.cuentaTesoreriaNombre,
    fechaOperacion: voucher.fechaOperacion,
    nroOperacion: voucher.nroOperacion,
    analitico: voucher.analitico,
    documento: voucher.entidad.numeroDocumento,
    medioPagoCodigo: voucher.medioPagoCodigo,
    tipoCambio: voucher.tipoCambio,
    lineas: voucher.lineas.map((linea) => ({ detalle: linea.detalle, ingreso: linea.ingreso, egreso: linea.egreso, cuenta: linea.cuentaContableCodigo })),
  };
}

function fechaDate(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function mesDe(fecha: string): { anio: number; mes: number } {
  const [anio = 0, mes = 0] = fecha.split("-").map(Number);
  return { anio, mes };
}

function datosLinea(linea: VoucherEntrada["lineas"][number]): DatosLinea {
  return {
    detalle: linea.detalle.trim().replace(/\s+/g, " "),
    ingreso: normalizarMonto(linea.ingreso) || "0",
    egreso: normalizarMonto(linea.egreso) || "0",
    cuentaContableCodigo: linea.cuentaContableCodigo.trim(),
  };
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly repositorio: LedgerRepository,
    private readonly periodos: PeriodsService,
    private readonly entidades: EntitiesService,
    private readonly auditoria: AuditService,
    private readonly excel: LedgerExcelWriter,
  ) {}

  async hoja(consulta: HojaQuery): Promise<Hoja> {
    const cuenta = await this.cuentaExistente(consulta.cuenta);
    const [periodo, vouchers] = await Promise.all([
      this.periodos.vista(consulta.anio, consulta.mes),
      this.repositorio.vouchersDeHoja(cuenta.id, consulta.anio, consulta.mes),
    ]);
    return { cuenta: { id: cuenta.id, nombre: cuenta.nombre, moneda: cuenta.moneda }, periodo, vouchers: vouchers.map(aVoucher) };
  }

  async libro(consulta: LibroQuery): Promise<Libro> {
    const { items, total, totales } = await this.repositorio.libro(consulta);
    return {
      items: items.map(aVoucher),
      total,
      pagina: consulta.pagina,
      porPagina: consulta.porPagina,
      totales: totales.map((fila) => ({ moneda: fila.moneda, ingreso: fila.ingreso.toFixed(2), egreso: fila.egreso.toFixed(2) })),
    };
  }

  async obtener(id: string): Promise<Voucher> {
    const voucher = await this.repositorio.voucherPorId(id);
    if (!voucher) {
      throw errores.noEncontrado("El voucher no existe.");
    }
    return aVoucher(voucher);
  }

  async avisos(lote: LoteVouchersEntrada): Promise<AvisoLote[]> {
    const avisos: AvisoLote[] = [];
    const analiticos = lote.vouchers.map((voucher) => parsearAnalitico(voucher.analitico));
    const conComprobante = analiticos.filter((valor): valor is Analitico => valor !== null && valor !== "SIN_COMPROBANTE");

    const [porAnalitico, porImporte] = await Promise.all([
      this.repositorio.duplicadosPorAnalitico(conComprobante),
      this.repositorio.duplicadosPorImporte(
        lote.cuentaTesoreriaId,
        lote.vouchers.map((voucher) => normalizarDocumento(voucher.documento)).filter(Boolean),
        lote.vouchers.filter((voucher) => /^\d{4}-\d{2}-\d{2}$/.test(voucher.fechaOperacion)).map((voucher) => fechaDate(voucher.fechaOperacion)),
      ),
    ]);

    const vistos = new Map<string, number>();
    lote.vouchers.forEach((voucher, indice) => {
      const analitico = analiticos[indice];
      if (analitico && analitico !== "SIN_COMPROBANTE") {
        const clave = textoAnalitico(analitico);
        const previo = porAnalitico.find(
          (fila) => fila.id !== voucher.voucherId && fila.tipoComprobanteCodigo === analitico.tipo && fila.serie === analitico.serie && fila.numeroComprobante === analitico.numero,
        );
        if (previo) {
          avisos.push({ indice, mensaje: `Posible duplicado: el analítico ${clave} ya está registrado en el voucher ${formatoVoucher(previo.mes, previo.numero)} de ${previo.cuenta}.` });
        }
        if (vistos.has(clave)) {
          avisos.push({ indice, mensaje: `Posible duplicado: el analítico ${clave} se repite en otra fila de la hoja.` });
        } else {
          vistos.set(clave, indice);
        }
      }

      const documento = normalizarDocumento(voucher.documento);
      for (const linea of voucher.lineas) {
        const ingreso = montoACentavos(linea.ingreso);
        const egreso = montoACentavos(linea.egreso);
        const igual = porImporte.find(
          (fila) =>
            fila.id !== voucher.voucherId &&
            fila.numeroDocumento === documento &&
            fila.fechaOperacion.toISOString().slice(0, 10) === voucher.fechaOperacion &&
            Math.round(fila.ingreso.toNumber() * 100) === ingreso &&
            Math.round(fila.egreso.toNumber() * 100) === egreso,
        );
        if (igual) {
          avisos.push({ indice, mensaje: `Mismo documento, fecha e importe que el voucher ${formatoVoucher(igual.mes, igual.numero)}. Confirma que no sea doble.` });
          break;
        }
      }
    });
    return avisos;
  }

  async registrar(lote: LoteVouchersEntrada, actor: UsuarioSesion): Promise<LoteRegistrado> {
    const cuenta = await this.cuentaExistente(lote.cuentaTesoreriaId);
    if (!cuenta.activa) {
      throw errores.conflicto(`La cuenta ${cuenta.nombre} está desactivada.`);
    }
    const detalle = await this.erroresDeValidacion(lote.vouchers, cuenta.moneda, { anio: lote.anio, mes: lote.mes });
    const conError = new Set(Object.keys(detalle).map((clave) => clave.split(".")[1])).size;
    if (conError > 0) {
      throw errores.validacion(`${conError === 1 ? "Un voucher tiene" : `${conError} vouchers tienen`} errores. No se registró nada.`, detalle);
    }

    const creados = await this.repositorio.transaccion(async (tx) => {
      const porPeriodo = new Map<string, number[]>();
      lote.vouchers.forEach((voucher, indice) => {
        const { anio, mes } = mesDe(voucher.fechaOperacion);
        const clave = `${anio}-${mes}`;
        porPeriodo.set(clave, [...(porPeriodo.get(clave) ?? []), indice]);
      });

      const asignacion = new Map<number, { periodoId: string; numero: number }>();
      for (const [clave, indices] of [...porPeriodo.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const [anio = 0, mes = 0] = clave.split("-").map(Number);
        const reservados = await this.periodos.reservarNumeros(tx, anio, mes, indices.length);
        indices.forEach((indice, posicion) => {
          const numero = reservados.numeros[posicion];
          if (numero !== undefined) {
            asignacion.set(indice, { periodoId: reservados.periodoId, numero });
          }
        });
      }

      const resultado: VoucherRegistro[] = [];
      for (const [indice, voucher] of lote.vouchers.entries()) {
        const destino = asignacion.get(indice);
        if (!destino) {
          throw new Error(`No se asignó correlativo al voucher ${indice}`);
        }
        const cabecera = await this.cabecera(tx, voucher, cuenta.moneda, null);
        const creado = await this.repositorio.crearVoucher(tx, {
          ...cabecera,
          periodoId: destino.periodoId,
          numero: destino.numero,
          cuentaTesoreriaId: cuenta.id,
          creadoPorId: actor.id,
          lineas: voucher.lineas.map((linea, posicion) => ({ ...datosLinea(linea), linea: posicion + 1 })),
        });
        await this.aprender(tx, cabecera.entidadId, cabecera.medioPagoCodigo, voucher.lineas.map(datosLinea));
        const salida = aVoucher(creado);
        await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "voucher", entidadId: creado.id, accion: "REGISTRAR", despues: resumenAuditoria(salida) });
        resultado.push(creado);
      }
      return resultado;
    });

    return { vouchers: creados.map(aVoucher) };
  }

  async editar(id: string, entrada: VoucherEntrada, actor: UsuarioSesion): Promise<Voucher> {
    const actual = await this.modificable(id, actor);
    const { anio, mes } = mesDe(entrada.fechaOperacion);
    if (anio !== actual.periodo.anio || mes !== actual.periodo.mes) {
      const mensaje = `La fecha debe quedar en ${MESES[actual.periodo.mes - 1] ?? actual.periodo.mes} ${actual.periodo.anio}. Para moverlo a otro mes, anúlalo y regístralo de nuevo.`;
      throw errores.validacion(mensaje, { fechaOperacion: mensaje });
    }
    const detalle = await this.erroresDeValidacion([entrada], actual.cuentaTesoreria.moneda, actual.periodo);
    if (Object.keys(detalle).length > 0) {
      const sinIndice = Object.fromEntries(Object.entries(detalle).map(([clave, mensaje]) => [clave.replace(/^vouchers\.0\./, ""), mensaje]));
      throw errores.validacion("El voucher tiene errores. No se guardaron los cambios.", sinIndice);
    }

    const editado = await this.repositorio.transaccion(async (tx) => {
      await this.repositorio.bloquearVoucher(tx, id);
      const vigente = await this.repositorio.buscarVoucher(tx, id);
      if (!vigente || vigente.estado !== "REGISTRADO") {
        throw errores.conflicto("El voucher cambió mientras lo editabas. Recarga la hoja.");
      }
      await this.periodos.periodoAbierto(tx, vigente.periodo.anio, vigente.periodo.mes);
      const documentoActual = vigente.entidad.numeroDocumento;
      const cabecera = await this.cabecera(tx, entrada, vigente.cuentaTesoreria.moneda, normalizarDocumento(entrada.documento) === documentoActual ? vigente.entidad.id : null);
      await this.repositorio.actualizarCabecera(tx, id, cabecera);

      const nuevas = entrada.lineas.map(datosLinea);
      let ultima = await this.repositorio.ultimaLinea(tx, id);
      const aprendidas: DatosLinea[] = [];
      for (const [posicion, datos] of nuevas.entries()) {
        const existente = vigente.lineas[posicion];
        if (existente) {
          await this.repositorio.actualizarLinea(tx, existente.id, datos);
          if (normalizarTexto(existente.detalle) !== normalizarTexto(datos.detalle) || existente.cuentaContableCodigo !== datos.cuentaContableCodigo) {
            aprendidas.push(datos);
          }
        } else {
          ultima += 1;
          await this.repositorio.crearLinea(tx, id, ultima, datos);
          aprendidas.push(datos);
        }
      }
      await this.repositorio.retirarLineas(tx, vigente.lineas.slice(nuevas.length).map((linea) => linea.id));
      await this.aprender(tx, cabecera.entidadId, cabecera.medioPagoCodigo, cabecera.entidadId === vigente.entidad.id ? aprendidas : nuevas);

      const resultado = await this.repositorio.buscarVoucher(tx, id);
      if (!resultado) {
        throw errores.noEncontrado("El voucher no existe.");
      }
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "voucher",
        entidadId: id,
        accion: "EDITAR",
        antes: resumenAuditoria(aVoucher(vigente)),
        despues: resumenAuditoria(aVoucher(resultado)),
      });
      return resultado;
    });
    return aVoucher(editado);
  }

  async anular(id: string, entrada: AnularVoucherEntrada, actor: UsuarioSesion): Promise<Voucher> {
    await this.modificable(id, actor);
    const anulado = await this.repositorio.transaccion(async (tx) => {
      await this.repositorio.bloquearVoucher(tx, id);
      const vigente = await this.repositorio.buscarVoucher(tx, id);
      if (!vigente || vigente.estado !== "REGISTRADO") {
        throw errores.conflicto("El voucher ya fue anulado.");
      }
      await this.periodos.periodoAbierto(tx, vigente.periodo.anio, vigente.periodo.mes);
      await this.repositorio.anular(tx, id, entrada.motivo);
      const resultado = await this.repositorio.buscarVoucher(tx, id);
      if (!resultado) {
        throw errores.noEncontrado("El voucher no existe.");
      }
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "voucher",
        entidadId: id,
        accion: "ANULAR",
        antes: resumenAuditoria(aVoucher(vigente)),
        despues: { motivo: entrada.motivo },
      });
      return resultado;
    });
    return aVoucher(anulado);
  }

  async exportar(consulta: ExportacionQuery): Promise<ArchivoExportado> {
    const cuentas = await this.repositorio.cuentasParaExportar(consulta.cuenta);
    if (consulta.cuenta && cuentas.length === 0) {
      throw errores.noEncontrado("La cuenta de tesorería no existe.");
    }
    const vouchers = await this.repositorio.vouchersParaExportar(consulta.anio, consulta.mes, consulta.cuenta);
    const hojas = cuentas.map((cuenta) => ({ nombre: cuenta.nombre, vouchers: vouchers.filter((voucher) => voucher.cuentaTesoreriaId === cuenta.id) }));
    const contenido = await this.excel.escribir(hojas);
    const mes = String(consulta.mes).padStart(2, "0");
    const sufijo = consulta.cuenta && cuentas[0] ? `-${cuentas[0].nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
    return { nombre: `conciliacion-${consulta.anio}-${mes}${sufijo}.xlsx`, contenido };
  }

  async contextoDeValidacion(documentos: string[]): Promise<ContextoCatalogos> {
    const [catalogos, conocidos] = await Promise.all([this.repositorio.catalogosActivos(), this.entidades.documentosConocidos(documentos)]);
    return {
      cuentasContables: new Set(catalogos.cuentas),
      mediosPago: new Set(catalogos.medios),
      tiposComprobante: new Set(catalogos.tipos),
      documentosConocidos: conocidos,
    };
  }

  async crearImportado(tx: Transaccion, voucher: VoucherEntrada, destino: DestinoImportado): Promise<void> {
    const cabecera = await this.cabecera(tx, voucher, destino.moneda, null);
    await this.repositorio.crearVoucher(tx, {
      ...cabecera,
      periodoId: destino.periodoId,
      numero: destino.numero,
      cuentaTesoreriaId: destino.cuentaTesoreriaId,
      creadoPorId: destino.creadoPorId,
      importacionId: destino.importacionId,
      lineas: voucher.lineas.map((linea, posicion) => ({ ...datosLinea(linea), linea: posicion + 1 })),
    });
    await this.aprender(tx, cabecera.entidadId, cabecera.medioPagoCodigo, voucher.lineas.map(datosLinea));
  }

  private async modificable(id: string, actor: UsuarioSesion): Promise<VoucherRegistro> {
    const voucher = await this.repositorio.voucherPorId(id);
    if (!voucher) {
      throw errores.noEncontrado("El voucher no existe.");
    }
    if (voucher.estado === "ANULADO") {
      throw errores.conflicto("El voucher está anulado y ya no se puede modificar.");
    }
    if (voucher.periodo.estado === "CERRADO") {
      throw errores.conflicto(`${MESES[voucher.periodo.mes - 1] ?? voucher.periodo.mes} ${voucher.periodo.anio} está cerrado. No se pueden modificar sus vouchers.`);
    }
    if (!puedeModificarVoucher(actor.rol, actor.id, voucher.creadoPorId)) {
      throw errores.prohibido("Solo puedes modificar los vouchers que registraste tú.");
    }
    return voucher;
  }

  private async cabecera(tx: Transaccion, voucher: VoucherEntrada, moneda: Moneda, entidadExistenteId: string | null): Promise<DatosCabecera> {
    const entidadId = entidadExistenteId ?? (await this.entidades.usar(tx, voucher.documento, voucher.razonSocial)).id;
    const analitico = parsearAnalitico(voucher.analitico);
    const comprobante = analitico && analitico !== "SIN_COMPROBANTE" ? analitico : null;
    return {
      fechaOperacion: fechaDate(voucher.fechaOperacion),
      nroOperacion: voucher.nroOperacion.trim() || null,
      entidadId,
      tipoComprobanteCodigo: comprobante?.tipo ?? null,
      serie: comprobante?.serie ?? null,
      numeroComprobante: comprobante?.numero ?? null,
      medioPagoCodigo: voucher.medioPagoCodigo.trim(),
      tipoCambio: moneda === "PEN" ? TIPO_CAMBIO_SOLES : voucher.tipoCambio.trim(),
    };
  }

  private async aprender(tx: Transaccion, entidadId: string, medioPagoCodigo: string, lineas: DatosLinea[]): Promise<void> {
    for (const linea of lineas) {
      await this.entidades.aprender(tx, entidadId, linea.detalle, linea.cuentaContableCodigo, medioPagoCodigo);
    }
  }

  private async erroresDeValidacion(vouchers: VoucherEntrada[], moneda: Moneda, periodo: { anio: number; mes: number }): Promise<Record<string, string>> {
    const [catalogos, conocidos] = await Promise.all([
      this.repositorio.catalogosActivos(),
      this.entidades.documentosConocidos(vouchers.map((voucher) => voucher.documento)),
    ]);
    const cuentasContables = new Set(catalogos.cuentas);
    const mediosPago = new Set(catalogos.medios);
    const tiposComprobante = new Set(catalogos.tipos);

    const detalle: Record<string, string> = {};
    vouchers.forEach((voucher, indice) => {
      const problemas = validarVoucher(voucher, {
        moneda,
        periodo,
        cuentasContables,
        mediosPago,
        tiposComprobante,
        entidadConocida: conocidos.has(normalizarDocumento(voucher.documento)),
      }).filter((problema) => problema.nivel === "error");
      for (const problema of problemas) {
        const clave = problema.linea === null ? `vouchers.${indice}.${problema.campo}` : `vouchers.${indice}.lineas.${problema.linea}.${problema.campo}`;
        detalle[clave] ??= problema.mensaje;
      }
    });
    return detalle;
  }

  private async cuentaExistente(id: string): Promise<CuentaParaHoja> {
    const cuenta = await this.repositorio.cuenta(id);
    if (!cuenta) {
      throw errores.noEncontrado("La cuenta de tesorería no existe.");
    }
    return cuenta;
  }
}

