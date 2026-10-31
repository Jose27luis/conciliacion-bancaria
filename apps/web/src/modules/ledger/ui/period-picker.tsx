"use client";

import { useRouter } from "next/navigation";
import { MESES } from "@conciliacion/contracts/enums";

type Props = { cuentaId: string; anio: number; mes: number; actual: { anio: number; mes: number } };

function opciones(actual: { anio: number; mes: number }, seleccionado: { anio: number; mes: number }): { valor: string; etiqueta: string }[] {
  const lista: { valor: string; etiqueta: string }[] = [];
  for (let desplazamiento = 1; desplazamiento >= -23; desplazamiento -= 1) {
    const fecha = new Date(Date.UTC(actual.anio, actual.mes - 1 + desplazamiento, 1));
    const anio = fecha.getUTCFullYear();
    const mes = fecha.getUTCMonth() + 1;
    lista.push({ valor: `${anio}-${mes}`, etiqueta: `${MESES[mes - 1] ?? mes} ${anio}` });
  }
  const clave = `${seleccionado.anio}-${seleccionado.mes}`;
  if (!lista.some((opcion) => opcion.valor === clave)) {
    lista.push({ valor: clave, etiqueta: `${MESES[seleccionado.mes - 1] ?? seleccionado.mes} ${seleccionado.anio}` });
  }
  return lista;
}

export function PeriodPicker({ cuentaId, anio, mes, actual }: Props) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      Periodo
      <select
        value={`${anio}-${mes}`}
        onChange={(evento) => {
          const [nuevoAnio, nuevoMes] = evento.target.value.split("-");
          router.push(`/quick-entry?cuenta=${cuentaId}&anio=${nuevoAnio ?? anio}&mes=${nuevoMes ?? mes}`);
        }}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold normal-case tracking-normal text-white [color-scheme:dark]"
      >
        {opciones(actual, { anio, mes }).map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
