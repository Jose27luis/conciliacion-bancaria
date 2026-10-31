import { periodosQuerySchema, resumenAnualSchema, resumenMensualSchema, resumenQuerySchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class ResumenQueryDto extends createZodDto(resumenQuerySchema) {}
export class ResumenMensualDto extends createZodDto(resumenMensualSchema) {}
export class ResumenAnualQueryDto extends createZodDto(periodosQuerySchema) {}
export class ResumenAnualDto extends createZodDto(resumenAnualSchema) {}
