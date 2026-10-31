export const ZONA_HORARIA = "America/Lima";

export function hoyEnLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function mesActual(hoy: string): { anio: number; mes: number } {
  return { anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) };
}

export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia ?? ""}/${mes ?? ""}/${anio ?? ""}`;
}

export function importe(valor: string): string {
  const numero = Number(valor);
  return numero === 0 ? "" : numero.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
