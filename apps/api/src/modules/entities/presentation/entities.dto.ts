import { busquedaEntidadesQuerySchema, entidadConHistorialSchema, entidadSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class EntidadDto extends createZodDto(entidadSchema) {}
export class EntidadConHistorialDto extends createZodDto(entidadConHistorialSchema) {}
export class BusquedaEntidadesQueryDto extends createZodDto(busquedaEntidadesQuerySchema) {}
