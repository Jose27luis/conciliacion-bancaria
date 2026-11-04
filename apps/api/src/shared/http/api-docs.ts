import { applyDecorators } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { errorApiSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class ErrorApiDto extends createZodDto(errorApiSchema) {}

type ErrorDocumentado = "validacion" | "noEncontrado" | "conflicto" | "noDisponible";

export function ApiProtegida(...extra: ErrorDocumentado[]): MethodDecorator & ClassDecorator {
  const decoradores = [
    ApiCookieAuth(),
    ApiUnauthorizedResponse({ description: "No hay sesión o expiró", type: ErrorApiDto }),
    ApiForbiddenResponse({ description: "El rol del usuario no tiene permiso", type: ErrorApiDto }),
  ];
  if (extra.includes("validacion")) {
    decoradores.push(ApiBadRequestResponse({ description: "Datos inválidos, con el detalle por campo", type: ErrorApiDto }));
  }
  if (extra.includes("noEncontrado")) {
    decoradores.push(ApiNotFoundResponse({ description: "El registro no existe", type: ErrorApiDto }));
  }
  if (extra.includes("conflicto")) {
    decoradores.push(ApiConflictResponse({ description: "El registro choca con otro existente", type: ErrorApiDto }));
  }
  if (extra.includes("noDisponible")) {
    decoradores.push(ApiServiceUnavailableResponse({ description: "El servicio externo no está configurado o no respondió", type: ErrorApiDto }));
  }
  return applyDecorators(...decoradores);
}
