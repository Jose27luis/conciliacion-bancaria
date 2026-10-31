"use client";

import { useEffect, useState, useTransition } from "react";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { cerrarMes, reabrirMes } from "../actions";

type Props = { anio: number; mes: number; nombre: string; cerrado: boolean; puedeCerrar: boolean; puedeReabrir: boolean; vouchers: number };

function CloseDialog({ anio, mes, nombre, vouchers }: { anio: number; mes: number; nombre: string; vouchers: number }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const cerrar = () =>
    iniciar(async () => {
      const resultado = await cerrarMes(anio, mes);
      if (resultado.estado === "ok") {
        toast.success(`${nombre} cerrado.`);
        setAbierto(false);
      } else if (resultado.estado === "error") {
        toast.error(resultado.mensaje);
      }
    });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Lock className="size-4" aria-hidden="true" />
          Cerrar {nombre}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cerrar {nombre}</DialogTitle>
          <DialogDescription>
            Tiene {vouchers} {vouchers === 1 ? "voucher registrado" : "vouchers registrados"}. Una vez cerrado no se podrá registrar, editar, anular ni importar en ese mes. Solo un administrador puede reabrirlo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button onClick={cerrar} disabled={pendiente}>
            <Lock className="size-4" aria-hidden="true" />
            {pendiente ? "Cerrando" : "Cerrar mes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReopenDialog({ anio, mes, nombre }: { anio: number; mes: number; nombre: string }) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(reabrirMes.bind(null, anio, mes));
  const id = `motivo-reapertura-${anio}-${mes}`;
  useEffect(() => {
    if (estado.estado === "error" && Object.keys(estado.errores).length === 0) {
      toast.error(estado.mensaje);
    }
  }, [estado]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LockOpen className="size-4" aria-hidden="true" />
          Reabrir {nombre}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir {nombre}</DialogTitle>
          <DialogDescription>Se podrá volver a registrar y modificar vouchers del mes. El motivo queda en la auditoría.</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id={id} etiqueta="Motivo" ayuda="Entre 5 y 250 caracteres." error={errorDe(estado, "motivo")}>
            <textarea
              id={id}
              name="motivo"
              rows={3}
              maxLength={250}
              required
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Field>
          <DialogFooter>
            <SubmitButton textoEnviando="Reabriendo">Reabrir mes</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PeriodActions({ anio, mes, nombre, cerrado, puedeCerrar, puedeReabrir, vouchers }: Props) {
  if (cerrado) {
    return puedeReabrir ? <ReopenDialog anio={anio} mes={mes} nombre={nombre} /> : null;
  }
  return puedeCerrar ? <CloseDialog anio={anio} mes={mes} nombre={nombre} vouchers={vouchers} /> : null;
}
