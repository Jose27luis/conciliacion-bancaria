import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ROLES_REGISTRAN, type AvisosLote, type Hoja, type LoteRegistrado, type UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { LedgerService } from "../application/ledger.service";
import { AvisosLoteDto, HojaDto, HojaQueryDto, LoteRegistradoDto, LoteVouchersDto } from "./ledger.dto";

@ApiTags("Registro de movimientos")
@Controller("ledger")
export class LedgerController {
  constructor(private readonly libro: LedgerService) {}

  @Get("sheet")
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Hoja de una cuenta en un mes", description: "Vouchers registrados de la cuenta en el periodo y el próximo correlativo del mes." })
  @ZodResponse({ status: 200, description: "Hoja de captura", type: HojaDto })
  hoja(@Query() consulta: HojaQueryDto): Promise<Hoja> {
    return this.libro.hoja(consulta);
  }

  @Post("vouchers/warnings")
  @Roles(...ROLES_REGISTRAN)
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Avisos de posibles duplicados",
    description: "No guarda nada. Avisa si el analítico ya existe o si hay un movimiento con el mismo documento, fecha e importe en la cuenta.",
  })
  @ZodResponse({ status: 200, description: "Avisos por voucher del lote", type: AvisosLoteDto })
  async avisos(@Body() lote: LoteVouchersDto): Promise<AvisosLote> {
    return { avisos: await this.libro.avisos(lote) };
  }

  @Post("vouchers")
  @Roles(...ROLES_REGISTRAN)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({
    summary: "Registrar vouchers",
    description:
      "Registra el lote en una transacción. Asigna el correlativo MM-NNNNN del mes, compartido por todas las cuentas. Crea los proveedores nuevos y aprende sus detalles. Si un voucher tiene errores no se registra ninguno.",
  })
  @ZodResponse({ status: 201, description: "Vouchers registrados", type: LoteRegistradoDto })
  registrar(@Body() lote: LoteVouchersDto, @UsuarioActual() actor: UsuarioSesion): Promise<LoteRegistrado> {
    return this.libro.registrar(lote, actor);
  }
}
