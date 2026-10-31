"use client";

import { motion } from "framer-motion";

export type Sugerencia = { clave: string; principal: string; secundario: string; nota: string; aplicar: () => void };

type Props = { titulo: string; sugerencias: Sugerencia[] };

export function SuggestionBar({ titulo, sugerencias }: Props) {
  if (sugerencias.length === 0) {
    return null;
  }
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.15 }}
      role="listbox"
      aria-label={titulo}
      className="flex min-w-[1420px] flex-wrap items-center gap-2 border-b border-border bg-[#0a1f35] py-2.5 pl-11 pr-3"
    >
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{titulo}</span>
      {sugerencias.map((sugerencia) => (
        <button
          key={sugerencia.clave}
          type="button"
          role="option"
          aria-selected={false}
          onMouseDown={(evento) => {
            evento.preventDefault();
            sugerencia.aplicar();
          }}
          className="flex min-h-8 items-center gap-2 rounded-md border border-border bg-muted px-2.5 text-[11px] text-foreground transition-colors hover:border-primary hover:bg-accent focus:border-primary focus:outline-none"
        >
          <b className="font-semibold tabular-nums">{sugerencia.principal}</b>
          {sugerencia.secundario ? <span className="text-muted-foreground">{sugerencia.secundario}</span> : null}
          {sugerencia.nota ? <em className="not-italic text-[10px] text-sistema">{sugerencia.nota}</em> : null}
        </button>
      ))}
    </motion.div>
  );
}
