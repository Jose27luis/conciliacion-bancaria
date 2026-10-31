import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ROLES_EDITAN_MAESTROS, type MedioPago, type TipoComprobante, type UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { CatalogsService } from "../application/catalogs.service";
import { ActivacionDto, CrearTipoComprobanteDto, MedioPagoDto, TipoComprobanteDto } from "./masters.dto";

const PARAM_CODIGO = { name: "codigo", description: "Código del catálogo" };

@ApiTags("Medios de pago")
@Controller("payment-methods")
export class PaymentMethodsController {
  constructor(private readonly catalogos: CatalogsService) {}

  @Get()
  @ApiProtegida()
  @ApiOperation({ summary: "Listar medios de pago", description: "Tabla 1 de SUNAT, ordenada por código." })
  @ZodResponse({ status: 200, description: "Medios de pago", type: [MedioPagoDto] })
  listar(): Promise<MedioPago[]> {
    return this.catalogos.listarMediosPago();
  }

  @Patch(":codigo/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Activar o desactivar medio de pago" })
  @ZodResponse({ status: 200, description: "Medio de pago actualizado", type: MedioPagoDto })
  cambiarActivacion(@Param("codigo") codigo: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<MedioPago> {
    return this.catalogos.cambiarActivacionMedioPago(codigo, entrada.activo, actor);
  }
}

@ApiTags("Tipos de comprobante")
@Controller("voucher-types")
export class VoucherTypesController {
  constructor(private readonly catalogos: CatalogsService) {}

  @Get()
  @ApiProtegida()
  @ApiOperation({ summary: "Listar tipos de comprobante", description: "Tipos usados en el analítico: Tabla 10 de SUNAT y códigos internos." })
  @ZodResponse({ status: 200, description: "Tipos de comprobante", type: [TipoComprobanteDto] })
  listar(): Promise<TipoComprobante[]> {
    return this.catalogos.listarTiposComprobante();
  }

  @Post()
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Crear tipo de comprobante" })
  @ZodResponse({ status: 201, description: "Tipo de comprobante creado", type: TipoComprobanteDto })
  crear(@Body() entrada: CrearTipoComprobanteDto, @UsuarioActual() actor: UsuarioSesion): Promise<TipoComprobante> {
    return this.catalogos.crearTipoComprobante(entrada, actor);
  }

  @Patch(":codigo/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Activar o desactivar tipo de comprobante" })
  @ZodResponse({ status: 200, description: "Tipo de comprobante actualizado", type: TipoComprobanteDto })
  cambiarActivacion(@Param("codigo") codigo: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<TipoComprobante> {
    return this.catalogos.cambiarActivacionTipoComprobante(codigo, entrada.activo, actor);
  }
}
