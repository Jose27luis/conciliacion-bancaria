import { avisosLoteSchema, hojaQuerySchema, hojaSchema, loteRegistradoSchema, loteVouchersSchema } from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class HojaQueryDto extends createZodDto(hojaQuerySchema) {}
export class HojaDto extends createZodDto(hojaSchema) {}
export class LoteVouchersDto extends createZodDto(loteVouchersSchema) {}
export class AvisosLoteDto extends createZodDto(avisosLoteSchema) {}
export class LoteRegistradoDto extends createZodDto(loteRegistradoSchema) {}
