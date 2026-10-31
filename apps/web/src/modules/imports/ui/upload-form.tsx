"use client";

import { useFormState } from "react-dom";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { subirImportacion } from "../actions";

export function UploadForm() {
  const [estado, despachar] = useFormState(subirImportacion, ESTADO_INICIAL);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="size-5 text-primary" aria-hidden="true" />
          Subir Excel del modelo
        </CardTitle>
        <CardDescription>
          Se leen las hojas visibles (una por cuenta). Primero verás una vista previa con las observaciones; nada se registra hasta que la confirmes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={despachar} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
          <div className="sm:col-span-2">
            <FormAlert estado={estado} />
          </div>
          <Field id="importacion-archivo" etiqueta="Archivo .xlsx" ayuda="Máximo 10 MB." error={errorDe(estado, "archivo")}>
            <Input id="importacion-archivo" name="archivo" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
          </Field>
          <SubmitButton textoEnviando="Leyendo el Excel">Ver vista previa</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
