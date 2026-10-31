import {
  activacionSchema,
  cambiarPasswordSchema,
  crearUsuarioSchema,
  editarUsuarioSchema,
  loginRespuestaSchema,
  loginSchema,
  usuarioSchema,
  usuarioSesionSchema,
} from "@conciliacion/contracts";
import { createZodDto } from "nestjs-zod";

export class LoginDto extends createZodDto(loginSchema) {}
export class LoginRespuestaDto extends createZodDto(loginRespuestaSchema) {}
export class UsuarioSesionDto extends createZodDto(usuarioSesionSchema) {}
export class UsuarioDto extends createZodDto(usuarioSchema) {}
export class CrearUsuarioDto extends createZodDto(crearUsuarioSchema) {}
export class EditarUsuarioDto extends createZodDto(editarUsuarioSchema) {}
export class CambiarPasswordDto extends createZodDto(cambiarPasswordSchema) {}
export class ActivacionDto extends createZodDto(activacionSchema) {}
