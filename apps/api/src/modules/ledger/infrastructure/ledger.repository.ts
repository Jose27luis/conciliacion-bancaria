import { Injectable } from "@nestjs/common";
import type { LibroQuery } from "@conciliacion/contracts";
import { Prisma, type Moneda } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

export const camposVoucher = {
  id: true,
  numero: true,
  cuentaTesoreriaId: true,
  fechaOperacion: true,
  nroOperacion: true,
  tipoComprobanteCodigo: true,
  serie: true,
  numeroComprobante: true,
  medioPagoCodigo: true,
  tipoCambio: true,
  estado: true,
  motivoAnulacion: true,
  creadoPorId: true,
  creadoEn: true,
  periodo: { select: { anio: true, mes: true, estado: true } },
  cuentaTesoreria: { select: { nombre: true, moneda: true } },
  creadoPor: { select: { nombre: true } },
  entidad: { select: { id: true, tipoDocumento: true, numeroDocumento: true, razonSocial: true, usos: true } },
  medioPago: { select: { descripcion: true } },
  lineas: {
    where: { vigente: true },
    select: { id: true, linea: true, detalle: true, ingreso: true, egreso: true, cuentaContableCodigo: true, cuentaContable: { select: { denominacion: true } } },
    orderBy: { linea: "asc" },
  },
} satisfies Prisma.VoucherSelect;

export type VoucherRegistro = Prisma.VoucherGetPayload<{ select: typeof camposVoucher }>;

export type CuentaParaHoja = { id: string; nombre: string; moneda: Moneda; activa: boolean };

export type DuplicadoAnalitico = { tipoComprobanteCodigo: string | null; serie: string | null; numeroComprobante: string | null; numero: number; mes: number; cuenta: string; id: string };

export type DuplicadoImporte = { id: string; numeroDocumento: string; fechaOperacion: Date; numero: number; mes: number; ingreso: Prisma.Decimal; egreso: Prisma.Decimal };

export type DatosLinea = { detalle: string; ingreso: string; egreso: string; cuentaContableCodigo: string };

export type DatosCabecera = {
  fechaOperacion: Date;
  nroOperacion: string | null;
  entidadId: string;
  tipoComprobanteCodigo: string | null;
  serie: string | null;
  numeroComprobante: string | null;
  medioPagoCodigo: string;
  tipoCambio: string;
};

export type DatosVoucher = DatosCabecera & {
  periodoId: string;
  numero: number;
  cuentaTesoreriaId: string;
  creadoPorId: string;
  lineas: (DatosLinea & { linea: number })[];
};

export type TotalesMoneda = { moneda: Moneda; ingreso: Prisma.Decimal; egreso: Prisma.Decimal };

function filtroLibro(consulta: LibroQuery): Prisma.VoucherWhereInput {
  const condiciones: Prisma.VoucherWhereInput[] = [{ periodo: { anio: consulta.anio, mes: consulta.mes } }];
  if (consulta.cuenta) {
    condiciones.push({ cuentaTesoreriaId: consulta.cuenta });
  }
  if (consulta.estado !== "TODOS") {
    condiciones.push({ estado: consulta.estado });
  }
  const texto = consulta.q?.trim();
  if (texto) {
    const opciones: Prisma.VoucherWhereInput[] = [
      { entidad: { numeroDocumento: { startsWith: texto.replace(/[\s.-]/g, "") } } },
      { entidad: { razonSocial: { contains: texto, mode: "insensitive" } } },
      { serie: { contains: texto, mode: "insensitive" } },
      { numeroComprobante: { contains: texto, mode: "insensitive" } },
      { nroOperacion: { contains: texto, mode: "insensitive" } },
      { lineas: { some: { vigente: true, detalle: { contains: texto, mode: "insensitive" } } } },
      { lineas: { some: { vigente: true, cuentaContableCodigo: { startsWith: texto } } } },
    ];
    const codigo = /^(\d{1,2})-(\d{1,5})$/.exec(texto);
    if (codigo?.[2]) {
      opciones.push({ numero: Number(codigo[2]) });
    } else if (/^\d{1,5}$/.test(texto)) {
      opciones.push({ numero: Number(texto) });
    }
    const analitico = /^([0-9A-Z]{2,4})-([0-9A-Z]{1,8})-([0-9A-Z]{1,12})$/i.exec(texto);
    if (analitico?.[1] && analitico[2] && analitico[3]) {
      opciones.push({ tipoComprobanteCodigo: analitico[1].toUpperCase(), serie: analitico[2].toUpperCase(), numeroComprobante: analitico[3].toUpperCase() });
    }
    condiciones.push({ OR: opciones });
  }
  return { AND: condiciones };
}

@Injectable()
export class LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  cuenta(id: string): Promise<CuentaParaHoja | null> {
    return this.prisma.cuentaTesoreria.findUnique({ where: { id }, select: { id: true, nombre: true, moneda: true, activa: true } });
  }

  vouchersDeHoja(cuentaTesoreriaId: string, anio: number, mes: number): Promise<VoucherRegistro[]> {
    return this.prisma.voucher.findMany({
      where: { cuentaTesoreriaId, periodo: { anio, mes } },
      select: camposVoucher,
      orderBy: [{ fechaOperacion: "asc" }, { numero: "asc" }],
    });
  }

  async libro(consulta: LibroQuery): Promise<{ items: VoucherRegistro[]; total: number; totales: TotalesMoneda[] }> {
    const where = filtroLibro(consulta);
    const [items, total, totalesPen, totalesUsd] = await this.prisma.$transaction([
      this.prisma.voucher.findMany({
        where,
        select: camposVoucher,
        orderBy: [{ fechaOperacion: "asc" }, { numero: "asc" }],
        skip: (consulta.pagina - 1) * consulta.porPagina,
        take: consulta.porPagina,
      }),
      this.prisma.voucher.count({ where }),
      this.prisma.lineaVoucher.aggregate({
        where: { vigente: true, voucher: { AND: [where, { estado: "REGISTRADO" }, { cuentaTesoreria: { moneda: "PEN" } }] } },
        _sum: { ingreso: true, egreso: true },
      }),
      this.prisma.lineaVoucher.aggregate({
        where: { vigente: true, voucher: { AND: [where, { estado: "REGISTRADO" }, { cuentaTesoreria: { moneda: "USD" } }] } },
        _sum: { ingreso: true, egreso: true },
      }),
    ]);
    const cero = new Prisma.Decimal(0);
    const totales: TotalesMoneda[] = [];
    for (const [moneda, suma] of [["PEN", totalesPen._sum], ["USD", totalesUsd._sum]] as const) {
      if (suma.ingreso || suma.egreso) {
        totales.push({ moneda, ingreso: suma.ingreso ?? cero, egreso: suma.egreso ?? cero });
      }
    }
    return { items, total, totales };
  }

  buscarVoucher(tx: Transaccion, id: string): Promise<VoucherRegistro | null> {
    return tx.voucher.findUnique({ where: { id }, select: camposVoucher });
  }

  voucherPorId(id: string): Promise<VoucherRegistro | null> {
    return this.prisma.voucher.findUnique({ where: { id }, select: camposVoucher });
  }

  async bloquearVoucher(tx: Transaccion, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM vouchers WHERE id = ${id}::uuid FOR UPDATE`;
  }

  vouchersParaExportar(anio: number, mes: number, cuentaTesoreriaId: string | undefined): Promise<VoucherRegistro[]> {
    return this.prisma.voucher.findMany({
      where: { estado: "REGISTRADO", periodo: { anio, mes }, ...(cuentaTesoreriaId ? { cuentaTesoreriaId } : {}) },
      select: camposVoucher,
      orderBy: [{ fechaOperacion: "asc" }, { numero: "asc" }],
    });
  }

  cuentasParaExportar(cuentaTesoreriaId: string | undefined): Promise<{ id: string; nombre: string; moneda: Moneda }[]> {
    return this.prisma.cuentaTesoreria.findMany({
      where: cuentaTesoreriaId ? { id: cuentaTesoreriaId } : { activa: true },
      select: { id: true, nombre: true, moneda: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
  }

  async catalogosActivos(): Promise<{ cuentas: string[]; medios: string[]; tipos: string[] }> {
    const [cuentas, medios, tipos] = await Promise.all([
      this.prisma.cuentaContable.findMany({ where: { deMovimiento: true, activa: true }, select: { codigo: true } }),
      this.prisma.medioPago.findMany({ where: { activo: true }, select: { codigo: true } }),
      this.prisma.tipoComprobante.findMany({ where: { activo: true }, select: { codigo: true } }),
    ]);
    return { cuentas: cuentas.map((c) => c.codigo), medios: medios.map((m) => m.codigo), tipos: tipos.map((t) => t.codigo) };
  }

  async duplicadosPorAnalitico(analiticos: { tipo: string; serie: string; numero: string }[]): Promise<DuplicadoAnalitico[]> {
    if (analiticos.length === 0) {
      return [];
    }
    const filas = await this.prisma.voucher.findMany({
      where: {
        estado: "REGISTRADO",
        OR: analiticos.map((a) => ({ tipoComprobanteCodigo: a.tipo, serie: a.serie, numeroComprobante: a.numero })),
      },
      select: { id: true, tipoComprobanteCodigo: true, serie: true, numeroComprobante: true, numero: true, periodo: { select: { mes: true } }, cuentaTesoreria: { select: { nombre: true } } },
    });
    return filas.map((fila) => ({
      id: fila.id,
      tipoComprobanteCodigo: fila.tipoComprobanteCodigo,
      serie: fila.serie,
      numeroComprobante: fila.numeroComprobante,
      numero: fila.numero,
      mes: fila.periodo.mes,
      cuenta: fila.cuentaTesoreria.nombre,
    }));
  }

  async duplicadosPorImporte(cuentaTesoreriaId: string, documentos: string[], fechas: Date[]): Promise<DuplicadoImporte[]> {
    if (documentos.length === 0 || fechas.length === 0) {
      return [];
    }
    const filas = await this.prisma.voucher.findMany({
      where: { estado: "REGISTRADO", cuentaTesoreriaId, fechaOperacion: { in: fechas }, entidad: { numeroDocumento: { in: documentos } } },
      select: {
        id: true,
        numero: true,
        fechaOperacion: true,
        periodo: { select: { mes: true } },
        entidad: { select: { numeroDocumento: true } },
        lineas: { where: { vigente: true }, select: { ingreso: true, egreso: true } },
      },
    });
    return filas.flatMap((fila) =>
      fila.lineas.map((linea) => ({
        id: fila.id,
        numeroDocumento: fila.entidad.numeroDocumento,
        fechaOperacion: fila.fechaOperacion,
        numero: fila.numero,
        mes: fila.periodo.mes,
        ingreso: linea.ingreso,
        egreso: linea.egreso,
      })),
    );
  }

  crearVoucher(tx: Transaccion, datos: DatosVoucher): Promise<VoucherRegistro> {
    const { lineas, ...cabecera } = datos;
    return tx.voucher.create({ data: { ...cabecera, lineas: { create: lineas } }, select: camposVoucher });
  }

  async actualizarCabecera(tx: Transaccion, id: string, datos: DatosCabecera): Promise<void> {
    await tx.voucher.update({ where: { id }, data: datos });
  }

  async actualizarLinea(tx: Transaccion, id: string, datos: DatosLinea): Promise<void> {
    await tx.lineaVoucher.update({ where: { id }, data: datos });
  }

  async crearLinea(tx: Transaccion, voucherId: string, linea: number, datos: DatosLinea): Promise<void> {
    await tx.lineaVoucher.create({ data: { ...datos, voucherId, linea } });
  }

  async retirarLineas(tx: Transaccion, ids: string[]): Promise<void> {
    if (ids.length > 0) {
      await tx.lineaVoucher.updateMany({ where: { id: { in: ids } }, data: { vigente: false } });
    }
  }

  async ultimaLinea(tx: Transaccion, voucherId: string): Promise<number> {
    const resultado = await tx.lineaVoucher.aggregate({ where: { voucherId }, _max: { linea: true } });
    return resultado._max.linea ?? 0;
  }

  async anular(tx: Transaccion, id: string, motivo: string): Promise<void> {
    await tx.voucher.update({ where: { id }, data: { estado: "ANULADO", motivoAnulacion: motivo } });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo, { maxWait: 15_000, timeout: 60_000 });
  }
}
