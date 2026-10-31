import { esRol, type UsuarioSesion } from "@conciliacion/contracts";
import { errors, jwtVerify } from "jose";

export const NOMBRE_COOKIE_SESION = "conciliacion_sesion";

function secreto(): Uint8Array {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres");
  }
  return new TextEncoder().encode(valor);
}

export async function verificarToken(token: string): Promise<UsuarioSesion | null> {
  try {
    const { payload } = await jwtVerify(token, secreto(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.nombre !== "string" || !esRol(payload.rol)) {
      return null;
    }
    return { id: payload.sub, nombre: payload.nombre, rol: payload.rol };
  } catch (error: unknown) {
    if (error instanceof errors.JOSEError) {
      return null;
    }
    throw error;
  }
}
