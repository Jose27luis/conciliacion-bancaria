"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ESPERA_MS = 300;

type Props = { id: string; etiqueta: string; parametro?: string; ayuda?: string; className?: string };

export function useActualizarParametros(): { actualizar: (cambios: Record<string, string | null>) => void; pendiente: boolean } {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const actualizar = (cambios: Record<string, string | null>): void => {
    const siguiente = new URLSearchParams(parametros.toString());
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor === null || valor === "") {
        siguiente.delete(clave);
      } else {
        siguiente.set(clave, valor);
      }
    }
    siguiente.delete("pagina");
    const consulta = siguiente.toString();
    iniciar(() => router.replace(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false }));
  };

  return { actualizar, pendiente };
}

export function LiveSearch({ id, etiqueta, parametro = "q", ayuda, className }: Props) {
  const parametros = useSearchParams();
  const inicial = parametros.get(parametro) ?? "";
  const [valor, setValor] = useState(inicial);
  const { actualizar, pendiente } = useActualizarParametros();
  const ultimoEnviado = useRef(inicial);

  useEffect(() => {
    const limpio = valor.trim();
    if (limpio === ultimoEnviado.current) {
      return;
    }
    const temporizador = window.setTimeout(() => {
      ultimoEnviado.current = limpio;
      actualizar({ [parametro]: limpio });
    }, ESPERA_MS);
    return () => window.clearTimeout(temporizador);
  });

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={id}
          type="search"
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          autoComplete="off"
          aria-describedby={ayuda ? `${id}-ayuda` : undefined}
          className="pl-9 pr-9"
        />
        {pendiente ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Buscando" />
        ) : valor ? (
          <button
            type="button"
            onClick={() => setValor("")}
            aria-label="Borrar búsqueda"
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {ayuda ? (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

type OpcionFiltro = { valor: string; etiqueta: string };

export function FilterSelect({ id, etiqueta, parametro, opciones, valorPorDefecto = "" }: { id: string; etiqueta: string; parametro: string; opciones: OpcionFiltro[]; valorPorDefecto?: string }) {
  const parametros = useSearchParams();
  const { actualizar } = useActualizarParametros();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select
        id={id}
        value={parametros.get(parametro) ?? valorPorDefecto}
        onChange={(evento) => actualizar({ [parametro]: evento.target.value === valorPorDefecto ? null : evento.target.value })}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:dark]"
      >
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}
