import "server-only";
import { errorApiSchema, type ErrorApi } from "@conciliacion/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { NOMBRE_COOKIE_SESION } from "../auth/session-token";
import { configuracion } from "../config/server-config";

export class ErrorDeApi extends Error {
  constructor(
    readonly estado: number,
    readonly cuerpo: ErrorApi,
    readonly crudo: unknown,
  ) {
    super(cuerpo.mensaje);
  }
}

type Metodo = "GET" | "POST" | "PUT" | "PATCH";

type Opciones = {
  metodo?: Metodo;
  json?: unknown;
  formulario?: FormData;
  consulta?: Record<string, string | number | boolean | undefined>;
  cabeceras?: Record<string, string>;
};

function url(ruta: string, consulta: Opciones["consulta"]): string {
  const direccion = new URL(`${configuracion.urlApi}/api${ruta}`);
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined && valor !== "") {
      direccion.searchParams.set(clave, String(valor));
    }
  }
  return direccion.toString();
}

async function errorDeRespuesta(respuesta: Response): Promise<ErrorDeApi> {
  const crudo: unknown = await respuesta.json().catch(() => null);
  const analizado = errorApiSchema.safeParse(crudo);
  const cuerpo: ErrorApi = analizado.success ? analizado.data : { mensaje: "No se pudo completar la solicitud. Inténtalo de nuevo." };
  return new ErrorDeApi(respuesta.status, cuerpo, crudo);
}

async function enviar(ruta: string, opciones: Opciones): Promise<Response> {
  const token = cookies().get(NOMBRE_COOKIE_SESION)?.value;
  const cabeceras = new Headers(opciones.cabeceras);
  if (token) {
    cabeceras.set("cookie", `${NOMBRE_COOKIE_SESION}=${token}`);
  }
  let cuerpo: BodyInit | undefined;
  if (opciones.json !== undefined) {
    cabeceras.set("content-type", "application/json");
    cuerpo = JSON.stringify(opciones.json);
  } else if (opciones.formulario) {
    cuerpo = opciones.formulario;
  }
  const respuesta = await fetch(url(ruta, opciones.consulta), {
    method: opciones.metodo ?? "GET",
    headers: cabeceras,
    body: cuerpo,
    cache: "no-store",
  });
  if (respuesta.status === 401 && token) {
    redirect("/logout?expirada=1");
  }
  if (!respuesta.ok) {
    throw await errorDeRespuesta(respuesta);
  }
  return respuesta;
}

export async function api<T>(ruta: string, esquema: z.ZodType<T>, opciones: Opciones = {}): Promise<T> {
  const respuesta = await enviar(ruta, opciones);
  const cuerpo: unknown = await respuesta.json();
  return esquema.parse(cuerpo);
}

export async function apiSinRespuesta(ruta: string, opciones: Opciones): Promise<void> {
  await enviar(ruta, opciones);
}
