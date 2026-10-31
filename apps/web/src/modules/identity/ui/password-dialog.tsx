"use client";

import type { Usuario } from "@conciliacion/contracts";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { cambiarPasswordUsuario } from "../actions";

export function PasswordDialog({ usuario }: { usuario: Usuario }) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(cambiarPasswordUsuario.bind(null, usuario.id));
  const id = `password-${usuario.id}`;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Cambiar contraseña de ${usuario.nombre}`}>
          <KeyRound className="size-4" aria-hidden="true" />
          Contraseña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>{usuario.nombre} deberá usar la nueva contraseña en su próximo ingreso.</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id={id} etiqueta="Nueva contraseña" ayuda="De 10 a 72 caracteres." error={errorDe(estado, "password")}>
            <Input id={id} name="password" type="password" required autoComplete="new-password" />
          </Field>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Cambiar contraseña</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
