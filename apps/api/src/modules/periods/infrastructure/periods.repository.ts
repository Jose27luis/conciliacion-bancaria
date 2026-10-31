import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposPeriodo = { id: true, anio: true, mes: true, estado: true, ultimoNumero: true } satisfies Prisma.PeriodoSelect;

export type PeriodoRegistro = Prisma.PeriodoGetPayload<{ select: typeof camposPeriodo }>;

@Injectable()
export class PeriodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscar(anio: number, mes: number): Promise<PeriodoRegistro | null> {
    return this.prisma.periodo.findUnique({ where: { anio_mes: { anio, mes } }, select: camposPeriodo });
  }

  obtenerOCrear(tx: Transaccion, anio: number, mes: number): Promise<PeriodoRegistro> {
    return tx.periodo.upsert({ where: { anio_mes: { anio, mes } }, create: { anio, mes }, update: {}, select: camposPeriodo });
  }

  incrementarCorrelativo(tx: Transaccion, id: string, cantidad: number): Promise<PeriodoRegistro> {
    return tx.periodo.update({ where: { id }, data: { ultimoNumero: { increment: cantidad } }, select: camposPeriodo });
  }
}
