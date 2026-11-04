import {
  activacionSchema,
  busquedaEntidadesQuerySchema,
  consultaDocumentoSchema,
  editarDetalleSchema,
  editarEntidadSchema,
  entidadConHistorialSchema,
  entidadesQuerySchema,
  entidadMaestroSchema,
  entidadSchema,
  paginaEntidadesSchema,
} from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class EntidadDto extends createZodDto(entidadSchema) {}
export class ConsultaDocumentoDto extends createZodDto(consultaDocumentoSchema) {}
export class EntidadConHistorialDto extends createZodDto(entidadConHistorialSchema) {}
export class BusquedaEntidadesQueryDto extends createZodDto(busquedaEntidadesQuerySchema) {}
export class EntidadesQueryDto extends createZodDto(entidadesQuerySchema) {}
export class PaginaEntidadesDto extends createZodDto(paginaEntidadesSchema) {}
export class EntidadMaestroDto extends createZodDto(entidadMaestroSchema) {}
export class EditarEntidadDto extends createZodDto(editarEntidadSchema) {}
export class EditarDetalleDto extends createZodDto(editarDetalleSchema) {}
export class ActivacionDto extends createZodDto(activacionSchema) {}
