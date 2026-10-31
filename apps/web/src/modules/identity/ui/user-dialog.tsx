"use client";

import type { Usuario } from "@conciliacion/contracts";
import { ETIQUETAS_ROL, ROLES, type Rol } from "@conciliacion/contracts/enums";
import { Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { crearUsuario, editarUsuario } from "../actions";

const ROL_INICIAL: Rol = "ASISTENTE";

export function UserDialog({ usuario }: { usuario?: Usuario }) {
  const accion = usuario ? editarUsuario.bind(null, usuario.id) : crearUsuario;
  const { abierto, setAbierto, estado, despachar } = useFormDialog(accion);
  const prefijo = usuario ? `usuario-${usuario.id}` : "usuario-nuevo";

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {usuario ? (
          <Button variant="ghost" size="sm" aria-label={`Editar ${usuario.nombre}`}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
        ) : (
          <Button>
            <UserPlus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{usuario ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>{usuario ? usuario.email : "El usuario podrá ingresar con su correo y la contraseña que asignes."}</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id={`${prefijo}-nombre`} etiqueta="Nombre completo" error={errorDe(estado, "nombre")}>
            <Input id={`${prefijo}-nombre`} name="nombre" defaultValue={usuario?.nombre} required autoComplete="off" />
          </Field>
          {usuario ? null : (
            <Field id={`${prefijo}-email`} etiqueta="Correo" error={errorDe(estado, "email")}>
              <Input id={`${prefijo}-email`} name="email" type="email" required autoComplete="off" />
            </Field>
          )}
          <Field id={`${prefijo}-rol`} etiqueta="Rol" error={errorDe(estado, "rol")}>
            <Select name="rol" defaultValue={usuario?.rol ?? ROL_INICIAL}>
              <SelectTrigger id={`${prefijo}-rol`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((rol) => (
                  <SelectItem key={rol} value={rol}>
                    {ETIQUETAS_ROL[rol]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {usuario ? null : (
            <Field id={`${prefijo}-password`} etiqueta="Contraseña" ayuda="De 10 a 72 caracteres." error={errorDe(estado, "password")}>
              <Input id={`${prefijo}-password`} name="password" type="password" required autoComplete="new-password" />
            </Field>
          )}
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Guardar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
