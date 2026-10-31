"use server";

import { editarDetalleSchema, editarEntidadSchema, entidadMaestroSchema, uuidSchema, type EntidadMaestro } from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api, ErrorDeApi } from "@/shared/api/server-client";
import { falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

const RUTA = "/masters/entities";

export async function obtenerEntidad(id: string): Promise<EntidadMaestro | null> {
  if (!uuidSchema.safeParse(id).success) {
    return null;
  }
  try {
    return await api(`/entities/${id}`, entidadMaestroSchema);
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi && error.estado === 404) {
      return null;
    }
    throw error;
  }
}

export async function editarEntidad(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = editarEntidadSchema.safeParse({ razonSocial: texto(datos, "razonSocial") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/entities/${id}`, entidadMaestroSchema, { metodo: "PUT", json: entrada.data });
    revalidatePath(RUTA);
  }, "Razón social actualizada.");
}

export async function editarDetalle(entidadId: string, detalleId: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = editarDetalleSchema.safeParse({
    detalle: texto(datos, "detalle"),
    cuentaContableCodigo: texto(datos, "cuentaContableCodigo"),
    medioPagoCodigo: texto(datos, "medioPagoCodigo"),
  });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/entities/${entidadId}/details/${detalleId}`, entidadMaestroSchema, { metodo: "PUT", json: entrada.data });
    revalidatePath(RUTA);
  }, "Detalle actualizado.");
}

export async function cambiarActivacionDetalle(entidadId: string, detalleId: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/entities/${entidadId}/details/${detalleId}/activation`, entidadMaestroSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTA);
  }, activo ? "Detalle activado; se volverá a sugerir." : "Detalle desactivado; ya no se sugerirá.");
}
