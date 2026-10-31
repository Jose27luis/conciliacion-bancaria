import { Prisma } from "@prisma/client";

export const SIMILITUD_MINIMA = 0.45;
export const LARGO_MINIMO_TOLERANTE = 4;

export type BusquedaTexto = { filtro: Prisma.Sql; puntaje: Prisma.Sql };

export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function palabras(texto: string): string[] {
  return normalizarBusqueda(texto).split(" ").filter(Boolean);
}

export function soloDigitos(texto: string): string | null {
  const limpio = texto.replace(/[\s.-]/g, "");
  return /^\d+$/.test(limpio) ? limpio : null;
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

export function busquedaTolerante(columna: Prisma.Sql, texto: string): BusquedaTexto {
  const consulta = normalizarBusqueda(texto);
  const normalizada = Prisma.sql`unaccent(lower(${columna}))`;
  const buscadas = palabras(texto);
  const contiene = (palabra: string): Prisma.Sql => Prisma.sql`${normalizada} LIKE ${`%${escaparLike(palabra)}%`}`;
  const parecida = (palabra: string): Prisma.Sql =>
    palabra.length >= LARGO_MINIMO_TOLERANTE
      ? Prisma.sql`EXISTS (SELECT 1 FROM regexp_split_to_table(${normalizada}, '[^a-z0-9]+') AS palabra WHERE palabra <> '' AND levenshtein(palabra, ${palabra}) <= 1)`
      : Prisma.sql`FALSE`;
  const exactas = Prisma.join(buscadas.map(contiene), " AND ");
  const tolerantes = Prisma.join(buscadas.map((palabra) => Prisma.sql`(${contiene(palabra)} OR ${parecida(palabra)})`), " AND ");
  const similitud = Prisma.sql`word_similarity(${consulta}, ${normalizada})`;
  return {
    filtro: Prisma.sql`((${tolerantes}) OR ${similitud} >= ${SIMILITUD_MINIMA})`,
    puntaje: Prisma.sql`(CASE WHEN (${exactas}) THEN 2 WHEN (${tolerantes}) THEN 1 ELSE 0 END + ${similitud})`,
  };
}
