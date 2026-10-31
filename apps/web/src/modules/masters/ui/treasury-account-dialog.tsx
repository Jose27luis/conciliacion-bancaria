"use client";

import { useState } from "react";
import type { CuentaTesoreria } from "@conciliacion/contracts";
import {
  ETIQUETAS_MONEDA,
  ETIQUETAS_TIPO_CUENTA_TESORERIA,
  MONEDAS,
  TIPOS_CUENTA_TESORERIA,
  type TipoCuentaTesoreria,
} from "@conciliacion/contracts/enums";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { guardarCuentaTesoreria } from "../actions";

export type OpcionCuentaContable = { codigo: string; denominacion: string };

type Props = { cuenta?: CuentaTesoreria; cuentasContables: OpcionCuentaContable[] };

export function TreasuryAccountDialog({ cuenta, cuentasContables }: Props) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(guardarCuentaTesoreria.bind(null, cuenta?.id ?? null));
  const [tipo, setTipo] = useState<TipoCuentaTesoreria>(cuenta?.tipo ?? "BANCO");
  const prefijo = cuenta ? `tesoreria-${cuenta.id}` : "tesoreria-nueva";
  const sinCuentas = cuentasContables.length === 0;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {cuenta ? (
          <Button variant="ghost" size="sm" aria-label={`Editar ${cuenta.nombre}`}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Nueva cuenta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{cuenta ? `Editar ${cuenta.nombre}` : "Nueva cuenta de tesorería"}</DialogTitle>
          <DialogDescription>Cada cuenta es una pestaña del registro rápido, como una hoja del Excel.</DialogDescription>
        </DialogHeader>
        {sinCuentas ? (
          <p className="text-sm text-muted-foreground">
            No hay cuentas de movimiento activas en la cuenta 10 del plan contable. Importa el plan contable antes de crear cuentas de tesorería.
          </p>
        ) : (
          <form action={despachar} className="grid gap-4" noValidate>
            <FormAlert estado={estado} />
            <Field id={`${prefijo}-nombre`} etiqueta="Nombre" ayuda="Se guarda en mayúsculas, por ejemplo CTA CTE SOLES." error={errorDe(estado, "nombre")}>
              <Input id={`${prefijo}-nombre`} name="nombre" defaultValue={cuenta?.nombre} maxLength={60} required autoComplete="off" className="uppercase" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${prefijo}-tipo`} etiqueta="Tipo" error={errorDe(estado, "tipo")}>
                <Select name="tipo" value={tipo} onValueChange={(valor) => setTipo(valor === "CAJA" ? "CAJA" : "BANCO")}>
                  <SelectTrigger id={`${prefijo}-tipo`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_CUENTA_TESORERIA.map((opcion) => (
                      <SelectItem key={opcion} value={opcion}>
                        {ETIQUETAS_TIPO_CUENTA_TESORERIA[opcion]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id={`${prefijo}-moneda`} etiqueta="Moneda" error={errorDe(estado, "moneda")}>
                <Select name="moneda" defaultValue={cuenta?.moneda ?? "PEN"}>
                  <SelectTrigger id={`${prefijo}-moneda`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS.map((moneda) => (
                      <SelectItem key={moneda} value={moneda}>
                        {ETIQUETAS_MONEDA[moneda]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {tipo === "BANCO" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id={`${prefijo}-banco`} etiqueta="Banco" error={errorDe(estado, "banco")}>
                  <Input id={`${prefijo}-banco`} name="banco" defaultValue={cuenta?.banco ?? ""} maxLength={80} required autoComplete="off" />
                </Field>
                <Field id={`${prefijo}-numero`} etiqueta="Número de cuenta" ayuda="Opcional. Solo dígitos y guiones." error={errorDe(estado, "numeroCuenta")}>
                  <Input id={`${prefijo}-numero`} name="numeroCuenta" defaultValue={cuenta?.numeroCuenta ?? ""} maxLength={30} inputMode="numeric" autoComplete="off" />
                </Field>
              </div>
            ) : null}
            <Field id={`${prefijo}-cuenta`} etiqueta="Cuenta contable" ayuda="Cuenta de movimiento de la 10 (efectivo y equivalentes)." error={errorDe(estado, "cuentaContableCodigo")}>
              <Select name="cuentaContableCodigo" defaultValue={cuenta?.cuentaContableCodigo ?? cuentasContables[0]?.codigo}>
                <SelectTrigger id={`${prefijo}-cuenta`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cuentasContables.map((opcion) => (
                    <SelectItem key={opcion.codigo} value={opcion.codigo}>
                      {opcion.codigo} · {opcion.denominacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id={`${prefijo}-orden`} etiqueta="Orden" ayuda="Posición de la pestaña; el menor va primero." error={errorDe(estado, "orden")} className="max-w-32">
              <Input id={`${prefijo}-orden`} name="orden" type="number" min={0} max={999} defaultValue={cuenta?.orden ?? 0} required />
            </Field>
            <DialogFooter>
              <SubmitButton textoEnviando="Guardando">Guardar</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
