import type { ErrorApi } from "@conciliacion/contracts";
import type { z } from "zod";

export type EstadoFormulario =
  | { estado: "inicial" }
  | { estado: "ok"; mensaje: string; marca: number }
  | { estado: "error"; mensaje: string; errores: Record<string, string> };

export const ESTADO_INICIAL: EstadoFormulario = { estado: "inicial" };

export function exito(mensaje: string): EstadoFormulario {
  return { estado: "ok", mensaje, marca: Date.now() };
}

export function fallo(error: ErrorApi): EstadoFormulario {
  return { estado: "error", mensaje: error.mensaje, errores: error.errores ?? {} };
}

export function falloDeZod(error: z.ZodError): EstadoFormulario {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.map(String).join(".") || "general";
    errores[campo] ??= problema.message;
  }
  return { estado: "error", mensaje: "Revisa los campos marcados.", errores };
}

export function texto(datos: FormData, campo: string): string {
  const valor = datos.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

export function textoOpcional(datos: FormData, campo: string): string | null {
  const valor = texto(datos, campo);
  return valor === "" ? null : valor;
}

export function archivo(datos: FormData, campo: string): { contenido: Blob; nombre: string } | null {
  const valor = datos.get(campo);
  if (!(valor instanceof Blob) || valor.size === 0) {
    return null;
  }
  const nombre: unknown = Reflect.get(valor, "name");
  return { contenido: valor, nombre: typeof nombre === "string" && nombre ? nombre : "archivo.xlsx" };
}
