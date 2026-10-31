"use server";

import { guardarPlantillaSchema, plantillaSchema } from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api } from "@/shared/api/server-client";
import { falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

const RUTA = "/masters/templates";

export async function guardarPlantilla(id: string | null, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = guardarPlantillaSchema.safeParse({
    atajo: Number(texto(datos, "atajo")),
    etiqueta: texto(datos, "etiqueta"),
    documento: texto(datos, "documento"),
    detalle: texto(datos, "detalle"),
    cuentaContableCodigo: texto(datos, "cuentaContableCodigo"),
    medioPagoCodigo: texto(datos, "medioPagoCodigo"),
    analitico: texto(datos, "analitico"),
    tipo: texto(datos, "tipo"),
    importe: texto(datos, "importe"),
  });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(id ? `/templates/${id}` : "/templates", plantillaSchema, { metodo: id ? "PUT" : "POST", json: entrada.data });
    revalidatePath(RUTA);
    revalidatePath("/quick-entry");
  }, id ? "Plantilla actualizada." : `Plantilla creada en Alt+${entrada.data.atajo}.`);
}

export async function cambiarActivacionPlantilla(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/templates/${id}/activation`, plantillaSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTA);
    revalidatePath("/quick-entry");
  }, activo ? "Plantilla activada." : "Plantilla desactivada; su tecla quedó libre.");
}
