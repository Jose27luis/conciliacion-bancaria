"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { toast } from "sonner";
import { ESTADO_INICIAL, type EstadoFormulario } from "../lib/form-state";

type Accion = (estado: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;

export function useFormDialog(accion: Accion) {
  const [abierto, setAbierto] = useState(false);
  const [estado, despachar] = useFormState(accion, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.estado === "ok") {
      setAbierto(false);
      toast.success(estado.mensaje);
    }
  }, [estado]);

  return { abierto, setAbierto, estado, despachar };
}
