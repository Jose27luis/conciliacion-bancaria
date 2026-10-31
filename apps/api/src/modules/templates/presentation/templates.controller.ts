import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ROLES_EDITAN_MAESTROS, type Plantilla, type UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { TemplatesService } from "../application/templates.service";
import { ActivacionDto, GuardarPlantillaDto, PlantillaDto, PlantillasQueryDto } from "./templates.dto";

const PARAM_ID = { name: "id", description: "Identificador de la plantilla (UUID)" };

@ApiTags("Plantillas de atajos")
@Controller("templates")
export class TemplatesController {
  constructor(private readonly plantillas: TemplatesService) {}

  @Get()
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Listar plantillas", description: "Atajos Alt+1 a Alt+9 que crean una fila ya llena en el registro rápido." })
  @ZodResponse({ status: 200, description: "Plantillas", type: [PlantillaDto] })
  listar(@Query() consulta: PlantillasQueryDto): Promise<Plantilla[]> {
    return this.plantillas.listar(consulta.activas);
  }

  @Post()
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Crear plantilla", description: "El proveedor debe existir; la CTA debe ser de movimiento y el COD estar activo." })
  @ZodResponse({ status: 201, description: "Plantilla creada", type: PlantillaDto })
  crear(@Body() entrada: GuardarPlantillaDto, @UsuarioActual() actor: UsuarioSesion): Promise<Plantilla> {
    return this.plantillas.crear(entrada, actor);
  }

  @Put(":id")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Editar plantilla" })
  @ZodResponse({ status: 200, description: "Plantilla editada", type: PlantillaDto })
  editar(@Param("id", UuidParamPipe) id: string, @Body() entrada: GuardarPlantillaDto, @UsuarioActual() actor: UsuarioSesion): Promise<Plantilla> {
    return this.plantillas.editar(id, entrada, actor);
  }

  @Patch(":id/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({
    summary: "Activar o desactivar plantilla",
    description: "Al desactivarla libera su tecla Alt. Al activarla recupera su tecla si está libre o toma la primera libre. No se elimina.",
  })
  @ZodResponse({ status: 200, description: "Plantilla actualizada", type: PlantillaDto })
  cambiarActivacion(@Param("id", UuidParamPipe) id: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<Plantilla> {
    return this.plantillas.cambiarActivacion(id, entrada.activo, actor);
  }
}
