"use server";

import { aperturaCuentaSchema, cuentaTesoreriaSchema, periodoAnualSchema, reabrirPeriodoSchema, uuidSchema } from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api } from "@/shared/api/server-client";
import { falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

function revalidar(): void {
  revalidatePath("/summary");
  revalidatePath("/quick-entry");
  revalidatePath("/ledger");
  revalidatePath("/settings/treasury-accounts");
}

export async function guardarApertura(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const [anio, mes] = texto(datos, "periodo").split("-").map(Number);
  const entrada = aperturaCuentaSchema.safeParse({ saldo: texto(datos, "saldo").replace(/,/g, ""), anio, mes });
  if (!entrada.success || !uuidSchema.safeParse(id).success) {
    return entrada.success ? { estado: "error", mensaje: "La cuenta no es válida.", errores: {} } : falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/treasury-accounts/${id}/opening`, cuentaTesoreriaSchema, { metodo: "PUT", json: entrada.data });
    revalidar();
  }, "Saldo de apertura guardado.");
}

export async function cerrarMes(anio: number, mes: number): Promise<EstadoFormulario> {
  return ejecutarAccion(async () => {
    await api(`/periods/${anio}/${mes}/close`, periodoAnualSchema, { metodo: "POST" });
    revalidar();
  }, "Mes cerrado.");
}

export async function reabrirMes(anio: number, mes: number, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = reabrirPeriodoSchema.safeParse({ motivo: texto(datos, "motivo") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/periods/${anio}/${mes}/reopen`, periodoAnualSchema, { metodo: "POST", json: entrada.data });
    revalidar();
  }, "Mes reabierto.");
}
