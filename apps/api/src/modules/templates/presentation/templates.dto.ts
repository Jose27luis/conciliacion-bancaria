import { activacionSchema, guardarPlantillaSchema, plantillaSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class PlantillaDto extends createZodDto(plantillaSchema) {}
export class GuardarPlantillaDto extends createZodDto(guardarPlantillaSchema) {}
export class ActivacionDto extends createZodDto(activacionSchema) {}
export class PlantillasQueryDto extends createZodDto(
  z.object({
    activas: z
      .enum(["true", "false"])
      .transform((valor) => valor === "true")
      .default(false)
      .describe("true para listar solo las plantillas activas"),
  }),
) {}
