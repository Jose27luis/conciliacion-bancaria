"use client";

import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { cambiarDestinos } from "../actions";

type Props = { codigo: string; denominacion: string; destinoDebe: string | null; destinoHaber: string | null };

export function DestinationsDialog({ codigo, denominacion, destinoDebe, destinoHaber }: Props) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(cambiarDestinos.bind(null, codigo));
  const prefijo = `destino-${codigo}`;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Amarre de destino de la cuenta ${codigo}`}>
          <GitBranch className="size-3.5" aria-hidden="true" />
          Amarre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Amarre de {codigo}</DialogTitle>
          <DialogDescription>
            {denominacion}. Las cuentas de destino salen en el Excel junto a cada línea con esta CTA, como las columnas M y N del modelo. Deja ambas vacías para quitar el amarre.
          </DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${prefijo}-debe`} etiqueta="Destino debe" ayuda="Por ejemplo 95 o 94." error={errorDe(estado, "destinoDebeCodigo")}>
              <Input id={`${prefijo}-debe`} name="destinoDebeCodigo" defaultValue={destinoDebe ?? ""} inputMode="numeric" maxLength={8} autoComplete="off" />
            </Field>
            <Field id={`${prefijo}-haber`} etiqueta="Destino haber" ayuda="Por ejemplo 791." error={errorDe(estado, "destinoHaberCodigo")}>
              <Input id={`${prefijo}-haber`} name="destinoHaberCodigo" defaultValue={destinoHaber ?? ""} inputMode="numeric" maxLength={8} autoComplete="off" />
            </Field>
          </div>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Guardar amarre</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
