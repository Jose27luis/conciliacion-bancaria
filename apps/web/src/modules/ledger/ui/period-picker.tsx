"use client";

import { useRouter } from "next/navigation";
import { opcionesDeMes, type MesAnio } from "./month-options";

type Props = { cuentaId: string; anio: number; mes: number; actual: MesAnio };

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
        {opcionesDeMes(actual, { anio, mes }).map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
