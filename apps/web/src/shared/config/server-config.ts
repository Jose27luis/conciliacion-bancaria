import "server-only";

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export const configuracion = {
  urlApi: requerida("API_URL").replace(/\/+$/, ""),
  cookieSegura: requerida("APP_URL").startsWith("https://"),
};
