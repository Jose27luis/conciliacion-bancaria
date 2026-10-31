import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { ErrorApi } from "@conciliacion/contracts";
import type { Response } from "express";
import { ZodSerializationException, ZodValidationException } from "nestjs-zod";
import { z } from "zod";
import { erroresDeZod } from "./api-error";

function esErrorApi(valor: unknown): valor is ErrorApi {
  return typeof valor === "object" && valor !== null && "mensaje" in valor && typeof valor.mensaje === "string";
}

const MENSAJES_POR_ESTADO: Partial<Record<number, string>> = {
  [HttpStatus.NOT_FOUND]: "No se encontró el recurso.",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "El archivo pesa más de lo permitido.",
  [HttpStatus.TOO_MANY_REQUESTS]: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();

    if (excepcion instanceof ZodValidationException) {
      const error = excepcion.getZodError();
      const cuerpo: ErrorApi =
        error instanceof z.ZodError
          ? { mensaje: "Revisa los campos marcados.", errores: erroresDeZod(error) }
          : { mensaje: "Revisa los campos marcados." };
      respuesta.status(HttpStatus.BAD_REQUEST).json(cuerpo);
      return;
    }

    if (excepcion instanceof ZodSerializationException) {
      this.logger.error(`La respuesta no cumple su contrato: ${String(excepcion.getZodError())}`);
      respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: "Ocurrió un error inesperado. Inténtalo de nuevo." } satisfies ErrorApi);
      return;
    }

    if (excepcion instanceof HttpException) {
      const estado = excepcion.getStatus();
      const detalle = excepcion.getResponse();
      const cuerpo: ErrorApi = esErrorApi(detalle) ? detalle : { mensaje: MENSAJES_POR_ESTADO[estado] ?? "No se pudo completar la solicitud." };
      respuesta.status(estado).json(cuerpo);
      return;
    }

    this.logger.error(excepcion instanceof Error ? excepcion.stack ?? excepcion.message : String(excepcion));
    respuesta.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ mensaje: "Ocurrió un error inesperado. Inténtalo de nuevo." } satisfies ErrorApi);
  }
}
