"use client";

import { motion, type Variants } from "framer-motion";
import { Check } from "lucide-react";

const COLUMNAS = ["Voucher", "Fecha", "RUC", "Detalle", "Importe", "CTA"];
const ANCHOS_FILAS = [
  [62, 70, 84, 92, 58, 48],
  [62, 70, 84, 74, 66, 48],
  [62, 70, 84, 88, 52, 48],
  [62, 70, 84, 66, 72, 48],
  [62, 70, 84, 80, 60, 48],
];
const CICLO_SEGUNDOS = 9;

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.55, delayChildren: 0.9 } },
};

const fila: Variants = {
  oculto: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export function LedgerIllustration() {
  return (
    <div aria-hidden="true" className="w-full max-w-xl rounded-2xl border border-border bg-card/70 p-4 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((punto) => (
            <span key={punto} className="size-2.5 rounded-full bg-border" />
          ))}
        </div>
        <motion.span
          className="rounded-md border border-primary/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          Hoja de captura
        </motion.span>
      </div>

      <div className="grid grid-cols-[repeat(6,minmax(0,1fr))_1.75rem] gap-2 border-b border-border pb-2">
        {COLUMNAS.map((columna) => (
          <span key={columna} className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
            {columna}
          </span>
        ))}
        <span />
      </div>

      <motion.div variants={contenedor} initial="oculto" animate="visible" className="flex flex-col">
        {ANCHOS_FILAS.map((anchos, indice) => (
          <motion.div
            key={indice}
            variants={fila}
            className="grid grid-cols-[repeat(6,minmax(0,1fr))_1.75rem] items-center gap-2 border-b border-border/60 py-2.5 bajo:py-1.5"
          >
            {anchos.map((ancho, columna) => (
              <div key={columna} className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={columna === 4 ? "h-full rounded-full bg-exito/70" : columna === 5 || columna === 0 ? "h-full rounded-full bg-sistema/60" : "h-full rounded-full bg-foreground/25"}
                  initial={{ width: "0%" }}
                  animate={{ width: ["0%", `${ancho}%`, `${ancho}%`, "0%"] }}
                  transition={{
                    duration: CICLO_SEGUNDOS,
                    times: [0, 0.12, 0.88, 1],
                    delay: 1.1 + indice * 0.55 + columna * 0.12,
                    repeat: Infinity,
                    repeatDelay: 0.6,
                    ease: "easeOut",
                  }}
                />
              </div>
            ))}
            <motion.span
              className="grid size-6 place-items-center rounded-md bg-exito/15 text-exito"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.25, 1, 1, 0], opacity: [0, 1, 1, 1, 0] }}
              transition={{
                duration: CICLO_SEGUNDOS,
                times: [0, 0.04, 0.07, 0.88, 1],
                delay: 2 + indice * 0.55,
                repeat: Infinity,
                repeatDelay: 0.6,
              }}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </motion.span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
