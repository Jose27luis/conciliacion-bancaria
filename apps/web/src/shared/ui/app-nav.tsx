"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, LayoutGroup, motion, type Variants } from "framer-motion";
import { BookOpen, BookText, Building2, ChevronDown, CreditCard, FileText, FileUp, Keyboard, Landmark, PieChart, Table, Users, type LucideIcon } from "lucide-react";
import { ROLES_EDITAN_MAESTROS, type Rol } from "@conciliacion/contracts/enums";
import { cn } from "@/lib/utils";
import { COOKIE_GRUPOS_CERRADOS, guardarPreferencia } from "./sidebar-preferences";

type Enlace = { href: string; etiqueta: string; icono: LucideIcon; roles?: readonly Rol[] };
type Grupo = { titulo: string; enlaces: Enlace[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Registro",
    enlaces: [
      { href: "/quick-entry", etiqueta: "Registro rápido", icono: Table },
      { href: "/ledger", etiqueta: "Libro de movimientos", icono: BookText },
      { href: "/summary", etiqueta: "Resumen y cierre", icono: PieChart },
    ],
  },
  {
    titulo: "Maestros",
    enlaces: [
      { href: "/masters/entities", etiqueta: "Proveedores y clientes", icono: Building2 },
      { href: "/masters/templates", etiqueta: "Plantillas de atajos", icono: Keyboard },
      { href: "/masters/chart-of-accounts", etiqueta: "Plan contable", icono: BookOpen },
      { href: "/masters/payment-methods", etiqueta: "Medios de pago", icono: CreditCard },
      { href: "/masters/voucher-types", etiqueta: "Tipos de comprobante", icono: FileText },
    ],
  },
  {
    titulo: "Configuración",
    enlaces: [
      { href: "/settings/treasury-accounts", etiqueta: "Cuentas de tesorería", icono: Landmark },
      { href: "/settings/imports", etiqueta: "Importar Excel", icono: FileUp, roles: ROLES_EDITAN_MAESTROS },
      { href: "/settings/users", etiqueta: "Usuarios", icono: Users, roles: ["ADMIN"] },
    ],
  },
];

const RESORTE = { type: "spring", stiffness: 420, damping: 32 } as const;

const icono: Variants = {
  reposo: { scale: 1, rotate: 0 },
  encima: { scale: 1.15, rotate: -8, transition: RESORTE },
};

const etiqueta: Variants = {
  reposo: { x: 0 },
  encima: { x: 4, transition: RESORTE },
};

type Props = { rol: Rol; colapsado: boolean; gruposCerradosIniciales: string[]; alNavegar?: () => void; idDiseno: string };

type Burbuja = { texto: string; arriba: number };

export function AppNav({ rol, colapsado, gruposCerradosIniciales, alNavegar, idDiseno }: Props) {
  const ruta = usePathname();
  const [encima, setEncima] = useState<string | null>(null);
  const [cerrados, setCerrados] = useState<string[]>(gruposCerradosIniciales);
  const [burbuja, setBurbuja] = useState<Burbuja | null>(null);

  const alternarGrupo = (titulo: string): void => {
    const siguiente = cerrados.includes(titulo) ? cerrados.filter((grupo) => grupo !== titulo) : [...cerrados, titulo];
    setCerrados(siguiente);
    guardarPreferencia(COOKIE_GRUPOS_CERRADOS, siguiente.join("|"));
  };

  return (
    <LayoutGroup id={idDiseno}>
      <nav aria-label="Módulos" className="flex flex-col gap-2" onMouseLeave={() => setEncima(null)}>
        {GRUPOS.map((grupo) => {
          const enlaces = grupo.enlaces.filter((enlace) => !enlace.roles || enlace.roles.includes(rol));
          const abierto = colapsado || !cerrados.includes(grupo.titulo);
          const idLista = `${idDiseno}-${grupo.titulo.toLowerCase()}`;
          const tieneActivo = enlaces.some((enlace) => ruta.startsWith(enlace.href));
          return (
            <div key={grupo.titulo} className="flex flex-col gap-1">
              {colapsado ? (
                <span aria-hidden="true" className="mx-auto my-1 h-px w-8 bg-border" />
              ) : (
                <button
                  type="button"
                  onClick={() => alternarGrupo(grupo.titulo)}
                  aria-expanded={abierto}
                  aria-controls={idLista}
                  className="flex items-center justify-between rounded-md px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center gap-2">
                    {grupo.titulo}
                    {!abierto && tieneActivo ? <span className="size-1.5 rounded-full bg-primary" aria-label="Contiene la página actual" /> : null}
                  </span>
                  <motion.span animate={{ rotate: abierto ? 0 : -90 }} transition={RESORTE}>
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  </motion.span>
                </button>
              )}
              <AnimatePresence initial={false}>
                {abierto ? (
                  <motion.div
                    id={idLista}
                    key="lista"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col gap-0.5 overflow-hidden"
                  >
                    {enlaces.map((enlace) => {
                      const activo = ruta.startsWith(enlace.href);
                      const Icono = enlace.icono;
                      return (
                        <motion.div
                          key={enlace.href}
                          initial="reposo"
                          animate="reposo"
                          whileHover="encima"
                          className="relative"
                          onMouseEnter={(evento) => {
                            setEncima(enlace.href);
                            if (colapsado) {
                              const caja = evento.currentTarget.getBoundingClientRect();
                              setBurbuja({ texto: enlace.etiqueta, arriba: caja.top + caja.height / 2 });
                            }
                          }}
                          onMouseLeave={() => setBurbuja(null)}
                        >
                          {encima === enlace.href ? (
                            <motion.span
                              layoutId="nav-encima"
                              aria-hidden="true"
                              className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/15 via-muted to-transparent"
                              transition={RESORTE}
                            />
                          ) : null}
                          {activo ? (
                            <motion.span
                              layoutId="nav-activo"
                              aria-hidden="true"
                              className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]"
                              transition={RESORTE}
                            />
                          ) : null}
                          <Link
                            href={enlace.href}
                            onClick={alNavegar}
                            aria-current={activo ? "page" : undefined}
                            aria-label={colapsado ? enlace.etiqueta : undefined}
                            className={cn(
                              "relative flex min-h-9 items-center gap-3 rounded-md px-3 text-sm bajo:min-h-8 text-muted-foreground transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              colapsado && "justify-center px-0",
                              activo && "bg-accent/60 font-semibold text-primary hover:text-primary",
                            )}
                          >
                            <motion.span variants={icono} className="shrink-0">
                              <Icono className="size-4" aria-hidden="true" />
                            </motion.span>
                            {colapsado ? null : (
                              <motion.span variants={etiqueta} className="truncate">
                                {enlace.etiqueta}
                              </motion.span>
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
      <AnimatePresence>
        {colapsado && burbuja ? (
          <motion.span
            key={burbuja.texto}
            role="tooltip"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            style={{ top: burbuja.arriba, y: "-50%" }}
            className="pointer-events-none fixed left-[5.25rem] z-50 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-white shadow-xl shadow-black/40"
          >
            {burbuja.texto}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </LayoutGroup>
  );
}
