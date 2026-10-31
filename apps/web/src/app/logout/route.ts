import { NextResponse, type NextRequest } from "next/server";
import { urlPublica } from "@/shared/auth/public-url";
import { NOMBRE_COOKIE_SESION } from "@/shared/auth/session-token";

export function GET(solicitud: NextRequest): NextResponse {
  const expirada = solicitud.nextUrl.searchParams.get("expirada") === "1";
  const respuesta = NextResponse.redirect(urlPublica(expirada ? "/login?expirada=1" : "/login"));
  respuesta.cookies.delete(NOMBRE_COOKIE_SESION);
  return respuesta;
}
