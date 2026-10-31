import { MESES } from "@conciliacion/contracts/enums";

export type MesAnio = { anio: number; mes: number };

const MESES_ADELANTE = 1;
const MESES_ATRAS = 23;

export function nombreDeMes(periodo: MesAnio): string {
  return `${MESES[periodo.mes - 1] ?? periodo.mes} ${periodo.anio}`;
}

export function opcionesDeMes(actual: MesAnio, seleccionado: MesAnio): { valor: string; etiqueta: string }[] {
  const lista: { valor: string; etiqueta: string }[] = [];
  for (let desplazamiento = MESES_ADELANTE; desplazamiento >= -MESES_ATRAS; desplazamiento -= 1) {
    const fecha = new Date(Date.UTC(actual.anio, actual.mes - 1 + desplazamiento, 1));
    const periodo = { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1 };
    lista.push({ valor: `${periodo.anio}-${periodo.mes}`, etiqueta: nombreDeMes(periodo) });
  }
  const clave = `${seleccionado.anio}-${seleccionado.mes}`;
  if (!lista.some((opcion) => opcion.valor === clave)) {
    lista.push({ valor: clave, etiqueta: nombreDeMes(seleccionado) });
  }
  return lista;
}

export function leerPeriodo(valor: string | string[] | undefined, actual: MesAnio): MesAnio {
  const partes = typeof valor === "string" ? /^(\d{4})-(\d{1,2})$/.exec(valor) : null;
  const anio = Number(partes?.[1]);
  const mes = Number(partes?.[2]);
  return Number.isInteger(anio) && anio >= 2000 && anio <= 2100 && Number.isInteger(mes) && mes >= 1 && mes <= 12 ? { anio, mes } : actual;
}
