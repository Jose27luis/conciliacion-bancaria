import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from "@nestjs/common";
import { ApiNoContentResponse, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { LoginRespuesta, UsuarioSesion } from "@conciliacion/contracts";
import type { Response } from "express";
import { ZodResponse } from "nestjs-zod";
import { AppConfigService } from "../../../shared/config/app-config.service";
import { ApiProtegida, ErrorApiDto } from "../../../shared/http/api-docs";
import { LoginService } from "../application/login.service";
import { Publico, UsuarioActual } from "./decorators";
import { LoginDto, LoginRespuestaDto, UsuarioSesionDto } from "./identity.dto";
import { LoginThrottlerGuard } from "./login-throttler.guard";

const LIMITE_LOGIN = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("Sesión")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly login: LoginService,
    private readonly config: AppConfigService,
  ) {}

  @Publico()
  @UseGuards(LoginThrottlerGuard)
  @Throttle(LIMITE_LOGIN)
  @Post("login")
  @ApiOperation({ summary: "Iniciar sesión", description: "Valida correo y contraseña, y deja el JWT en una cookie httpOnly." })
  @ZodResponse({ status: 200, description: "Sesión iniciada", type: LoginRespuestaDto })
  @ApiUnauthorizedResponse({ description: "Credenciales incorrectas o usuario desactivado", type: ErrorApiDto })
  @ApiTooManyRequestsResponse({ description: "Más de 10 intentos por minuto desde la misma IP", type: ErrorApiDto })
  async ingresar(@Body() entrada: LoginDto, @Res({ passthrough: true }) respuesta: Response): Promise<LoginRespuesta> {
    const sesion = await this.login.ingresar(entrada);
    respuesta.cookie(this.config.nombreCookieSesion, sesion.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.produccion,
      path: "/",
      expires: new Date(sesion.expiraEn),
    });
    return sesion;
  }

  @Publico()
  @Post("logout")
  @HttpCode(204)
  @ApiOperation({ summary: "Cerrar sesión", description: "Elimina la cookie de sesión." })
  @ApiNoContentResponse({ description: "Sesión cerrada" })
  salir(@Res({ passthrough: true }) respuesta: Response): void {
    respuesta.clearCookie(this.config.nombreCookieSesion, { path: "/" });
  }

  @Get("me")
  @ApiProtegida()
  @ApiOperation({ summary: "Usuario de la sesión", description: "Devuelve el usuario autenticado con su rol vigente." })
  @ZodResponse({ status: 200, description: "Usuario autenticado", type: UsuarioSesionDto })
  yo(@UsuarioActual() usuario: UsuarioSesion): UsuarioSesion {
    return usuario;
  }
}
