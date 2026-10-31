import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Usuario, UsuarioSesion } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { UuidParamPipe } from "../../../shared/http/uuid-param.pipe";
import { UsersService } from "../application/users.service";
import { Roles, UsuarioActual } from "./decorators";
import { ActivacionDto, CambiarPasswordDto, CrearUsuarioDto, EditarUsuarioDto, UsuarioDto } from "./identity.dto";

const PARAM_ID = { name: "id", description: "Identificador del usuario (UUID)" };

@ApiTags("Usuarios")
@Roles("ADMIN")
@Controller("users")
export class UsersController {
  constructor(private readonly usuarios: UsersService) {}

  @Get()
  @ApiProtegida()
  @ApiOperation({ summary: "Listar usuarios", description: "Solo administradores. Ordena activos primero y luego por nombre." })
  @ZodResponse({ status: 200, description: "Usuarios", type: [UsuarioDto] })
  listar(): Promise<Usuario[]> {
    return this.usuarios.listar();
  }

  @Post()
  @ApiProtegida("validacion", "conflicto")
  @ApiOperation({ summary: "Crear usuario", description: "Crea un usuario activo con el rol indicado." })
  @ZodResponse({ status: 201, description: "Usuario creado", type: UsuarioDto })
  crear(@Body() entrada: CrearUsuarioDto, @UsuarioActual() actor: UsuarioSesion): Promise<Usuario> {
    return this.usuarios.crear(entrada, actor);
  }

  @Put(":id")
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Editar usuario", description: "Cambia nombre y rol. Siempre debe quedar un administrador activo." })
  @ZodResponse({ status: 200, description: "Usuario editado", type: UsuarioDto })
  editar(@Param("id", UuidParamPipe) id: string, @Body() entrada: EditarUsuarioDto, @UsuarioActual() actor: UsuarioSesion): Promise<Usuario> {
    return this.usuarios.editar(id, entrada, actor);
  }

  @Patch(":id/activation")
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado", "conflicto")
  @ApiOperation({ summary: "Activar o desactivar usuario", description: "Un usuario desactivado no puede iniciar sesión. No se elimina." })
  @ZodResponse({ status: 200, description: "Usuario actualizado", type: UsuarioDto })
  cambiarActivacion(@Param("id", UuidParamPipe) id: string, @Body() entrada: ActivacionDto, @UsuarioActual() actor: UsuarioSesion): Promise<Usuario> {
    return this.usuarios.cambiarActivacion(id, entrada.activo, actor);
  }

  @Put(":id/password")
  @HttpCode(204)
  @ApiParam(PARAM_ID)
  @ApiProtegida("validacion", "noEncontrado")
  @ApiOperation({ summary: "Cambiar contraseña", description: "El administrador asigna una contraseña nueva al usuario." })
  @ApiNoContentResponse({ description: "Contraseña cambiada" })
  cambiarPassword(@Param("id", UuidParamPipe) id: string, @Body() entrada: CambiarPasswordDto, @UsuarioActual() actor: UsuarioSesion): Promise<void> {
    return this.usuarios.cambiarPassword(id, entrada, actor);
  }
}
