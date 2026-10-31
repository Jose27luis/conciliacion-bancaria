import { Injectable } from "@nestjs/common";
import {
  formatoVoucher,
  montoACentavos,
  normalizarAnalitico,
  normalizarDocumento,
  normalizarMonto,
  parsearAnalitico,
  textoAnalitico,
  validarVoucher,
  type Analitico,
  type AvisoLote,
  type Hoja,
  type HojaQuery,
  type LoteRegistrado,
  type LoteVouchersEntrada,
  type Moneda,
  type UsuarioSesion,
  type Voucher,
  type VoucherBorrador,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { EntitiesService } from "../../entities";
import { PeriodsService } from "../../periods";
import { errores } from "../../../shared/http/api-error";
import { LedgerRepository, type CuentaParaHoja, type VoucherRegistro } from "../infrastructure/ledger.repository";

const TIPO_CAMBIO_SOLES = "1.000";

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
    fechaOperacion: registro.fechaOperacion.toISOString().slice(0, 10),
    nroOperacion: registro.nroOperacion,
    analitico: textoAnalitico(analitico),
    entidad: registro.entidad,
    medioPagoCodigo: registro.medioPagoCodigo,
    medioPagoDescripcion: registro.medioPago.descripcion,
    tipoCambio: registro.tipoCambio.toFixed(3),
    estado: registro.estado,
    lineas: registro.lineas.map((linea) => ({
      id: linea.id,
      linea: linea.linea,
      detalle: linea.detalle,
      ingreso: linea.ingreso.toFixed(2),
      egreso: linea.egreso.toFixed(2),
      cuentaContableCodigo: linea.cuentaContableCodigo,
      cuentaContableDenominacion: linea.cuentaContable.denominacion,
    })),
    creadoEn: registro.creadoEn.toISOString(),
  };
}

function fechaDate(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function mesDe(fecha: string): { anio: number; mes: number } {
  const [anio = 0, mes = 0] = fecha.split("-").map(Number);
  return { anio, mes };
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly repositorio: LedgerRepository,
    private readonly periodos: PeriodsService,
    private readonly entidades: EntitiesService,
    private readonly auditoria: AuditService,
  ) {}

  async hoja(consulta: HojaQuery): Promise<Hoja> {
    const cuenta = await this.cuentaExistente(consulta.cuenta);
    const [periodo, vouchers] = await Promise.all([
      this.periodos.vista(consulta.anio, consulta.mes),
      this.repositorio.vouchersDeHoja(cuenta.id, consulta.anio, consulta.mes),
    ]);
    return { cuenta: { id: cuenta.id, nombre: cuenta.nombre, moneda: cuenta.moneda }, periodo, vouchers: vouchers.map(aVoucher) };
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
        const previo = porAnalitico.find((fila) => fila.tipoComprobanteCodigo === analitico.tipo && fila.serie === analitico.serie && fila.numeroComprobante === analitico.numero);
        if (previo) {
          avisos.push({ indice, mensaje: `Posible duplicado: el analítico ${clave} ya está registrado en el voucher ${formatoVoucher(previo.mes, previo.numero)} de ${previo.cuenta}.` });
        }
        const otroIndice = vistos.get(clave);
        if (otroIndice !== undefined) {
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
    await this.validarLote(lote, cuenta.moneda);

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
        const entidad = await this.entidades.usar(tx, voucher.documento, voucher.razonSocial);
        const analitico = parsearAnalitico(voucher.analitico);
        const comprobante = analitico && analitico !== "SIN_COMPROBANTE" ? analitico : null;
        const medioPagoCodigo = voucher.medioPagoCodigo.trim();
        const creado = await this.repositorio.crearVoucher(tx, {
          periodoId: destino.periodoId,
          numero: destino.numero,
          cuentaTesoreriaId: cuenta.id,
          fechaOperacion: fechaDate(voucher.fechaOperacion),
          nroOperacion: voucher.nroOperacion.trim() || null,
          entidadId: entidad.id,
          tipoComprobanteCodigo: comprobante?.tipo ?? null,
          serie: comprobante?.serie ?? null,
          numeroComprobante: comprobante?.numero ?? null,
          medioPagoCodigo,
          tipoCambio: cuenta.moneda === "PEN" ? TIPO_CAMBIO_SOLES : voucher.tipoCambio.trim(),
          creadoPorId: actor.id,
          lineas: voucher.lineas.map((linea, posicion) => ({
            linea: posicion + 1,
            detalle: linea.detalle.trim().replace(/\s+/g, " "),
            ingreso: normalizarMonto(linea.ingreso) || "0",
            egreso: normalizarMonto(linea.egreso) || "0",
            cuentaContableCodigo: linea.cuentaContableCodigo.trim(),
          })),
        });
        for (const linea of voucher.lineas) {
          await this.entidades.aprender(tx, entidad.id, linea.detalle, linea.cuentaContableCodigo.trim(), medioPagoCodigo);
        }
        await this.auditoria.registrar(tx, {
          usuarioId: actor.id,
          entidad: "voucher",
          entidadId: creado.id,
          accion: "REGISTRAR",
          despues: { codigo: formatoVoucher(creado.periodo.mes, creado.numero), cuenta: cuenta.nombre, analitico: normalizarAnalitico(voucher.analitico), documento: entidad.numeroDocumento },
        });
        resultado.push(creado);
      }
      return resultado;
    });

    return { vouchers: creados.map(aVoucher) };
  }

  private async validarLote(lote: LoteVouchersEntrada, moneda: Moneda): Promise<void> {
    const [catalogos, conocidos] = await Promise.all([
      this.repositorio.catalogosActivos(),
      this.entidades.documentosConocidos(lote.vouchers.map((voucher) => voucher.documento)),
    ]);
    const cuentasContables = new Set(catalogos.cuentas);
    const mediosPago = new Set(catalogos.medios);
    const tiposComprobante = new Set(catalogos.tipos);

    const detalle: Record<string, string> = {};
    let conError = 0;
    lote.vouchers.forEach((voucher, indice) => {
      const borrador: VoucherBorrador = voucher;
      const problemas = validarVoucher(borrador, {
        moneda,
        periodo: { anio: lote.anio, mes: lote.mes },
        cuentasContables,
        mediosPago,
        tiposComprobante,
        entidadConocida: conocidos.has(normalizarDocumento(voucher.documento)),
      }).filter((problema) => problema.nivel === "error");
      if (problemas.length > 0) {
        conError += 1;
      }
      for (const problema of problemas) {
        const clave = problema.linea === null ? `vouchers.${indice}.${problema.campo}` : `vouchers.${indice}.lineas.${problema.linea}.${problema.campo}`;
        detalle[clave] ??= problema.mensaje;
      }
    });
    if (conError > 0) {
      throw errores.validacion(`${conError === 1 ? "Un voucher tiene" : `${conError} vouchers tienen`} errores. No se registró nada.`, detalle);
    }
  }

  private async cuentaExistente(id: string): Promise<CuentaParaHoja> {
    const cuenta = await this.repositorio.cuenta(id);
    if (!cuenta) {
      throw errores.noEncontrado("La cuenta de tesorería no existe.");
    }
    return cuenta;
  }
}
