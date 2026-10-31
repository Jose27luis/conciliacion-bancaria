import { Injectable } from "@nestjs/common";
import type { LoginEntrada, LoginRespuesta, UsuarioSesion } from "@conciliacion/contracts";
import { errores } from "../../../shared/http/api-error";
import { verificarPassword } from "../domain/password";
import { IdentityRepository } from "../infrastructure/identity.repository";
import { SessionTokenService } from "./session-token.service";

@Injectable()
export class LoginService {
  constructor(
    private readonly repositorio: IdentityRepository,
    private readonly tokens: SessionTokenService,
  ) {}

  async ingresar(entrada: LoginEntrada): Promise<LoginRespuesta> {
    const usuario = await this.repositorio.buscarParaLogin(entrada.email);
    const valida = usuario?.activo ? await verificarPassword(entrada.password, usuario.passwordHash) : false;
    if (!usuario || !valida) {
      throw errores.noAutorizado("El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.");
    }
    const sesion: UsuarioSesion = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    const { token, expiraEn } = await this.tokens.firmar(sesion);
    return { token, expiraEn: expiraEn.toISOString(), usuario: sesion };
  }

  async vigente(usuario: UsuarioSesion): Promise<UsuarioSesion | null> {
    const registro = await this.repositorio.buscarActivo(usuario.id);
    return registro ? { ...usuario, rol: registro.rol } : null;
  }
}
