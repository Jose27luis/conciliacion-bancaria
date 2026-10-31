"use server";

import { confirmarImportacionSchema, importacionSchema, uuidSchema } from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ErrorDeApi } from "@/shared/api/server-client";
import { archivo, fallo, falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

const RUTA = "/settings/imports";

export async function subirImportacion(_estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const adjunto = archivo(datos, "archivo");
  if (!adjunto) {
    return { estado: "error", mensaje: "Adjunta el Excel del modelo.", errores: { archivo: "Adjunta el archivo .xlsx." } };
  }
  const envio = new FormData();
  envio.set("archivo", adjunto.contenido, adjunto.nombre);
  let id: string;
  try {
    id = (await api("/imports", importacionSchema, { metodo: "POST", formulario: envio })).id;
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return fallo(error.cuerpo);
    }
    throw error;
  }
  revalidatePath(RUTA);
  redirect(`${RUTA}/${id}`);
}

export async function confirmarImportacion(id: string, hojas: string[], _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = confirmarImportacionSchema.safeParse({
    asignaciones: hojas.map((hoja, indice) => {
      const cuenta = texto(datos, `cuenta-${indice}`);
      return { hoja, cuentaTesoreriaId: cuenta === "" ? null : cuenta };
    }),
  });
  if (!entrada.success || !uuidSchema.safeParse(id).success) {
    return entrada.success ? { estado: "error", mensaje: "La importación no es válida.", errores: {} } : falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/imports/${id}/confirm`, importacionSchema, { metodo: "POST", json: entrada.data });
    revalidatePath(RUTA);
    revalidatePath(`${RUTA}/${id}`);
    revalidatePath("/ledger");
    revalidatePath("/quick-entry");
  }, "Importación realizada.");
}

export async function descartarImportacion(id: string): Promise<EstadoFormulario> {
  return ejecutarAccion(async () => {
    await api(`/imports/${id}/discard`, importacionSchema, { metodo: "POST" });
    revalidatePath(RUTA);
    revalidatePath(`${RUTA}/${id}`);
  }, "Vista previa descartada.");
}
