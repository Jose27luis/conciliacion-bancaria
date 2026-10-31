import { Body, Controller, Get, Param, Patch, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiPayloadTooLargeResponse, ApiTags, ApiUnprocessableEntityResponse } from "@nestjs/swagger";
import {
  ROLES_EDITAN_MAESTROS,
  type CuentaContable,
  type ImportacionPlanResultado,
  type OpcionCuentaContable,
  type Pagina,
  type UsuarioSesion,
} from "@conciliacion/contracts";
import { memoryStorage } from "multer";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida, ErrorApiDto } from "../../../shared/http/api-docs";
import { errores } from "../../../shared/http/api-error";
import { ChartOfAccountsService } from "../application/chart-of-accounts.service";
import {
  ActivacionDto,
  CuentaContableDto,
  CrearCuentaContableDto,
  CuentasContablesQueryDto,
  DestinosCuentaDto,
  EditarCuentaContableDto,
  ImportacionPlanRechazoDto,
  ImportacionPlanResultadoDto,
  OpcionCuentaContableDto,
  PaginaCuentasContablesDto,
} from "./masters.dto";

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
const PARAM_CODIGO = { name: "codigo", description: "Código de la cuenta contable" };

@ApiTags("Plan contable")
@Controller("chart-of-accounts")
export class ChartOfAccountsController {
  constructor(private readonly plan: ChartOfAccountsService) {}

  @Get()
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Buscar cuentas contables", description: "Lista paginada, ordenada por código. Busca por prefijo de código o por denominación." })
  @ZodResponse({ status: 200, description: "Página de cuentas", type: PaginaCuentasContablesDto })
  listar(@Query() consulta: CuentasContablesQueryDto): Promise<Pagina<CuentaContable>> {
    return this.plan.listar(consulta);
  }

  @Get("options")
  @ApiProtegida()
  @ApiOperation({ summary: "Cuentas para registrar", description: "Todas las cuentas de movimiento activas, solo código y denominación, para autocompletar la CTA." })
  @ZodResponse({ status: 200, description: "Cuentas de movimiento activas", type: [OpcionCuentaContableDto] })
  opciones(): Promise<OpcionCuentaContable[]> {
    return this.plan.opciones();
  }

  @Get(":codigo")
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("noEncontrado")
  @ApiOperation({ summary: "Obtener una cuenta contable" })
  @ZodResponse({ status: 200, description: "Cuenta contable", type: CuentaContableDto })
  obtener(@Param("codigo") codigo: string): Promise<CuentaContable> {
    return this.plan.obtener(codigo);
  }

  @Post("import")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @UseInterceptors(FileInterceptor("archivo", { storage: memoryStorage(), limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Excel .xlsx con las columnas COD_CTA, DEN_CTA, TIP_CTA, FLAG_CUENTA_ANALITICA, FLA_CENTROCOSTO, MONEDA_CTA y CLASE",
    schema: { type: "object", required: ["archivo"], properties: { archivo: { type: "string", format: "binary" } } },
  })
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({
    summary: "Importar plan contable",
    description:
      "Crea las cuentas nuevas y actualiza las existentes. Calcula la jerarquía y las cuentas de movimiento. No elimina cuentas. Si alguna fila tiene errores no se guarda nada.",
  })
  @ApiUnprocessableEntityResponse({ description: "Filas con errores; no se guardó nada", type: ImportacionPlanRechazoDto })
  @ApiPayloadTooLargeResponse({ description: "El archivo pesa más de 5 MB", type: ErrorApiDto })
  @ZodResponse({ status: 201, description: "Resultado de la importación", type: ImportacionPlanResultadoDto })
  importar(@UploadedFile() archivo: Express.Multer.File | undefined, @UsuarioActual() actor: UsuarioSesion): Promise<ImportacionPlanResultado> {
    if (!archivo) {
      throw errores.validacion("Adjunta el archivo del plan contable.", { archivo: "Adjunta el archivo del plan contable." });
    }
    if (!archivo.originalname.toLowerCase().endsWith(".xlsx")) {
      throw errores.validacion("El archivo debe ser .xlsx.", { archivo: "El archivo debe ser .xlsx." });
    }
    return this.plan.importar(archivo.buffer, archivo.originalname, actor);
  }

  @Post()
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({
    summary: "Crear cuenta contable",
    description:
      "El padre y el nivel se calculan por el código. Si el padre era de movimiento pasa a agrupadora (se rechaza si lo usa una cuenta de tesorería o una plantilla activa). Si ya existen subcuentas del nuevo código, pasan a colgar de él.",
  })
  @ZodResponse({ status: 201, description: "Cuenta creada", type: CuentaContableDto })
  crear(@Body() entrada: CrearCuentaContableDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaContable> {
    return this.plan.crear(entrada, actor);
  }

  @Put(":codigo")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Editar cuenta contable", description: "Cambia denominación, tipo, clase, moneda y marcas. El código no se edita." })
  @ZodResponse({ status: 200, description: "Cuenta editada", type: CuentaContableDto })
  editar(@Param("codigo") codigo: string, @Body() entrada: EditarCuentaContableDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaContable> {
    return this.plan.editar(codigo, entrada, actor);
  }

  @Put(":codigo/destinations")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({
    summary: "Amarre de destino",
    description: "Cuentas de destino debe y haber de una cuenta de gasto (por ejemplo 6593 → 95 / 791). Se envían las dos o ninguna (null) para quitarlo.",
  })
  @ZodResponse({ status: 200, description: "Cuenta actualizada", type: CuentaContableDto })
  cambiarDestinos(@Param("codigo") codigo: string, @Body() entrada: DestinosCuentaDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaContable> {
    return this.plan.cambiarDestinos(codigo, entrada, actor);
  }

  @Patch(":codigo/activation")
  @Roles(...ROLES_EDITAN_MAESTROS)
  @ApiParam(PARAM_CODIGO)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Activar o desactivar cuenta contable", description: "Una cuenta desactivada no se ofrece en el registro. No se elimina." })
  @ZodResponse({ status: 200, description: "Cuenta actualizada", type: CuentaContableDto })
  cambiarActivacion(@Param("codigo") codigo: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<CuentaContable> {
    return this.plan.cambiarActivacion(codigo, entrada.activo, actor);
  }
}
