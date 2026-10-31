"use client";

import type { Plantilla } from "@conciliacion/contracts";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/shared/ui/field";
import { errorDe, FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { useFormDialog } from "@/shared/ui/use-form-dialog";
import { guardarPlantilla } from "../actions";

type Catalogo = { codigo: string; descripcion: string };

type Props = { plantilla?: Plantilla; libres: number[]; medios: Catalogo[]; tipos: Catalogo[] };

const SELECTOR = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:dark]";

export function TemplateDialog({ plantilla, libres, medios, tipos }: Props) {
  const { abierto, setAbierto, estado, despachar } = useFormDialog(guardarPlantilla.bind(null, plantilla?.id ?? null));
  const prefijo = plantilla ? `plantilla-${plantilla.id}` : "plantilla-nueva";
  const teclas = plantilla?.atajo ? [...new Set([plantilla.atajo, ...libres])].sort((a, b) => a - b) : libres;

  if (!plantilla && libres.length === 0) {
    return (
      <Button disabled title="Ya hay 9 plantillas activas">
        <Plus className="size-4" aria-hidden="true" />
        Nueva plantilla
      </Button>
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {plantilla ? (
          <Button variant="ghost" size="sm" aria-label={`Editar plantilla ${plantilla.etiqueta}`}>
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Nueva plantilla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plantilla ? `Editar ${plantilla.etiqueta}` : "Nueva plantilla"}</DialogTitle>
          <DialogDescription>Al pulsar la tecla en el registro rápido se crea una fila con estos datos; solo falta la fecha y, si no es fijo, el importe.</DialogDescription>
        </DialogHeader>
        <form action={despachar} className="grid gap-4" noValidate>
          <FormAlert estado={estado} />
          <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
            <Field id={`${prefijo}-atajo`} etiqueta="Tecla" error={errorDe(estado, "atajo")}>
              <select id={`${prefijo}-atajo`} name="atajo" defaultValue={plantilla?.atajo ?? teclas[0]} className={SELECTOR}>
                {teclas.map((tecla) => (
                  <option key={tecla} value={tecla}>
                    Alt+{tecla}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${prefijo}-etiqueta`} etiqueta="Nombre" ayuda="Corto, por ejemplo ITF BBVA." error={errorDe(estado, "etiqueta")}>
              <Input id={`${prefijo}-etiqueta`} name="etiqueta" defaultValue={plantilla?.etiqueta} maxLength={40} required autoComplete="off" />
            </Field>
          </div>
          <Field id={`${prefijo}-documento`} etiqueta="RUC o DNI del proveedor" ayuda="Debe estar registrado: se crea al registrar su primer movimiento." error={errorDe(estado, "documento")}>
            <Input id={`${prefijo}-documento`} name="documento" defaultValue={plantilla?.entidad.numeroDocumento} inputMode="numeric" maxLength={15} required autoComplete="off" />
          </Field>
          <Field id={`${prefijo}-detalle`} etiqueta="Detalle" error={errorDe(estado, "detalle")}>
            <Input id={`${prefijo}-detalle`} name="detalle" defaultValue={plantilla?.detalle} maxLength={250} required autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${prefijo}-cta`} etiqueta="CTA" ayuda="Cuenta de movimiento del plan contable." error={errorDe(estado, "cuentaContableCodigo")}>
              <Input id={`${prefijo}-cta`} name="cuentaContableCodigo" defaultValue={plantilla?.cuentaContableCodigo} inputMode="numeric" maxLength={8} required autoComplete="off" />
            </Field>
            <Field id={`${prefijo}-cod`} etiqueta="COD (medio de pago)" error={errorDe(estado, "medioPagoCodigo")}>
              <select id={`${prefijo}-cod`} name="medioPagoCodigo" defaultValue={plantilla?.medioPagoCodigo ?? "999"} className={SELECTOR}>
                {medios.map((medio) => (
                  <option key={medio.codigo} value={medio.codigo}>
                    {medio.codigo} · {medio.descripcion.slice(0, 48)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`${prefijo}-analitico`} etiqueta="Analítico" error={errorDe(estado, "analitico")}>
              <select id={`${prefijo}-analitico`} name="analitico" defaultValue={plantilla?.analitico ?? "--"} className={SELECTOR}>
                <option value="--">-- Sin comprobante</option>
                {tipos.map((tipo) => (
                  <option key={tipo.codigo} value={`${tipo.codigo}-`}>
                    {tipo.codigo}- {tipo.descripcion}
                  </option>
                ))}
                <option value="">Dejar vacío</option>
              </select>
            </Field>
            <Field id={`${prefijo}-tipo`} etiqueta="Movimiento" error={errorDe(estado, "tipo")}>
              <select id={`${prefijo}-tipo`} name="tipo" defaultValue={plantilla?.tipo ?? "EGRESO"} className={SELECTOR}>
                <option value="EGRESO">Egreso</option>
                <option value="INGRESO">Ingreso</option>
              </select>
            </Field>
            <Field id={`${prefijo}-importe`} etiqueta="Importe fijo" ayuda="Opcional." error={errorDe(estado, "importe")}>
              <Input id={`${prefijo}-importe`} name="importe" defaultValue={plantilla?.importe ?? ""} inputMode="decimal" maxLength={15} autoComplete="off" className="text-right tabular-nums" />
            </Field>
          </div>
          <DialogFooter>
            <SubmitButton textoEnviando="Guardando">Guardar</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
