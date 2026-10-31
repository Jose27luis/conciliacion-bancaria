import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
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
  creadoEn: true,
  periodo: { select: { anio: true, mes: true } },
  entidad: { select: { id: true, tipoDocumento: true, numeroDocumento: true, razonSocial: true, usos: true } },
  medioPago: { select: { descripcion: true } },
  lineas: {
    select: { id: true, linea: true, detalle: true, ingreso: true, egreso: true, cuentaContableCodigo: true, cuentaContable: { select: { denominacion: true } } },
    orderBy: { linea: "asc" },
  },
} satisfies Prisma.VoucherSelect;

export type VoucherRegistro = Prisma.VoucherGetPayload<{ select: typeof camposVoucher }>;

export type CuentaParaHoja = { id: string; nombre: string; moneda: "PEN" | "USD"; activa: boolean };

export type DuplicadoAnalitico = { tipoComprobanteCodigo: string | null; serie: string | null; numeroComprobante: string | null; numero: number; mes: number; cuenta: string };

export type DuplicadoImporte = { numeroDocumento: string; fechaOperacion: Date; numero: number; mes: number; ingreso: Prisma.Decimal; egreso: Prisma.Decimal };

export type DatosVoucher = Omit<Prisma.VoucherUncheckedCreateInput, "id" | "lineas" | "creadoEn" | "actualizadoEn"> & {
  lineas: { linea: number; detalle: string; ingreso: string; egreso: string; cuentaContableCodigo: string }[];
};

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

  async catalogosActivos(): Promise<{ cuentas: string[]; medios: string[]; tipos: string[] }> {
    const [cuentas, medios, tipos] = await Promise.all([
      this.prisma.cuentaContable.findMany({ where: { deMovimiento: true, activa: true }, select: { codigo: true } }),
      this.prisma.medioPago.findMany({ where: { activo: true }, select: { codigo: true } }),
      this.prisma.tipoComprobante.findMany({ where: { activo: true }, select: { codigo: true } }),
    ]);
    return { cuentas: cuentas.map((c) => c.codigo), medios: medios.map((m) => m.codigo), tipos: tipos.map((t) => t.codigo) };
  }

  duplicadosPorAnalitico(analiticos: { tipo: string; serie: string; numero: string }[]): Promise<DuplicadoAnalitico[]> {
    if (analiticos.length === 0) {
      return Promise.resolve([]);
    }
    return this.prisma.voucher
      .findMany({
        where: {
          estado: "REGISTRADO",
          OR: analiticos.map((a) => ({ tipoComprobanteCodigo: a.tipo, serie: a.serie, numeroComprobante: a.numero })),
        },
        select: { tipoComprobanteCodigo: true, serie: true, numeroComprobante: true, numero: true, periodo: { select: { mes: true } }, cuentaTesoreria: { select: { nombre: true } } },
      })
      .then((filas) =>
        filas.map((fila) => ({
          tipoComprobanteCodigo: fila.tipoComprobanteCodigo,
          serie: fila.serie,
          numeroComprobante: fila.numeroComprobante,
          numero: fila.numero,
          mes: fila.periodo.mes,
          cuenta: fila.cuentaTesoreria.nombre,
        })),
      );
  }

  async duplicadosPorImporte(cuentaTesoreriaId: string, documentos: string[], fechas: Date[]): Promise<DuplicadoImporte[]> {
    if (documentos.length === 0 || fechas.length === 0) {
      return [];
    }
    const filas = await this.prisma.voucher.findMany({
      where: { estado: "REGISTRADO", cuentaTesoreriaId, fechaOperacion: { in: fechas }, entidad: { numeroDocumento: { in: documentos } } },
      select: {
        numero: true,
        fechaOperacion: true,
        periodo: { select: { mes: true } },
        entidad: { select: { numeroDocumento: true } },
        lineas: { select: { ingreso: true, egreso: true } },
      },
    });
    return filas.flatMap((fila) =>
      fila.lineas.map((linea) => ({
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

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo, { maxWait: 15_000, timeout: 60_000 });
  }
}
