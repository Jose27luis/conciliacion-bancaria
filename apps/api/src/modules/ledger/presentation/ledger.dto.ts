import {
  anularVoucherSchema,
  avisosLoteSchema,
  exportacionQuerySchema,
  hojaQuerySchema,
  hojaSchema,
  libroQuerySchema,
  libroSchema,
  loteRegistradoSchema,
  loteVouchersSchema,
  voucherEntradaSchema,
  voucherSchema,
} from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class HojaQueryDto extends createZodDto(hojaQuerySchema) {}
export class HojaDto extends createZodDto(hojaSchema) {}
export class LoteVouchersDto extends createZodDto(loteVouchersSchema) {}
export class AvisosLoteDto extends createZodDto(avisosLoteSchema) {}
export class LoteRegistradoDto extends createZodDto(loteRegistradoSchema) {}
export class LibroQueryDto extends createZodDto(libroQuerySchema) {}
export class LibroDto extends createZodDto(libroSchema) {}
export class VoucherDto extends createZodDto(voucherSchema) {}
export class VoucherEntradaDto extends createZodDto(voucherEntradaSchema) {}
export class AnularVoucherDto extends createZodDto(anularVoucherSchema) {}
export class ExportacionQueryDto extends createZodDto(exportacionQuerySchema) {}
