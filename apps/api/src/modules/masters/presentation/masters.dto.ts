import {
  activacionSchema,
  aperturaCuentaSchema,
  crearTipoComprobanteSchema,
  cuentaContableSchema,
  cuentaTesoreriaSchema,
  cuentasContablesQuerySchema,
  destinosCuentaSchema,
  guardarCuentaTesoreriaSchema,
  importacionPlanRechazoSchema,
  importacionPlanResultadoSchema,
  medioPagoSchema,
  opcionCuentaContableSchema,
  paginaCuentasContablesSchema,
  tipoComprobanteSchema,
} from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class CuentaContableDto extends createZodDto(cuentaContableSchema) {}
export class OpcionCuentaContableDto extends createZodDto(opcionCuentaContableSchema) {}
export class DestinosCuentaDto extends createZodDto(destinosCuentaSchema) {}
export class CuentasContablesQueryDto extends createZodDto(cuentasContablesQuerySchema) {}
export class PaginaCuentasContablesDto extends createZodDto(paginaCuentasContablesSchema) {}
export class ImportacionPlanResultadoDto extends createZodDto(importacionPlanResultadoSchema) {}
export class ImportacionPlanRechazoDto extends createZodDto(importacionPlanRechazoSchema) {}
export class MedioPagoDto extends createZodDto(medioPagoSchema) {}
export class TipoComprobanteDto extends createZodDto(tipoComprobanteSchema) {}
export class CrearTipoComprobanteDto extends createZodDto(crearTipoComprobanteSchema) {}
export class CuentaTesoreriaDto extends createZodDto(cuentaTesoreriaSchema) {}
export class GuardarCuentaTesoreriaDto extends createZodDto(guardarCuentaTesoreriaSchema) {}
export class ActivacionDto extends createZodDto(activacionSchema) {}
export class AperturaCuentaDto extends createZodDto(aperturaCuentaSchema) {}
export class CuentasTesoreriaQueryDto extends createZodDto(
  z.object({
    activas: z
      .enum(["true", "false"])
      .transform((valor) => valor === "true")
      .default(false)
      .describe("true para listar solo las cuentas activas"),
  }),
) {}
