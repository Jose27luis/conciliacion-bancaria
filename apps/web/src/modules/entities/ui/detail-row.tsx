"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import type { DetalleMaestro } from "@conciliacion/contracts";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ESTADO_INICIAL, type EstadoFormulario } from "@/shared/lib/form-state";
import { errorDe } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { cambiarActivacionDetalle, editarDetalle } from "../actions";

type Props = { entidadId: string; detalle: DetalleMaestro; editable: boolean; alCambiar: () => void };

function useResultado(estado: EstadoFormulario, alCambiar: () => void): void {
  useEffect(() => {
    if (estado.estado === "ok") {
      toast.success(estado.mensaje);
      alCambiar();
    }
    if (estado.estado === "error") {
      toast.error(estado.mensaje);
    }
  }, [estado, alCambiar]);
}

export function DetailRow({ entidadId, detalle, editable, alCambiar }: Props) {
  const [estadoEdicion, despacharEdicion] = useFormState(editarDetalle.bind(null, entidadId, detalle.id), ESTADO_INICIAL);
  const [estadoActivacion, despacharActivacion] = useFormState(cambiarActivacionDetalle.bind(null, entidadId, detalle.id), ESTADO_INICIAL);
  useResultado(estadoEdicion, alCambiar);
  useResultado(estadoActivacion, alCambiar);
  const prefijo = `detalle-${detalle.id}`;

  if (!editable) {
    return (
      <li className={cn("flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-xs", !detalle.activo && "opacity-60")}>
        <span className="truncate">{detalle.detalle}</span>
        <span className="shrink-0 text-sistema">
          CTA {detalle.cuentaContableCodigo} · COD {detalle.medioPagoCodigo} · {detalle.usos} usos
        </span>
      </li>
    );
  }

  return (
    <li className={cn("rounded-md border border-border bg-muted/50 p-3", !detalle.activo && "opacity-70")}>
      <form action={despacharEdicion} className="grid gap-2 sm:grid-cols-[1fr_90px_70px_auto] sm:items-end" noValidate>
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-detalle`} className="text-[11px]">
            Detalle
          </Label>
          <Input id={`${prefijo}-detalle`} name="detalle" defaultValue={detalle.detalle} maxLength={250} className="h-8 text-xs" aria-invalid={Boolean(errorDe(estadoEdicion, "detalle"))} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-cta`} className="text-[11px]">
            CTA
          </Label>
          <Input
            id={`${prefijo}-cta`}
            name="cuentaContableCodigo"
            defaultValue={detalle.cuentaContableCodigo}
            inputMode="numeric"
            className="h-8 text-xs tabular-nums"
            title={detalle.cuentaContableDenominacion}
            aria-invalid={Boolean(errorDe(estadoEdicion, "cuentaContableCodigo"))}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${prefijo}-cod`} className="text-[11px]">
            COD
          </Label>
          <Input id={`${prefijo}-cod`} name="medioPagoCodigo" defaultValue={detalle.medioPagoCodigo} inputMode="numeric" maxLength={3} className="h-8 text-xs tabular-nums" aria-invalid={Boolean(errorDe(estadoEdicion, "medioPagoCodigo"))} />
        </div>
        <SubmitButton size="sm" variant="secondary" className="h-8" textoEnviando="Guardando">
          Guardar
        </SubmitButton>
      </form>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          {detalle.usos} {detalle.usos === 1 ? "uso" : "usos"} · {detalle.activo ? "se sugiere al registrar" : "desactivado, no se sugiere"}
        </span>
        <form action={despacharActivacion}>
          <input type="hidden" name="activo" value={detalle.activo ? "false" : "true"} />
          <SubmitButton size="sm" variant="ghost" className="h-7 text-[11px]">
            {detalle.activo ? "Desactivar" : "Activar"}
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}
