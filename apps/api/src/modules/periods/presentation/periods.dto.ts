import { periodoAnualSchema, periodosQuerySchema, reabrirPeriodoSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class PeriodoAnualDto extends createZodDto(periodoAnualSchema) {}
export class PeriodosQueryDto extends createZodDto(periodosQuerySchema) {}
export class ReabrirPeriodoDto extends createZodDto(reabrirPeriodoSchema) {}
export class PeriodoParamsDto extends createZodDto(
  z.object({
    anio: z.coerce.number().int().min(2000).max(2100).describe("Año"),
    mes: z.coerce.number().int().min(1).max(12).describe("Mes de 1 a 12"),
  }),
) {}
