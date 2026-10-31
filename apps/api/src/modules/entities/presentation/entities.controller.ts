import { Body, Controller, Get, Param, Patch, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import {
  ROLES_EDITAN_MAESTROS,
  type Entidad,
  type EntidadConHistorial,
  type EntidadMaestro,
  type EntidadResumen,
  type Pagina,
  type UsuarioSesion,
} from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { EntitiesService } from "../application/entities.service";
import {
  ActivacionDto,
  BusquedaEntidadesQueryDto,
  EditarDetalleDto,
  EditarEntidadDto,
  EntidadConHistorialDto,
  EntidadDto,
  EntidadesQueryDto,
  EntidadMaestroDto,
  PaginaEntidadesDto,
} from "./entities.dto";

const PARAM_ID = { name: "id", description: "Identificador del proveedor (UUID)" };
const PARAM_DETALLE = { name: "detalleId", description: "Identificador del detalle frecuente (UUID)" };

@ApiTags("Proveedores y clientes")
@Controller("entities")
export class EntitiesController {
  constructor(private readonly entidades: EntitiesService) {}

  @Get()
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Listar proveedores y clientes", description: "Paginado y ordenado por uso. Filtra por prefijo del documento o parte de la razón social." })
  @ZodResponse({ status: 200, description: "Página de proveedores", type: PaginaEntidadesDto })
  listar(@Query() consulta: EntidadesQueryDto): Promise<Pagina<EntidadResumen>> {
    return this.entidades.listar(consulta);
  }

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
  @ApiOperation({ summary: "Entidad por documento", description: "Incluye los detalles activos usados antes con su CTA y COD." })
  @ZodResponse({ status: 200, description: "Entidad con historial", type: EntidadConHistorialDto })
  porDocumento(@Param("documento") documento: string): Promise<EntidadConHistorial> {
    return this.entidades.porDocumento(documento);
  }

  @Get(":id")
  @ApiParam(PARAM_ID)
  @ApiProtegida("noEncontrado")
  @ApiOperation({ summary: "Ficha del proveedor", description: "Incluye todos sus detalles frecuentes, activos e inactivos." })
  @ZodResponse({ status: 200, description: "Proveedor con sus detalles", type: EntidadMaestroDto })
  maestro(@Param("id", UuidParamPipe) id: string): Promise<EntidadMaestro> {
    return this.entidades.maestro(id);
  }

  @Put(":id")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Corregir razón social", description: "El documento no se cambia; si está mal, se registra el correcto como otro proveedor." })
  @ZodResponse({ status: 200, description: "Proveedor actualizado", type: EntidadMaestroDto })
  editar(@Param("id", UuidParamPipe) id: string, @Body() entrada: EditarEntidadDto, @UsuarioActual() actor: UsuarioSesion): Promise<EntidadMaestro> {
    return this.entidades.editar(id, entrada, actor);
  }

  @Put(":id/details/:detalleId")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiParam(PARAM_DETALLE)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Corregir detalle frecuente", description: "Cambia el texto, la CTA o el COD que se proponen al registrar." })
  @ZodResponse({ status: 200, description: "Proveedor con sus detalles", type: EntidadMaestroDto })
  editarDetalle(
    @Param("id", UuidParamPipe) id: string,
    @Param("detalleId", UuidParamPipe) detalleId: string,
    @Body() entrada: EditarDetalleDto,
    @UsuarioActual() actor: UsuarioSesion,
  ): Promise<EntidadMaestro> {
    return this.entidades.editarDetalle(id, detalleId, entrada, actor);
  }

  @Patch(":id/details/:detalleId/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiParam(PARAM_DETALLE)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Activar o desactivar detalle frecuente", description: "Un detalle desactivado deja de sugerirse. No se elimina." })
  @ZodResponse({ status: 200, description: "Proveedor con sus detalles", type: EntidadMaestroDto })
  cambiarActivacionDetalle(
    @Param("id", UuidParamPipe) id: string,
    @Param("detalleId", UuidParamPipe) detalleId: string,
    @Body() entrada: ActivacionDto,
    @UsuarioActual() actor: UsuarioSesion,
  ): Promise<EntidadMaestro> {
    return this.entidades.cambiarActivacionDetalle(id, detalleId, entrada.activo, actor);
  }
}
