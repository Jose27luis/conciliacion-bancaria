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

  async elevarCorrelativo(tx: Transaccion, id: string, minimo: number): Promise<void> {
    await tx.periodo.updateMany({ where: { id, ultimoNumero: { lt: minimo } }, data: { ultimoNumero: minimo } });
  }

  numerosUsados(anio: number, mes: number): Promise<{ numero: number; cuentaTesoreria: { nombre: string } }[]> {
    return this.prisma.voucher.findMany({ where: { periodo: { anio, mes } }, select: { numero: true, cuentaTesoreria: { select: { nombre: true } } } });
  }

  incrementarCorrelativo(tx: Transaccion, id: string, cantidad: number): Promise<PeriodoRegistro> {
    return tx.periodo.update({ where: { id }, data: { ultimoNumero: { increment: cantidad } }, select: camposPeriodo });
  }
}
