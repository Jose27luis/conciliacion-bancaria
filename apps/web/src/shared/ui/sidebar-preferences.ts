export const COOKIE_SIDEBAR_COLAPSADO = "conciliacion_sidebar_colapsado";
export const COOKIE_GRUPOS_CERRADOS = "conciliacion_menu_cerrados";

const UN_ANIO_SEGUNDOS = 60 * 60 * 24 * 365;

export function leerGruposCerrados(valor: string | undefined): string[] {
  if (!valor) {
    return [];
  }
  return decodeURIComponent(valor)
    .split("|")
    .filter((grupo) => grupo.length > 0);
}

export function guardarPreferencia(nombre: string, valor: string): void {
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; path=/; max-age=${UN_ANIO_SEGUNDOS}; samesite=lax`;
}
