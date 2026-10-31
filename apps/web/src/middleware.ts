import { NextResponse, type NextRequest } from "next/server";
import { urlPublica } from "./shared/auth/public-url";
import { NOMBRE_COOKIE_SESION, verificarToken } from "./shared/auth/session-token";

export async function middleware(solicitud: NextRequest): Promise<NextResponse> {
  if (solicitud.nextUrl.pathname === "/logout") {
    return NextResponse.next();
  }
  const token = solicitud.cookies.get(NOMBRE_COOKIE_SESION)?.value;
  const sesion = token ? await verificarToken(token) : null;
  const enLogin = solicitud.nextUrl.pathname === "/login";

  if (!sesion && !enLogin) {
    return NextResponse.redirect(urlPublica("/login"));
  }
  if (sesion && enLogin) {
    return NextResponse.redirect(urlPublica("/"));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
