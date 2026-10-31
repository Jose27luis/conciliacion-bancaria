import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/shared/auth/session-token";

export function GET(solicitud: NextRequest): NextResponse {
  const destino = solicitud.nextUrl.clone();
  destino.pathname = "/login";
  destino.search = solicitud.nextUrl.searchParams.get("expirada") === "1" ? "?expirada=1" : "";
  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.delete(NOMBRE_COOKIE_SESION);
  return respuesta;
}
