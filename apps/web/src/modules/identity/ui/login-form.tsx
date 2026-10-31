"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { AnimatePresence, motion, useAnimate, type Variants } from "framer-motion";
import { CircleAlert, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { errorDe } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { iniciarSesion } from "../actions";

const contenedor: Variants = {
  oculto: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08, delayChildren: 0.25 },
  },
};

const elemento: Variants = {
  oculto: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

export function LoginForm({ sesionExpirada }: { sesionExpirada: boolean }) {
  const [estado, despachar] = useFormState(iniciarSesion, ESTADO_INICIAL);
  const [verPassword, setVerPassword] = useState(false);
  const [alcance, animar] = useAnimate<HTMLDivElement>();
  const errorEmail = errorDe(estado, "email");
  const errorPassword = errorDe(estado, "password");

  useEffect(() => {
    if (estado.estado === "error" && alcance.current) {
      void animar(alcance.current, { x: [0, -12, 12, -8, 8, -4, 4, 0] }, { duration: 0.5 });
    }
  }, [estado, animar, alcance]);

  return (
    <motion.div ref={alcance} variants={contenedor} initial="oculto" animate="visible" className="relative">
      <motion.div
        aria-hidden="true"
        className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/60 via-border to-sistema/50"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative rounded-2xl bg-card/95 p-7 shadow-2xl shadow-black/50 backdrop-blur sm:p-8">
        <motion.div variants={elemento} className="flex items-center gap-3">
          <motion.div
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-xl border border-primary text-base font-bold text-primary"
            animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary) / 0)", "0 0 0 8px hsl(var(--primary) / 0.12)", "0 0 0 0 hsl(var(--primary) / 0)"] }}
            transition={{ duration: 2.8, repeat: Infinity }}
          >
            CB
          </motion.div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">Conciliación Bancaria</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Ingresar</h1>
          </div>
        </motion.div>

        <motion.p variants={elemento} className="mt-4 text-sm text-muted-foreground">
          {sesionExpirada ? "Tu sesión terminó. Vuelve a ingresar para continuar." : "Usa el correo y la contraseña que te dio el administrador."}
        </motion.p>

        <form action={despachar} className="mt-6 grid gap-5" noValidate>
          <AnimatePresence initial={false}>
            {estado.estado === "error" ? (
              <motion.div
                key={estado.mensaje}
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>{estado.mensaje}</span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div variants={elemento} className="grid gap-1.5">
            <Label htmlFor="email">Correo</Label>
            <div className="group relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                aria-invalid={Boolean(errorEmail)}
                aria-describedby={errorEmail ? "email-error" : undefined}
                className="h-11 pl-10 transition-shadow focus-visible:ring-2"
              />
            </div>
            {errorEmail ? (
              <p id="email-error" className="text-xs font-medium text-destructive">
                {errorEmail}
              </p>
            ) : null}
          </motion.div>

          <motion.div variants={elemento} className="grid gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="group relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" aria-hidden="true" />
              <Input
                id="password"
                name="password"
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                aria-invalid={Boolean(errorPassword)}
                aria-describedby={errorPassword ? "password-error" : undefined}
                className="h-11 pl-10 pr-11 transition-shadow focus-visible:ring-2"
              />
              <button
                type="button"
                onClick={() => setVerPassword((actual) => !actual)}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={verPassword}
                className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={verPassword ? "ocultar" : "mostrar"}
                    initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                    transition={{ duration: 0.18 }}
                  >
                    {verPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            {errorPassword ? (
              <p id="password-error" className="text-xs font-medium text-destructive">
                {errorPassword}
              </p>
            ) : null}
          </motion.div>

          <motion.div variants={elemento} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
            <SubmitButton className="h-11 w-full text-sm font-semibold" textoEnviando="Ingresando">
              Ingresar
            </SubmitButton>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
}
