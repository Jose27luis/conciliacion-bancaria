import { confirmarImportacionSchema, importacionResumenSchema, importacionSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class ImportacionDto extends createZodDto(importacionSchema) {}
export class ImportacionResumenDto extends createZodDto(importacionResumenSchema) {}
export class ConfirmarImportacionDto extends createZodDto(confirmarImportacionSchema) {}
