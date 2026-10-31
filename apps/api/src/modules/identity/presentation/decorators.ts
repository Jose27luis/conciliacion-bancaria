import { createParamDecorator, CustomDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Rol, UsuarioSesion } from "@conciliacion/contracts";
import type { Request } from "express";
import { errores } from "../../../shared/http/api-error";

export const CLAVE_PUBLICO = "ruta_publica";
export const CLAVE_ROLES = "roles_permitidos";

export type SolicitudConSesion = Request & { usuario?: UsuarioSesion };

export const Publico = (): CustomDecorator<string> => SetMetadata(CLAVE_PUBLICO, true);

export const Roles = (...roles: readonly Rol[]): CustomDecorator<string> => SetMetadata(CLAVE_ROLES, roles);

export const UsuarioActual = createParamDecorator((_datos: unknown, contexto: ExecutionContext): UsuarioSesion => {
  const usuario = contexto.switchToHttp().getRequest<SolicitudConSesion>().usuario;
  if (!usuario) {
    throw errores.noAutorizado();
  }
  return usuario;
});
