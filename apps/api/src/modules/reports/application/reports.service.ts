import { Injectable } from "@nestjs/common";
import type { ResumenAnual, ResumenMensual, ResumenQuery } from "@conciliacion/contracts";
import { PeriodsService } from "../../periods";
import { aCentavos, aTexto, saldoDelMes, type Apertura, type MovimientoCentavos } from "../domain/balances";
import { ReportsRepository, type CuentaReporte, type MovimientoMensual } from "../infrastructure/reports.repository";

function apertura(cuenta: CuentaReporte): Apertura | null {
  return cuenta.saldoApertura !== null && cuenta.aperturaAnio !== null && cuenta.aperturaMes !== null
    ? { anio: cuenta.aperturaAnio, mes: cuenta.aperturaMes, centavos: aCentavos(cuenta.saldoApertura) }
    : null;
}

function movimientosDe(cuenta: string, filas: MovimientoMensual[]): MovimientoCentavos[] {
  return filas
    .filter((fila) => fila.cuenta === cuenta)
    .map((fila) => ({ anio: fila.anio, mes: fila.mes, ingresos: aCentavos(fila.ingresos), egresos: aCentavos(fila.egresos) }));
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly repositorio: ReportsRepository,
    private readonly periodos: PeriodsService,
  ) {}

  async mensual(consulta: ResumenQuery): Promise<ResumenMensual> {
    const [periodo, cuentas, movimientos, conteos] = await Promise.all([
      this.periodos.detalle(consulta.anio, consulta.mes),
      this.repositorio.cuentas(),
      this.repositorio.movimientosHasta(consulta.anio, consulta.mes),
      this.repositorio.conteosDelMes(consulta.anio, consulta.mes),
    ]);
    const contar = (cuenta: string, estado: "REGISTRADO" | "ANULADO"): number => conteos.find((conteo) => conteo.cuenta === cuenta && conteo.estado === estado)?.cantidad ?? 0;

    const filas = cuentas
      .map((cuenta) => {
        const datosApertura = apertura(cuenta);
        const saldo = saldoDelMes(consulta.anio, consulta.mes, datosApertura, movimientosDe(cuenta.id, movimientos));
        return {
          cuentaTesoreriaId: cuenta.id,
          nombre: cuenta.nombre,
          moneda: cuenta.moneda,
          activa: cuenta.activa,
          apertura: datosApertura ? { anio: datosApertura.anio, mes: datosApertura.mes, saldo: aTexto(datosApertura.centavos) ?? "0.00" } : null,
          saldoInicial: aTexto(saldo.saldoInicial),
          ingresos: aTexto(saldo.ingresos) ?? "0.00",
          egresos: aTexto(saldo.egresos) ?? "0.00",
          saldoFinal: aTexto(saldo.saldoFinal),
          vouchers: contar(cuenta.id, "REGISTRADO"),
          anulados: contar(cuenta.id, "ANULADO"),
        };
      })
      .filter((fila) => fila.activa || fila.vouchers > 0 || fila.anulados > 0);
    return { periodo, cuentas: filas };
  }

  async anual(anio: number): Promise<ResumenAnual> {
    const [cuentas, movimientos] = await Promise.all([this.repositorio.cuentas(), this.repositorio.movimientosHasta(anio, 12)]);
    return {
      anio,
      cuentas: cuentas
        .map((cuenta) => {
          const propios = movimientosDe(cuenta.id, movimientos);
          const datosApertura = apertura(cuenta);
          return {
            cuentaTesoreriaId: cuenta.id,
            nombre: cuenta.nombre,
            moneda: cuenta.moneda,
            activa: cuenta.activa,
            tieneMovimientos: propios.some((movimiento) => movimiento.anio === anio),
            meses: Array.from({ length: 12 }, (_valor, posicion) => {
              const saldo = saldoDelMes(anio, posicion + 1, datosApertura, propios);
              return { mes: posicion + 1, ingresos: aTexto(saldo.ingresos) ?? "0.00", egresos: aTexto(saldo.egresos) ?? "0.00", saldoFinal: aTexto(saldo.saldoFinal) };
            }),
          };
        })
        .filter((cuenta) => cuenta.activa || cuenta.tieneMovimientos)
        .map(({ cuentaTesoreriaId, nombre, moneda, meses }) => ({ cuentaTesoreriaId, nombre, moneda, meses })),
    };
  }
}
