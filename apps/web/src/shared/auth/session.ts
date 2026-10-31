import "server-only";
import type { Rol, UsuarioSesion } from "@conciliacion/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOMBRE_COOKIE_SESION, verificarToken } from "./session-token";

export async function leerSesion(): Promise<UsuarioSesion | null> {
  const token = cookies().get(NOMBRE_COOKIE_SESION)?.value;
  return token ? verificarToken(token) : null;
}

export async function exigirSesion(roles?: readonly Rol[]): Promise<UsuarioSesion> {
  const sesion = await leerSesion();
  if (!sesion) {
    redirect("/login");
  }
  if (roles && !roles.includes(sesion.rol)) {
    redirect("/");
  }
  return sesion;
}
