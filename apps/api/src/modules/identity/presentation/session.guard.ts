import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Rol } from "@conciliacion/contracts";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { errores } from "../../../shared/http/api-error";
import { LoginService } from "../application/login.service";
import { SessionTokenService } from "../application/session-token.service";
import { CLAVE_PUBLICO, CLAVE_ROLES, type SolicitudConSesion } from "./decorators";

function leerToken(solicitud: SolicitudConSesion, nombreCookie: string): string | null {
  const cookies: unknown = solicitud.cookies;
  if (typeof cookies === "object" && cookies !== null && nombreCookie in cookies) {
    const valor: unknown = Reflect.get(cookies, nombreCookie);
    if (typeof valor === "string" && valor) {
      return valor;
    }
  }
  const cabecera = solicitud.headers.authorization;
  return cabecera?.startsWith("Bearer ") ? cabecera.slice(7) : null;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: AppConfigService,
    private readonly tokens: SessionTokenService,
    private readonly login: LoginService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const objetivos = [contexto.getHandler(), contexto.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(CLAVE_PUBLICO, objetivos)) {
      return true;
    }

    const solicitud = contexto.switchToHttp().getRequest<SolicitudConSesion>();
    const token = leerToken(solicitud, this.config.nombreCookieSesion);
    const firmado = token ? await this.tokens.verificar(token) : null;
    const usuario = firmado ? await this.login.vigente(firmado) : null;
    if (!usuario) {
      throw errores.noAutorizado();
    }

    const permitidos = this.reflector.getAllAndOverride<readonly Rol[] | undefined>(CLAVE_ROLES, objetivos);
    if (permitidos && !permitidos.includes(usuario.rol)) {
      throw errores.prohibido();
    }

    solicitud.usuario = usuario;
    return true;
  }
}
