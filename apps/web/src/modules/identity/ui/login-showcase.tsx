"use client";

import { motion, type Variants } from "framer-motion";
import { BookOpen, Landmark, ShieldCheck, type LucideIcon } from "lucide-react";
import { LedgerIllustration } from "./ledger-illustration";

const PUNTOS: { icono: LucideIcon; titulo: string; texto: string }[] = [
  { icono: Landmark, titulo: "Bancos y caja", texto: "Cada cuenta es una hoja, con las mismas columnas de tu Excel." },
  { icono: BookOpen, titulo: "Plan contable y SUNAT", texto: "Cuentas contables y medios de pago listos para usar." },
  { icono: ShieldCheck, titulo: "Todo queda auditado", texto: "Cada cambio guarda quién lo hizo y cuándo." },
];

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const elemento: Variants = {
  oculto: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function LoginShowcase() {
  return (
    <motion.section variants={contenedor} initial="oculto" animate="visible" className="flex max-w-xl flex-col gap-8">
      <motion.div variants={elemento}>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Registro de bancos</p>
        <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
          Tus movimientos bancarios,{" "}
          <span className="bg-gradient-to-r from-primary to-sistema bg-clip-text text-transparent">ordenados y conciliados.</span>
        </h2>
      </motion.div>

      <motion.div variants={elemento}>
        <LedgerIllustration />
      </motion.div>

      <motion.ul variants={contenedor} className="grid gap-4 sm:grid-cols-3">
        {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
          <motion.li key={titulo} variants={elemento} whileHover={{ y: -4 }} className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur">
            <Icono className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-white">{titulo}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{texto}</p>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
