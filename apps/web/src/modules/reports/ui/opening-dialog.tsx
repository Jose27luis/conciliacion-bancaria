"use client";

import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { guardarApertura } from "../actions";

type Props = {
  cuentaId: string;
  nombre: string;
  simbolo: string;
  saldo: string | null;
  anio: number | null;
  mes: number | null;
  mesSugerido: string;
};

export function OpeningDialog({ cuentaId, nombre, simbolo, saldo, anio, mes, mesSugerido }: Props) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(guardarApertura.bind(null, cuentaId));
  const prefijo = `apertura-${cuentaId}`;
  const periodo = anio && mes ? `${anio}-${String(mes).padStart(2, "0")}` : mesSugerido;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Saldo de apertura de ${nombre}`}>
          <Scale className="size-3.5" aria-hidden="true" />
          Apertura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saldo de apertura de {nombre}</DialogTitle>
          <DialogDescription>
            El saldo que tenía la cuenta al día 1 del mes indicado, según el extracto del banco o el arqueo de caja. Desde ese mes se calculan los saldos del resumen.
          </DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${prefijo}-periodo`} etiqueta="Mes de apertura" error={errorDe(estado, "anio") ?? errorDe(estado, "mes")}>
              <Input id={`${prefijo}-periodo`} name="periodo" type="month" defaultValue={periodo} required className="[color-scheme:dark]" />
            </Field>
            <Field id={`${prefijo}-saldo`} etiqueta={`Saldo al día 1 (${simbolo})`} ayuda="Puede ser negativo si la cuenta estaba en sobregiro." error={errorDe(estado, "saldo")}>
              <Input id={`${prefijo}-saldo`} name="saldo" defaultValue={saldo ?? ""} inputMode="decimal" required autoComplete="off" className="text-right tabular-nums" />
            </Field>
          </div>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Guardar saldo</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
