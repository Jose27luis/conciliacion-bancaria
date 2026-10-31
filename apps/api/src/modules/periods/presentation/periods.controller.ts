import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ROLES_EDITAN_MAESTROS, type PeriodoAnual, type UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { PeriodsService } from "../application/periods.service";
import { PeriodoAnualDto, PeriodoParamsDto, PeriodosQueryDto, ReabrirPeriodoDto } from "./periods.dto";

const PARAM_ANIO = { name: "anio", description: "Año, por ejemplo 2026" };
const PARAM_MES = { name: "mes", description: "Mes de 1 a 12" };

@ApiTags("Periodos")
@Controller("periods")
export class PeriodsController {
  constructor(private readonly periodos: PeriodsService) {}

  @Get()
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Meses del año", description: "Los 12 meses con su estado, vouchers registrados y anulados, y quién los cerró." })
  @ZodResponse({ status: 200, description: "Meses del año", type: [PeriodoAnualDto] })
  listar(@Query() consulta: PeriodosQueryDto): Promise<PeriodoAnual[]> {
    return this.periodos.delAnio(consulta.anio);
  }

  @Post(":anio/:mes/close")
  @HttpCode(200)
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ANIO)
  @ApiParam(PARAM_MES)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Cerrar mes", description: "Un mes cerrado no admite registrar, editar, anular ni importar vouchers. No se puede cerrar un mes que aún no empieza." })
  @ZodResponse({ status: 200, description: "Mes cerrado", type: PeriodoAnualDto })
  cerrar(@Param() parametros: PeriodoParamsDto, @UsuarioActual() actor: UsuarioSesion): Promise<PeriodoAnual> {
    return this.periodos.cerrar(parametros.anio, parametros.mes, actor);
  }

  @Post(":anio/:mes/reopen")
  @HttpCode(200)
  @Roles("ADMIN")
  @ApiParam(PARAM_ANIO)
  @ApiParam(PARAM_MES)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Reabrir mes", description: "Solo administradores. El motivo queda en la auditoría." })
  @ZodResponse({ status: 200, description: "Mes reabierto", type: PeriodoAnualDto })
  reabrir(@Param() parametros: PeriodoParamsDto, @Body() entrada: ReabrirPeriodoDto, @UsuarioActual() actor: UsuarioSesion): Promise<PeriodoAnual> {
    return this.periodos.reabrir(parametros.anio, parametros.mes, entrada.motivo, actor);
  }
}
