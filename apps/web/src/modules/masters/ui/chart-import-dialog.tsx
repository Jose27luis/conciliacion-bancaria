"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { importarPlanContable, type EstadoImportacion } from "../actions";

const COLUMNAS = "COD_CTA, DEN_CTA, TIP_CTA, FLAG_CUENTA_ANALITICA, FLA_CENTROCOSTO, MONEDA_CTA y CLASE";

export function ChartImportDialog() {
  const [abierto, setAbierto] = useState(false);
  const [estado, despachar] = useFormState<EstadoImportacion, FormData>(importarPlanContable, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.estado === "ok") {
      setAbierto(false);
      toast.success(estado.mensaje);
    }
  }, [estado]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="size-4" aria-hidden="true" />
          Importar plan contable
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar plan contable</DialogTitle>
          <DialogDescription>
            Crea las cuentas nuevas y actualiza las existentes. Ninguna cuenta se elimina. Si una fila tiene errores no se guarda nada.
          </DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          {estado.filas && estado.filas.length > 0 ? (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {estado.filas.map((fila) => (
                <li key={fila.fila}>{fila.mensaje}</li>
              ))}
            </ul>
          ) : null}
          <Field id="plan-archivo" etiqueta="Archivo Excel (.xlsx)" ayuda={`Debe tener las columnas ${COLUMNAS}. Máximo 5 MB.`} error={errorDe(estado, "archivo")}>
            <Input id="plan-archivo" name="archivo" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
          </Field>
          <DialogFooter>
            <SubmitButton textoEnviando="Importando">Importar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
