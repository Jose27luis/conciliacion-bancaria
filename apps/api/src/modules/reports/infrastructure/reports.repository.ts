import { Injectable } from "@nestjs/common";
import type { Moneda } from "@prisma/client";
import { z } from "zod";
import { PrismaService } from "../../../shared/prisma/prisma.service";

const movimientoSchema = z.object({
  cuenta: z.string(),
  anio: z.number().int(),
  mes: z.number().int(),
  ingresos: z.string(),
  egresos: z.string(),
});

export type MovimientoMensual = z.infer<typeof movimientoSchema>;

export type CuentaReporte = {
  id: string;
  nombre: string;
  moneda: Moneda;
  activa: boolean;
  orden: number;
  saldoApertura: string | null;
  aperturaAnio: number | null;
  aperturaMes: number | null;
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async cuentas(): Promise<CuentaReporte[]> {
    const filas = await this.prisma.cuentaTesoreria.findMany({
      select: { id: true, nombre: true, moneda: true, activa: true, orden: true, saldoApertura: true, aperturaAnio: true, aperturaMes: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    });
    return filas.map((fila) => ({ ...fila, saldoApertura: fila.saldoApertura ? fila.saldoApertura.toFixed(2) : null }));
  }

  async movimientosHasta(anio: number, mes: number): Promise<MovimientoMensual[]> {
    const limite = anio * 12 + mes;
    const filas: unknown = await this.prisma.$queryRaw`
      SELECT v.cuenta_tesoreria_id::text AS cuenta,
             p.anio::int AS anio,
             p.mes::int AS mes,
             COALESCE(SUM(l.ingreso), 0)::text AS ingresos,
             COALESCE(SUM(l.egreso), 0)::text AS egresos
      FROM vouchers v
      JOIN periodos p ON p.id = v.periodo_id
      JOIN lineas_voucher l ON l.voucher_id = v.id AND l.vigente
      WHERE v.estado = 'REGISTRADO' AND p.anio * 12 + p.mes <= ${limite}
      GROUP BY v.cuenta_tesoreria_id, p.anio, p.mes`;
    return z.array(movimientoSchema).parse(filas);
  }

  async conteosDelMes(anio: number, mes: number): Promise<{ cuenta: string; estado: "REGISTRADO" | "ANULADO"; cantidad: number }[]> {
    const grupos = await this.prisma.voucher.groupBy({
      by: ["cuentaTesoreriaId", "estado"],
      where: { periodo: { anio, mes } },
      _count: { _all: true },
    });
    return grupos.map((grupo) => ({ cuenta: grupo.cuentaTesoreriaId, estado: grupo.estado, cantidad: grupo._count._all }));
  }
}
