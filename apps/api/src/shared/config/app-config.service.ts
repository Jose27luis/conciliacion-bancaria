import { Injectable } from "@nestjs/common";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

function secretoSeguro(nombre: string): Uint8Array {
  const valor = requerida(nombre);
  if (valor.length < 32) {
    throw new Error(`${nombre} debe tener al menos 32 caracteres`);
  }
  return new TextEncoder().encode(valor);
}

@Injectable()
export class AppConfigService {
  readonly puerto = Number(requerida("PORT"));
  readonly host = requerida("HOST");
  readonly produccion = process.env.NODE_ENV === "production";
  readonly secretoSesion = secretoSeguro("AUTH_SECRET");
  readonly duracionSesionSegundos = 60 * 60 * 10;
  readonly nombreCookieSesion = "conciliacion_sesion";
}
