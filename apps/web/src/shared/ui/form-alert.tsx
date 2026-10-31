import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EstadoFormulario } from "../lib/form-state";

export function FormAlert({ estado }: { estado: EstadoFormulario }) {
  if (estado.estado !== "error") {
    return null;
  }
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert className="size-4" aria-hidden="true" />
      <AlertDescription>{estado.mensaje}</AlertDescription>
    </Alert>
  );
}

export function errorDe(estado: EstadoFormulario, campo: string): string | undefined {
  return estado.estado === "error" ? estado.errores[campo] : undefined;
}
