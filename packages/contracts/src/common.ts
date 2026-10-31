import { z } from "zod";

export type ErrorApi = {
  mensaje: string;
  errores?: Record<string, string>;
};

export const errorApiSchema = z.object({
  mensaje: z.string().describe("Mensaje legible para el usuario"),
  errores: z.record(z.string(), z.string()).optional().describe("Errores por campo"),
});

export const uuidSchema = z.uuid("El identificador no es válido.");

export const activacionSchema = z.object({
  activo: z.boolean().describe("true para activar, false para desactivar"),
});
export type ActivacionEntrada = z.infer<typeof activacionSchema>;

export const paginaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1).describe("Número de página, desde 1"),
  porPagina: z.coerce.number().int().min(1).max(200).default(50).describe("Filas por página, máximo 200"),
});

export function paginaSchema<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().describe("Total de registros que cumplen el filtro"),
    pagina: z.number().int(),
    porPagina: z.number().int(),
  });
}

export type Pagina<T> = {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
};
