import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { ErrorApi } from "@conciliacion/contracts";
import { z } from "zod";

export function erroresDeZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const problema of error.issues) {
    const campo = problema.path.map(String).join(".") || "general";
    if (!errores[campo]) {
      errores[campo] = problema.message;
    }
  }
  return errores;
}

function cuerpo(mensaje: string, errores?: Record<string, string>): ErrorApi {
  return errores ? { mensaje, errores } : { mensaje };
}

export const errores = {
  validacion: (mensaje: string, detalle?: Record<string, string>): BadRequestException => new BadRequestException(cuerpo(mensaje, detalle)),
  noAutorizado: (mensaje = "Tu sesión terminó. Vuelve a ingresar."): UnauthorizedException => new UnauthorizedException(cuerpo(mensaje)),
  prohibido: (mensaje = "No tienes permiso para esta acción."): ForbiddenException => new ForbiddenException(cuerpo(mensaje)),
  noEncontrado: (mensaje = "No se encontró el registro."): NotFoundException => new NotFoundException(cuerpo(mensaje)),
  conflicto: (mensaje: string, detalle?: Record<string, string>): ConflictException => new ConflictException(cuerpo(mensaje, detalle)),
};

export function esErrorDeUnicidad(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
