import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposPeriodo = { id: true, anio: true, mes: true, estado: true, ultimoNumero: true } satisfies Prisma.PeriodoSelect;

export type PeriodoRegistro = Prisma.PeriodoGetPayload<{ select: typeof camposPeriodo }>;

export type PeriodoDelAnio = PeriodoRegistro & { cerradoEn: Date | null; cerradoPor: { nombre: string } | null };

export type ConteoVouchers = { mes: number; estado: "REGISTRADO" | "ANULADO"; cantidad: number };

@Injectable()
export class PeriodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscar(anio: number, mes: number): Promise<PeriodoRegistro | null> {
    return this.prisma.periodo.findUnique({ where: { anio_mes: { anio, mes } }, select: camposPeriodo });
  }

  delAnio(anio: number): Promise<PeriodoDelAnio[]> {
    return this.prisma.periodo.findMany({
      where: { anio },
      select: { ...camposPeriodo, cerradoEn: true, cerradoPor: { select: { nombre: true } } },
    });
  }

  async conteosDelAnio(anio: number): Promise<ConteoVouchers[]> {
    const grupos = await this.prisma.voucher.groupBy({ by: ["periodoId", "estado"], where: { periodo: { anio } }, _count: { _all: true } });
    const periodos = new Map((await this.prisma.periodo.findMany({ where: { anio }, select: { id: true, mes: true } })).map((periodo) => [periodo.id, periodo.mes]));
    return grupos.flatMap((grupo) => {
      const mes = periodos.get(grupo.periodoId);
      return mes === undefined ? [] : [{ mes, estado: grupo.estado, cantidad: grupo._count._all }];
    });
  }

  obtenerOCrear(tx: Transaccion, anio: number, mes: number): Promise<PeriodoRegistro> {
    return tx.periodo.upsert({ where: { anio_mes: { anio, mes } }, create: { anio, mes }, update: {}, select: camposPeriodo });
  }

  async bloquear(tx: Transaccion, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM periodos WHERE id = ${id}::uuid FOR UPDATE`;
  }

  async cerrar(tx: Transaccion, id: string, usuarioId: string): Promise<void> {
    await tx.periodo.update({ where: { id }, data: { estado: "CERRADO", cerradoEn: new Date(), cerradoPorId: usuarioId } });
  }

  async reabrir(tx: Transaccion, id: string): Promise<void> {
    await tx.periodo.update({ where: { id }, data: { estado: "ABIERTO", cerradoEn: null, cerradoPorId: null } });
  }

  async elevarCorrelativo(tx: Transaccion, id: string, minimo: number): Promise<void> {
    await tx.periodo.updateMany({ where: { id, ultimoNumero: { lt: minimo } }, data: { ultimoNumero: minimo } });
  }

  numerosUsados(anio: number, mes: number): Promise<{ numero: number; cuentaTesoreria: { nombre: string } }[]> {
    return this.prisma.voucher.findMany({ where: { periodo: { anio, mes } }, select: { numero: true, cuentaTesoreria: { select: { nombre: true } } } });
  }

  incrementarCorrelativo(tx: Transaccion, id: string, cantidad: number): Promise<PeriodoRegistro> {
    return tx.periodo.update({ where: { id }, data: { ultimoNumero: { increment: cantidad } }, select: camposPeriodo });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }
}
