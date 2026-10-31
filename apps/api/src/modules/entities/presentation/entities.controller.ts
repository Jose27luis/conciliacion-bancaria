import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Entidad, EntidadConHistorial } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { EntitiesService } from "../application/entities.service";
import { BusquedaEntidadesQueryDto, EntidadConHistorialDto, EntidadDto } from "./entities.dto";

@ApiTags("Proveedores y clientes")
@Controller("entities")
export class EntitiesController {
  constructor(private readonly entidades: EntitiesService) {}

  @Get("search")
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Buscar proveedores y clientes",
    description: "Si la consulta son dígitos busca por prefijo del documento; si no, por parte de la razón social. Ordena por uso.",
  })
  @ZodResponse({ status: 200, description: "Hasta 8 coincidencias", type: [EntidadDto] })
  buscar(@Query() consulta: BusquedaEntidadesQueryDto): Promise<Entidad[]> {
    return this.entidades.buscar(consulta.q);
  }

  @Get("document/:documento")
  @ApiParam({ name: "documento", description: "RUC, DNI o documento extranjero" })
  @ApiProtegida("noEncontrado")
  @ApiOperation({ summary: "Entidad por documento", description: "Incluye los detalles usados antes con su CTA y COD." })
  @ZodResponse({ status: 200, description: "Entidad con historial", type: EntidadConHistorialDto })
  porDocumento(@Param("documento") documento: string): Promise<EntidadConHistorial> {
    return this.entidades.porDocumento(documento);
  }
}
