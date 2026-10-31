"use server";

import {
  cambiarPasswordSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  loginRespuestaSchema,
  loginSchema,
  usuarioSchema,
} from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { api, apiSinRespuesta, ErrorDeApi } from "@/shared/api/server-client";
import { NOMBRE_COOKIE_SESION } from "@/shared/auth/session-token";
import { configuracion } from "@/shared/config/server-config";
import { fallo, falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

const RUTA_USUARIOS = "/settings/users";

export async function iniciarSesion(_estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = loginSchema.safeParse({ email: texto(datos, "email"), password: datos.get("password") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  try {
    const ipCliente = headers().get("x-real-ip");
    const sesion = await api("/auth/login", loginRespuestaSchema, {
      metodo: "POST",
      json: entrada.data,
      cabeceras: ipCliente ? { "x-cliente-ip": ipCliente } : {},
    });
    cookies().set(NOMBRE_COOKIE_SESION, sesion.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: configuracion.cookieSegura,
      path: "/",
      expires: new Date(sesion.expiraEn),
    });
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return fallo(error.cuerpo);
    }
    throw error;
  }
  redirect("/");
}

export async function cerrarSesion(): Promise<void> {
  cookies().delete(NOMBRE_COOKIE_SESION);
  redirect("/login");
}

export async function crearUsuario(_estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = crearUsuarioSchema.safeParse({
    nombre: texto(datos, "nombre"),
    email: texto(datos, "email"),
    rol: texto(datos, "rol"),
    password: datos.get("password"),
  });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api("/users", usuarioSchema, { metodo: "POST", json: entrada.data });
    revalidatePath(RUTA_USUARIOS);
  }, "Usuario creado.");
}

export async function editarUsuario(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = editarUsuarioSchema.safeParse({ nombre: texto(datos, "nombre"), rol: texto(datos, "rol") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/users/${id}`, usuarioSchema, { metodo: "PUT", json: entrada.data });
    revalidatePath(RUTA_USUARIOS);
  }, "Usuario actualizado.");
}

export async function cambiarActivacionUsuario(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/users/${id}/activation`, usuarioSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTA_USUARIOS);
  }, activo ? "Usuario activado." : "Usuario desactivado.");
}

export async function cambiarPasswordUsuario(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = cambiarPasswordSchema.safeParse({ password: datos.get("password") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await apiSinRespuesta(`/users/${id}/password`, { metodo: "PUT", json: entrada.data });
  }, "Contraseña cambiada.");
}
