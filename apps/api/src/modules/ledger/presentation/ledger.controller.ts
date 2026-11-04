import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, StreamableFile } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiProduces, ApiTags } from "@nestjs/swagger";
import { ROLES_ORDENAN_HOJA, ROLES_REGISTRAN, type AvisosLote, type Hoja, type Libro, type LoteRegistrado, type UsuarioSesion, type Voucher } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { LedgerService } from "../application/ledger.service";
import {
  AnularVoucherDto,
  AvisosLoteDto,
  ExportacionQueryDto,
  HojaDto,
  HojaQueryDto,
  LibroDto,
  LibroQueryDto,
  LoteRegistradoDto,
  LoteVouchersDto,
  OrdenHojaDto,
  VoucherDto,
  VoucherEntradaDto,
} from "./ledger.dto";

const TIPO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PARAM_ID = { name: "id", description: "Identificador del voucher (UUID)" };

@ApiTags("Registro de movimientos")
@Controller("ledger")
export class LedgerController {
  constructor(private readonly libro: LedgerService) {}

  @Get("sheet")
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Hoja de una cuenta en un mes", description: "Vouchers de la cuenta en el periodo, incluidos los anulados, y el próximo correlativo del mes." })
  @ZodResponse({ status: 200, description: "Hoja de captura", type: HojaDto })
  hoja(@Query() consulta: HojaQueryDto): Promise<Hoja> {
    return this.libro.hoja(consulta);
  }

  @Get("vouchers")
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Libro de movimientos",
    description: "Vouchers del mes con sus líneas, filtrables por cuenta, estado y texto. Incluye totales por moneda de los registrados.",
  })
  @ZodResponse({ status: 200, description: "Página del libro", type: LibroDto })
  listar(@Query() consulta: LibroQueryDto): Promise<Libro> {
    return this.libro.libro(consulta);
  }

  @Get("export.xlsx")
  @ApiProtegida("validacion", "noEncontrado")
  @ApiProduces(TIPO_XLSX)
  @ApiOperation({
    summary: "Exportar a Excel",
    description: "Libro .xlsx con las columnas del Excel modelo. Una hoja por cuenta de tesorería, o solo la indicada. Excluye los anulados.",
  })
  @ApiOkResponse({ description: "Archivo .xlsx", schema: { type: "string", format: "binary" } })
  async exportar(@Query() consulta: ExportacionQueryDto): Promise<StreamableFile> {
    const archivo = await this.libro.exportar(consulta);
    return new StreamableFile(archivo.contenido, { type: TIPO_XLSX, disposition: `attachment; filename="${archivo.nombre}"`, length: archivo.contenido.length });
  }

  @Get("vouchers/:id")
  @ApiParam(PARAM_ID)
  @ApiProtegida("noEncontrado")
  @ApiOperation({ summary: "Obtener un voucher" })
  @ZodResponse({ status: 200, description: "Voucher con sus líneas vigentes", type: VoucherDto })
  obtener(@Param("id", UuidParamPipe) id: string): Promise<Voucher> {
    return this.libro.obtener(id);
  }

  @Post("vouchers/warnings")
  @HttpCode(200)
  @Roles(...ROLES_REGISTRAN)
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Avisos de posibles duplicados",
    description: "No guarda nada. Avisa si el analítico ya existe o si hay un movimiento con el mismo documento, fecha e importe en la cuenta. Ignora el voucher indicado en voucherId.",
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

  @Put("sheet/order")
  @Roles(...ROLES_ORDENAN_HOJA)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({
    summary: "Reordenar la hoja",
    description:
      "Recibe todos los vouchers de la cuenta y el mes en el orden nuevo y les reparte sus mismos números de menor a mayor en ese orden. No toca los números de otras cuentas. Los anulados no cambian de número. Solo en meses abiertos; cada cambio queda en auditoría.",
  })
  @ZodResponse({ status: 200, description: "Hoja con la numeración nueva", type: HojaDto })
  ordenar(@Body() entrada: OrdenHojaDto, @UsuarioActual() actor: UsuarioSesion): Promise<Hoja> {
    return this.libro.ordenar(entrada, actor);
  }

  @Put("vouchers/:id")
  @Roles(...ROLES_REGISTRAN)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({
    summary: "Editar voucher",
    description:
      "Reemplaza cabecera y líneas conservando el número. Solo en meses abiertos y sin cambiar de mes. Las líneas quitadas quedan como no vigentes. Un asistente solo edita lo que registró.",
  })
  @ZodResponse({ status: 200, description: "Voucher editado", type: VoucherDto })
  editar(@Param("id", UuidParamPipe) id: string, @Body() entrada: VoucherEntradaDto, @UsuarioActual() actor: UsuarioSesion): Promise<Voucher> {
    return this.libro.editar(id, entrada, actor);
  }

  @Post("vouchers/:id/void")
  @HttpCode(200)
  @Roles(...ROLES_REGISTRAN)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Anular voucher", description: "Lo marca como anulado con su motivo. No se borra y su número no se reutiliza." })
  @ZodResponse({ status: 200, description: "Voucher anulado", type: VoucherDto })
  anular(@Param("id", UuidParamPipe) id: string, @Body() entrada: AnularVoucherDto, @UsuarioActual() actor: UsuarioSesion): Promise<Voucher> {
    return this.libro.anular(id, entrada, actor);
  }
}
