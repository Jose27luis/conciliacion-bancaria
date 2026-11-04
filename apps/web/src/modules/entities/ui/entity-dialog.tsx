"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormState } from "react-dom";
import type { EntidadMaestro } from "@conciliacion/contracts";
import { BadgeCheck, Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { Field } from "@/shared/ui/field";
import { errorDe } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { consultarDocumento, type ResultadoConsultaDocumento } from "@/modules/ledger/actions";
import { editarEntidad, obtenerEntidad } from "../actions";
import { DetailRow } from "./detail-row";

type Props = { id: string; razonSocial: string; editable: boolean };

export function EntityDialog({ id, razonSocial, editable }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [entidad, setEntidad] = useState<EntidadMaestro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [estado, despachar] = useFormState(editarEntidad.bind(null, id), ESTADO_INICIAL);
  const [razon, setRazon] = useState("");
  const [consulta, setConsulta] = useState<ResultadoConsultaDocumento | { estado: "consultando" } | null>(null);

  useEffect(() => {
    setRazon(entidad?.razonSocial ?? "");
    setConsulta(null);
  }, [entidad]);

  const consultarOficial = (): void => {
    if (!entidad) {
      return;
    }
    setConsulta({ estado: "consultando" });
    consultarDocumento(entidad.numeroDocumento)
      .then((resultado) => {
        setConsulta(resultado);
        if (resultado.estado === "encontrado") {
          setRazon(resultado.consulta.razonSocial);
        }
      })
      .catch(() => setConsulta({ estado: "sinDatos", mensaje: "No se pudo consultar el documento. Revisa tu conexión." }));
  };

  const cargar = useCallback(() => {
    setCargando(true);
    obtenerEntidad(id)
      .then((resultado) => {
        setEntidad(resultado);
        if (!resultado) {
          toast.error("No se encontró el proveedor.");
        }
      })
      .catch(() => toast.error("No se pudo cargar la ficha. Revisa tu conexión."))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    if (abierto) {
      cargar();
    }
  }, [abierto, cargar]);

  useEffect(() => {
    if (estado.estado === "ok") {
      toast.success(estado.mensaje);
      cargar();
    }
  }, [estado, cargar]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Ver ficha de ${razonSocial}`}>
          <NotebookPen className="size-3.5" aria-hidden="true" />
          Ficha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entidad?.razonSocial ?? razonSocial}</DialogTitle>
          <DialogDescription>
            {entidad ? `${entidad.tipoDocumento} ${entidad.numeroDocumento} · ${entidad.usos} ${entidad.usos === 1 ? "movimiento" : "movimientos"}` : "Cargando ficha"}
          </DialogDescription>
        </DialogHeader>
        {cargando && !entidad ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando
          </div>
        ) : null}
        {entidad ? (
          <div className="grid gap-5">
            {editable ? (
              <form action={despachar} className="grid gap-2" noValidate>
                <div className="flex flex-wrap items-end gap-2">
                  <Field id={`razon-${id}`} etiqueta="Razón social" error={errorDe(estado, "razonSocial")} className="min-w-[14rem] flex-1">
                    <Input id={`razon-${id}`} name="razonSocial" value={razon} onChange={(evento) => setRazon(evento.target.value)} maxLength={200} required />
                  </Field>
                  {entidad.tipoDocumento !== "EXTRANJERO" ? (
                    <Button type="button" variant="outline" onClick={consultarOficial} disabled={consulta?.estado === "consultando"}>
                      {consulta?.estado === "consultando" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="size-4" aria-hidden="true" />}
                      Traer de {entidad.tipoDocumento === "RUC" ? "SUNAT" : "RENIEC"}
                    </Button>
                  ) : null}
                  <SubmitButton variant="secondary" textoEnviando="Guardando">
                    Guardar
                  </SubmitButton>
                </div>
                {consulta?.estado === "encontrado" ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    <span className="font-semibold text-sistema">{consulta.consulta.fuente}:</span>{" "}
                    {[consulta.consulta.estado, consulta.consulta.condicion, consulta.consulta.direccion].filter(Boolean).join(" · ") || "datos encontrados"}
                    {razon !== entidad.razonSocial ? " · Revisa y presiona Guardar para corregir la razón social." : " · La razón social ya coincide."}
                  </p>
                ) : consulta?.estado === "sinDatos" ? (
                  <p className="text-xs text-[#ffda79]" role="status">
                    {consulta.mensaje}
                  </p>
                ) : null}
              </form>
            ) : null}
            <section>
              <h3 className="text-sm font-semibold text-white">Detalles frecuentes</h3>
              <p className="mb-3 text-xs text-muted-foreground">Se proponen al registrar con este proveedor. Corrige los mal escritos o desactívalos para que no se sugieran.</p>
              {entidad.detalles.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aún no hay detalles aprendidos.</p>
              ) : (
                <ul className="grid gap-2">
                  {entidad.detalles.map((detalle) => (
                    <DetailRow key={`${detalle.id}-${detalle.detalle}-${detalle.cuentaContableCodigo}-${detalle.medioPagoCodigo}-${String(detalle.activo)}`} entidadId={id} detalle={detalle} editable={editable} alCambiar={cargar} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
