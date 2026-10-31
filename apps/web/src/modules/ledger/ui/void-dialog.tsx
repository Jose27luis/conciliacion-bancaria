"use client";

import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { anularVoucher } from "../actions";

type Props = { voucherId: string; codigo: string; resumen: string };

export function VoidDialog({ voucherId, codigo, resumen }: Props) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(anularVoucher.bind(null, voucherId));
  const id = `motivo-${voucherId}`;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/15 hover:text-destructive" aria-label={`Anular voucher ${codigo}`}>
          <Ban className="size-3.5" aria-hidden="true" />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular voucher {codigo}</DialogTitle>
          <DialogDescription>{resumen}. Quedará marcado como anulado con su motivo; no se borra y su número no se vuelve a usar.</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id={id} etiqueta="Motivo de la anulación" ayuda="Entre 5 y 250 caracteres." error={errorDe(estado, "motivo")}>
            <textarea
              id={id}
              name="motivo"
              required
              maxLength={250}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Field>
          <DialogFooter>
            <SubmitButton variant="destructive" textoEnviando="Anulando">
              Anular voucher
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
