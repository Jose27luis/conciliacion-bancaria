import { Body, Controller, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ROLES_EDITAN_MAESTROS, type CuentaTesoreria, type UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { TreasuryAccountsService } from "../application/treasury-accounts.service";
import { ActivacionDto, CuentasTesoreriaQueryDto, CuentaTesoreriaDto, GuardarCuentaTesoreriaDto } from "./masters.dto";

const PARAM_ID = { name: "id", description: "Identificador de la cuenta de tesorería (UUID)" };

@ApiTags("Cuentas de tesorería")
@Controller("treasury-accounts")
export class TreasuryAccountsController {
  constructor(private readonly cuentas: TreasuryAccountsService) {}

  @Get()
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Listar cuentas de tesorería", description: "Cuentas bancarias y cajas donde se registran los movimientos." })
  @ZodResponse({ status: 200, description: "Cuentas de tesorería", type: [CuentaTesoreriaDto] })
  listar(@Query() consulta: CuentasTesoreriaQueryDto): Promise<CuentaTesoreria[]> {
    return this.cuentas.listar(consulta.activas);
  }

  @Post()
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Crear cuenta de tesorería", description: "La cuenta contable debe ser de movimiento, estar activa y pertenecer a la cuenta 10." })
  @ZodResponse({ status: 201, description: "Cuenta creada", type: CuentaTesoreriaDto })
  crear(@Body() entrada: GuardarCuentaTesoreriaDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.cuentas.crear(entrada, actor);
  }

  @Put(":id")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Editar cuenta de tesorería" })
  @ZodResponse({ status: 200, description: "Cuenta editada", type: CuentaTesoreriaDto })
  editar(@Param("id", UuidParamPipe) id: string, @Body() entrada: GuardarCuentaTesoreriaDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.cuentas.editar(id, entrada, actor);
  }

  @Patch(":id/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Activar o desactivar cuenta de tesorería", description: "Una cuenta desactivada no aparece en el registro rápido. No se elimina." })
  @ZodResponse({ status: 200, description: "Cuenta actualizada", type: CuentaTesoreriaDto })
  cambiarActivacion(@Param("id", UuidParamPipe) id: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.cuentas.cambiarActivacion(id, entrada.activo, actor);
  }
}
