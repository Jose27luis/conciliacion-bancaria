"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { crearTipoComprobante } from "../actions";

export function VoucherTypeDialog() {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(crearTipoComprobante);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          Nuevo tipo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo tipo de comprobante</DialogTitle>
          <DialogDescription>El código es la primera parte del analítico: tipo-serie-número.</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id="tipo-codigo" etiqueta="Código" ayuda="De 2 a 4 letras o números." error={errorDe(estado, "codigo")}>
            <Input id="tipo-codigo" name="codigo" maxLength={4} required autoComplete="off" className="uppercase" />
          </Field>
          <Field id="tipo-descripcion" etiqueta="Descripción" error={errorDe(estado, "descripcion")}>
            <Input id="tipo-descripcion" name="descripcion" maxLength={120} required autoComplete="off" />
          </Field>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Guardar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
