"use client";

import type { CuentaContable } from "@conciliacion/contracts";
import { CLASES_CUENTA_CONTABLE, ETIQUETAS_CLASE_CUENTA_CONTABLE, ETIQUETAS_MONEDA, MONEDAS, TIPOS_CUENTA_CONTABLE } from "@conciliacion/contracts/enums";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { guardarCuentaContable } from "../actions";

const SELECTOR = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:dark]";

export function AccountDialog({ cuenta }: { cuenta?: CuentaContable }) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(guardarCuentaContable.bind(null, cuenta?.codigo ?? null));
  const prefijo = cuenta ? `cuenta-${cuenta.codigo}` : "cuenta-nueva";

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {cuenta ? (
          <Button variant="ghost" size="sm" aria-label={`Editar la cuenta ${cuenta.codigo}`}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </Button>
        ) : (
          <Button variant="outline">
            <Plus className="size-4" aria-hidden="true" />
            Nueva cuenta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{cuenta ? `Editar cuenta ${cuenta.codigo}` : "Nueva cuenta contable"}</DialogTitle>
          <DialogDescription>
            {cuenta
              ? "El código no se cambia. Si está mal, crea la cuenta correcta y desactiva esta."
              : "La cuenta superior y el nivel se calculan por el código. Si la cuenta superior era de movimiento, pasará a ser agrupadora."}
          </DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          {cuenta ? null : (
            <Field id={`${prefijo}-codigo`} etiqueta="Código" ayuda="De 2 a 8 dígitos, por ejemplo 104115 bajo 10411." error={errorDe(estado, "codigo")}>
              <Input id={`${prefijo}-codigo`} name="codigo" inputMode="numeric" maxLength={8} required autoComplete="off" className="tabular-nums" />
            </Field>
          )}
          <Field id={`${prefijo}-denominacion`} etiqueta="Denominación" error={errorDe(estado, "denominacion")}>
            <Input id={`${prefijo}-denominacion`} name="denominacion" defaultValue={cuenta?.denominacion} maxLength={200} required autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`${prefijo}-tipo`} etiqueta="Tipo" error={errorDe(estado, "tipo")}>
              <select id={`${prefijo}-tipo`} name="tipo" defaultValue={cuenta?.tipo ?? "BAL"} className={SELECTOR}>
                {TIPOS_CUENTA_CONTABLE.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${prefijo}-clase`} etiqueta="Clase" error={errorDe(estado, "clase")}>
              <select id={`${prefijo}-clase`} name="clase" defaultValue={cuenta?.clase ?? "ACTIVO"} className={SELECTOR}>
                {CLASES_CUENTA_CONTABLE.map((clase) => (
                  <option key={clase} value={clase}>
                    {ETIQUETAS_CLASE_CUENTA_CONTABLE[clase]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${prefijo}-moneda`} etiqueta="Moneda" error={errorDe(estado, "moneda")}>
              <select id={`${prefijo}-moneda`} name="moneda" defaultValue={cuenta?.moneda ?? "PEN"} className={SELECTOR}>
                {MONEDAS.map((moneda) => (
                  <option key={moneda} value={moneda}>
                    {ETIQUETAS_MONEDA[moneda]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label htmlFor={`${prefijo}-analitica`} className="flex items-center gap-2">
              <input id={`${prefijo}-analitica`} name="analitica" type="checkbox" defaultChecked={cuenta?.analitica ?? true} className="size-4 accent-[hsl(var(--primary))]" />
              Lleva análisis por proveedor
            </label>
            <label htmlFor={`${prefijo}-centro`} className="flex items-center gap-2">
              <input id={`${prefijo}-centro`} name="centroCosto" type="checkbox" defaultChecked={cuenta?.centroCosto ?? true} className="size-4 accent-[hsl(var(--primary))]" />
              Lleva centro de costo
            </label>
          </div>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">{cuenta ? "Guardar cambios" : "Crear cuenta"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
