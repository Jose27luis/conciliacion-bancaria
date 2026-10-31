"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { ESTADO_INICIAL, type EstadoFormulario } from "../lib/form-state";
import { SubmitButton } from "./submit-button";

type Props = {
  accion: (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;
  activo: boolean;
  nombre: string;
};

export function ActivationButton({ accion, activo, nombre }: Props) {
  const [estado, despachar] = useFormState(accion, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.estado === "ok") {
      toast.success(estado.mensaje);
    }
    if (estado.estado === "error") {
      toast.error(estado.mensaje);
    }
  }, [estado]);

  return (
    <form action={despachar}>
      <input type="hidden" name="activo" value={activo ? "false" : "true"} />
      <SubmitButton variant="ghost" size="sm" aria-label={`${activo ? "Desactivar" : "Activar"} ${nombre}`}>
        {activo ? "Desactivar" : "Activar"}
      </SubmitButton>
    </form>
  );
}
