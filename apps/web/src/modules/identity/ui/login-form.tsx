"use client";

import { useFormState } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { iniciarSesion } from "../actions";

export function LoginForm({ sesionExpirada }: { sesionExpirada: boolean }) {
  const [estado, despachar] = useFormState(iniciarSesion, ESTADO_INICIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresar</CardTitle>
        <CardDescription>
          {sesionExpirada ? "Tu sesión terminó. Vuelve a ingresar para continuar." : "Usa el correo y la contraseña que te dio el administrador."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <Field id="email" etiqueta="Correo" error={errorDe(estado, "email")}>
            <Input id="email" name="email" type="email" autoComplete="username" required autoFocus aria-invalid={Boolean(errorDe(estado, "email"))} />
          </Field>
          <Field id="password" etiqueta="Contraseña" error={errorDe(estado, "password")}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(errorDe(estado, "password"))} />
          </Field>
          <SubmitButton className="w-full" textoEnviando="Ingresando">
            Ingresar
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
