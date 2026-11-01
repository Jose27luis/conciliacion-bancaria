"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, LogOut, Menu, X } from "lucide-react";
import type { UsuarioSesion } from "@conciliacion/contracts";
import { ETIQUETAS_ROL } from "@conciliacion/contracts/enums";
import { cerrarSesion } from "@/modules/identity/actions";
import { cn } from "@/lib/utils";
import { AppNav } from "./app-nav";
import { MotionProvider } from "./motion-provider";
import { COOKIE_SIDEBAR_COLAPSADO, guardarPreferencia } from "./sidebar-preferences";

const ANCHO_ABIERTO = 256;
const ANCHO_COLAPSADO = 80;
const RESORTE = { type: "spring", stiffness: 320, damping: 34 } as const;

type Props = { usuario: UsuarioSesion; colapsadoInicial: boolean; gruposCerrados: string[] };

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

function Marca({ colapsado }: { colapsado: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", colapsado ? "justify-center" : "px-1")}>
      <div aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary text-lg font-extrabold text-primary">
        CB
      </div>
      <AnimatePresence initial={false}>
        {colapsado ? null : (
          <motion.div key="nombre" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }} className="whitespace-nowrap">
            <p className="text-sm font-extrabold text-white">Conciliación</p>
            <p className="text-xs text-muted-foreground">Bancaria</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TarjetaUsuario({ usuario, colapsado }: { usuario: UsuarioSesion; colapsado: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card/80", colapsado ? "flex flex-col items-center gap-2 p-2" : "p-3")}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-20 rounded-full bg-primary/10 blur-2xl" />
      <div className={cn("relative flex items-center gap-3", colapsado && "justify-center")}>
        <div className="shrink-0 rounded-full bg-gradient-to-br from-primary to-sistema p-[2px]" title={colapsado ? `${usuario.nombre} · ${ETIQUETAS_ROL[usuario.rol]}` : undefined}>
          <div className="grid size-9 place-items-center rounded-full bg-card text-xs font-extrabold text-white">{iniciales(usuario.nombre)}</div>
        </div>
        {colapsado ? null : (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-exito" aria-hidden="true" />
              {ETIQUETAS_ROL[usuario.rol]}
            </p>
          </div>
        )}
      </div>
      <form action={cerrarSesion} className={cn("relative", colapsado ? "" : "mt-3")}>
        <motion.button
          type="submit"
          initial="reposo"
          animate="reposo"
          whileHover="encima"
          whileTap={{ scale: 0.97 }}
          aria-label="Cerrar sesión"
          title={colapsado ? "Cerrar sesión" : undefined}
          className={cn(
            "group flex items-center justify-center gap-2 rounded-lg border border-border bg-background/60 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            colapsado ? "size-9" : "h-9 w-full",
          )}
        >
          {colapsado ? null : <span>Cerrar sesión</span>}
          <motion.span variants={{ reposo: { x: 0 }, encima: { x: 3 } }} transition={RESORTE}>
            <LogOut className="size-4" aria-hidden="true" />
          </motion.span>
        </motion.button>
      </form>
    </div>
  );
}

export function Sidebar({ usuario, colapsadoInicial, gruposCerrados }: Props) {
  const [colapsado, setColapsado] = useState(colapsadoInicial);
  const [menuMovil, setMenuMovil] = useState(false);

  const alternar = (): void => {
    const siguiente = !colapsado;
    setColapsado(siguiente);
    guardarPreferencia(COOKIE_SIDEBAR_COLAPSADO, siguiente ? "1" : "0");
  };

  useEffect(() => {
    if (!menuMovil) {
      return;
    }
    const alTeclear = (evento: KeyboardEvent): void => {
      if (evento.key === "Escape") {
        setMenuMovil(false);
      }
    };
    const desbordeAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.body.style.overflow = desbordeAnterior;
      window.removeEventListener("keydown", alTeclear);
    };
  }, [menuMovil]);

  return (
    <MotionProvider>
      <motion.aside
        initial={false}
        animate={{ width: colapsado ? ANCHO_COLAPSADO : ANCHO_ABIERTO }}
        transition={RESORTE}
        className="sticky top-0 z-30 hidden h-[100dvh] shrink-0 flex-col gap-4 border-r border-border bg-[#050f1d] py-4 md:flex"
      >
        <div className={cn(colapsado ? "px-2" : "px-4")}>
          <Marca colapsado={colapsado} />
        </div>

        <motion.button
          type="button"
          onClick={alternar}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          aria-expanded={!colapsado}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          className="group absolute -right-3.5 top-[4.6rem] z-40 grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary to-sistema p-[1.5px] shadow-[0_0_0_4px_#050f1d] transition-shadow hover:shadow-[0_0_0_4px_#050f1d,0_0_18px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="grid size-full place-items-center rounded-full bg-[#050f1d] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <motion.span animate={{ rotate: colapsado ? 180 : 0 }} transition={RESORTE} className="grid place-items-center">
              <ChevronLeft className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </motion.span>
          </span>
        </motion.button>

        <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-color:hsl(var(--border))_transparent] [scrollbar-width:thin]", colapsado ? "px-2" : "px-3")}>
          <AppNav rol={usuario.rol} colapsado={colapsado} gruposCerradosIniciales={gruposCerrados} idDiseno="nav-escritorio" />
        </div>

        <div className={cn(colapsado ? "px-2" : "px-3")}>
          <TarjetaUsuario usuario={usuario} colapsado={colapsado} />
        </div>
      </motion.aside>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-[#050f1d]/95 px-4 py-3 backdrop-blur md:hidden">
        <Marca colapsado={false} />
        <button
          type="button"
          onClick={() => setMenuMovil(true)}
          aria-label="Abrir menú"
          aria-expanded={menuMovil}
          className="grid size-10 place-items-center rounded-lg border border-border text-white transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
      </header>

      <AnimatePresence>
        {menuMovil ? (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
            <motion.div
              key="fondo"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuMovil(false)}
            />
            <motion.aside
              key="panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={RESORTE}
              className="absolute inset-y-0 left-0 flex h-[100dvh] w-[min(18rem,85vw)] flex-col gap-5 border-r border-border bg-[#050f1d] py-4 shadow-2xl shadow-black/60"
            >
              <div className="flex items-center justify-between gap-3 px-4">
                <Marca colapsado={false} />
                <button
                  type="button"
                  onClick={() => setMenuMovil(false)}
                  aria-label="Cerrar menú"
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3">
                <AppNav rol={usuario.rol} colapsado={false} gruposCerradosIniciales={gruposCerrados} alNavegar={() => setMenuMovil(false)} idDiseno="nav-movil" />
              </div>
              <div className="px-3">
                <TarjetaUsuario usuario={usuario} colapsado={false} />
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </MotionProvider>
  );
}
