import { Body, Controller, Get, HttpCode, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiPayloadTooLargeResponse, ApiTags } from "@nestjs/swagger";
import { ROLES_EDITAN_MAESTROS, type Importacion, type ImportacionResumen, type UsuarioSesion } from "@conciliacion/contracts";
import { memoryStorage } from "multer";
import { ZodResponse } from "nestjs-zod";
import { Roles, UsuarioActual } from "../../identity";
import { ApiProtegida, ErrorApiDto } from "../../../shared/http/api-docs";
import { errores } from "../../../shared/http/api-error";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { ImportsService } from "../application/imports.service";
import { ConfirmarImportacionDto, ImportacionDto, ImportacionResumenDto } from "./imports.dto";

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
const PARAM_ID = { name: "id", description: "Identificador de la importación (UUID)" };

@ApiTags("Importación del Excel histórico")
@Roles(...ROLES_EDITAN_MAESTROS)
@Controller("imports")
export class ImportsController {
  constructor(private readonly importaciones: ImportsService) {}

  @Get()
  @ApiProtegida()
  @ApiOperation({ summary: "Historial de importaciones", description: "Las 50 más recientes." })
  @ZodResponse({ status: 200, description: "Importaciones", type: [ImportacionResumenDto] })
  listar(): Promise<ImportacionResumen[]> {
    return this.importaciones.listar();
  }

  @Post()
  @UseInterceptors(FileInterceptor("archivo", { storage: memoryStorage(), limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "Excel .xlsx con el formato del modelo: una hoja visible por cuenta y las columnas N# Voucher, Fecha, Analítico, Ruc, Razón social, Detalle, T.C, Ingreso, Egreso, CTA y COD",
    schema: { type: "object", required: ["archivo"], properties: { archivo: { type: "string", format: "binary" } } },
  })
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Subir Excel y ver vista previa",
    description: "Lee las hojas visibles, agrupa los vouchers y valida cada uno. No registra nada: guarda una vista previa para revisarla y confirmarla.",
  })
  @ApiPayloadTooLargeResponse({ description: "El archivo pesa más de 10 MB", type: ErrorApiDto })
  @ZodResponse({ status: 201, description: "Vista previa", type: ImportacionDto })
  previsualizar(@UploadedFile() archivo: Express.Multer.File | undefined, @UsuarioActual() actor: UsuarioSesion): Promise<Importacion> {
    if (!archivo) {
      throw errores.validacion("Adjunta el Excel.", { archivo: "Adjunta el Excel." });
    }
    if (!archivo.originalname.toLowerCase().endsWith(".xlsx")) {
      throw errores.validacion("El archivo debe ser .xlsx.", { archivo: "El archivo debe ser .xlsx." });
    }
    return this.importaciones.previsualizar(archivo.buffer, archivo.originalname, actor);
  }

  @Get(":id")
  @ApiParam(PARAM_ID)
  @ApiProtegida("noEncontrado")
  @ApiOperation({ summary: "Ver una importación", description: "Hojas, observaciones (hasta 500) y amarres detectados." })
  @ZodResponse({ status: 200, description: "Importación", type: ImportacionDto })
  obtener(@Param("id", UuidParamPipe) id: string): Promise<Importacion> {
    return this.importaciones.obtener(id);
  }

  @Post(":id/confirm")
  @HttpCode(200)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({
    summary: "Confirmar importación",
    description:
      "Registra los vouchers válidos con su número original en la cuenta asignada a cada hoja, aprende proveedores y detalles, ajusta el correlativo de cada mes y aplica los amarres detectados. Todo en una transacción.",
  })
  @ZodResponse({ status: 200, description: "Importación realizada", type: ImportacionDto })
  confirmar(@Param("id", UuidParamPipe) id: string, @Body() entrada: ConfirmarImportacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<Importacion> {
    return this.importaciones.confirmar(id, entrada, actor);
  }

  @Post(":id/discard")
  @HttpCode(200)
  @ApiParam(PARAM_ID)
  @ApiProtegida("noEncontrado", "conflicto")
  @ApiOperation({ summary: "Descartar vista previa", description: "La marca como descartada. No se borra." })
  @ZodResponse({ status: 200, description: "Importación descartada", type: ImportacionDto })
  descartar(@Param("id", UuidParamPipe) id: string, @UsuarioActual() actor: UsuarioSesion): Promise<Importacion> {
    return this.importaciones.descartar(id, actor);
  }
}
