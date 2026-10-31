export function urlPublica(ruta: string): URL {
  const base = process.env.APP_URL;
  if (!base) {
    throw new Error("Falta la variable de entorno APP_URL");
  }
  return new URL(ruta, base);
}
