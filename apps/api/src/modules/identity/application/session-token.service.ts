import { Injectable } from "@nestjs/common";
import { esRol, type UsuarioSesion } from "@conciliacion/contracts";
import { errors, jwtVerify, SignJWT } from "jose";
import { AppConfigService } from "../../../shared/config/app-config.service";

@Injectable()
export class SessionTokenService {
  constructor(private readonly config: AppConfigService) {}

  async firmar(usuario: UsuarioSesion): Promise<{ token: string; expiraEn: Date }> {
    const expiraEn = new Date(Date.now() + this.config.duracionSesionSegundos * 1000);
    const token = await new SignJWT({ nombre: usuario.nombre, rol: usuario.rol })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(usuario.id)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiraEn.getTime() / 1000))
      .sign(this.config.secretoSesion);
    return { token, expiraEn };
  }

  async verificar(token: string): Promise<UsuarioSesion | null> {
    try {
      const { payload } = await jwtVerify(token, this.config.secretoSesion, { algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.nombre !== "string" || !esRol(payload.rol)) {
        return null;
      }
      return { id: payload.sub, nombre: payload.nombre, rol: payload.rol };
    } catch (error: unknown) {
      if (error instanceof errors.JOSEError) {
        return null;
      }
      throw error;
    }
  }
}
