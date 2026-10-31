import { centavosATexto } from "@conciliacion/contracts";

export type Apertura = { anio: number; mes: number; centavos: number };

export type MovimientoCentavos = { anio: number; mes: number; ingresos: number; egresos: number };

export type SaldoMes = { ingresos: number; egresos: number; saldoInicial: number | null; saldoFinal: number | null };

export function aCentavos(texto: string): number {
  const negativo = texto.trim().startsWith("-");
  const [enteros = "0", decimales = ""] = texto.trim().replace(/^-/, "").split(".");
  const valor = Number(enteros) * 100 + Number(decimales.padEnd(2, "0").slice(0, 2));
  return negativo ? -valor : valor;
}

export function aTexto(centavos: number | null): string | null {
  return centavos === null ? null : centavosATexto(centavos);
}

function indice(anio: number, mes: number): number {
  return anio * 12 + mes;
}

export function saldoDelMes(anio: number, mes: number, apertura: Apertura | null, movimientos: MovimientoCentavos[]): SaldoMes {
  const objetivo = indice(anio, mes);
  const delMes = movimientos.filter((movimiento) => indice(movimiento.anio, movimiento.mes) === objetivo);
  const ingresos = delMes.reduce((total, movimiento) => total + movimiento.ingresos, 0);
  const egresos = delMes.reduce((total, movimiento) => total + movimiento.egresos, 0);
  if (!apertura || objetivo < indice(apertura.anio, apertura.mes)) {
    return { ingresos, egresos, saldoInicial: null, saldoFinal: null };
  }
  const desde = indice(apertura.anio, apertura.mes);
  const previos = movimientos
    .filter((movimiento) => {
      const actual = indice(movimiento.anio, movimiento.mes);
      return actual >= desde && actual < objetivo;
    })
    .reduce((total, movimiento) => total + movimiento.ingresos - movimiento.egresos, 0);
  const saldoInicial = apertura.centavos + previos;
  return { ingresos, egresos, saldoInicial, saldoFinal: saldoInicial + ingresos - egresos };
}
