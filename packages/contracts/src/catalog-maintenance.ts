import { z } from "zod";
import { paginaQuerySchema, paginaSchema } from "./common";
import { entidadSchema } from "./ledger";

const codigoCuentaOpcional = z
  .string()
  .trim()
  .regex(/^\d{2,8}$/, "El código de cuenta debe tener de 2 a 8 dígitos.")
  .nullable()
  .describe("Código de la cuenta en el plan contable; null para quitar");

export const entidadesQuerySchema = paginaQuerySchema.extend({
  q: z.string().trim().max(120).optional().describe("Prefijo del documento o parte de la razón social"),
});
export type EntidadesQuery = z.infer<typeof entidadesQuerySchema>;

export const entidadResumenSchema = entidadSchema.extend({
  detallesActivos: z.number().int().describe("Detalles frecuentes activos"),
});
export type EntidadResumen = z.infer<typeof entidadResumenSchema>;

export const paginaEntidadesSchema = paginaSchema(entidadResumenSchema);

export const detalleMaestroSchema = z.object({
  id: z.uuid(),
  detalle: z.string(),
  cuentaContableCodigo: z.string(),
  cuentaContableDenominacion: z.string(),
  medioPagoCodigo: z.string(),
  usos: z.number().int(),
  activo: z.boolean(),
  ultimoUso: z.iso.datetime(),
});
export type DetalleMaestro = z.infer<typeof detalleMaestroSchema>;

export const entidadMaestroSchema = entidadSchema.extend({
  detalles: z.array(detalleMaestroSchema),
});
export type EntidadMaestro = z.infer<typeof entidadMaestroSchema>;

export const editarEntidadSchema = z.object({
  razonSocial: z.string().trim().min(2, "Escribe la razón social.").max(200).describe("Razón social corregida"),
});
export type EditarEntidadEntrada = z.infer<typeof editarEntidadSchema>;

export const editarDetalleSchema = z.object({
  detalle: z.string().trim().min(1, "Escribe el detalle.").max(250).describe("Texto del detalle"),
  cuentaContableCodigo: z.string().trim().regex(/^\d{2,8}$/, "Elige una cuenta contable.").describe("CTA que se propone con este detalle"),
  medioPagoCodigo: z.string().trim().regex(/^\d{3}$/, "Elige un medio de pago.").describe("COD que se propone con este detalle"),
});
export type EditarDetalleEntrada = z.infer<typeof editarDetalleSchema>;

export const destinosCuentaSchema = z.object({
  destinoDebeCodigo: codigoCuentaOpcional,
  destinoHaberCodigo: codigoCuentaOpcional,
});
export type DestinosCuentaEntrada = z.infer<typeof destinosCuentaSchema>;

export const TIPOS_MOVIMIENTO = ["EGRESO", "INGRESO"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const ATAJO_MINIMO = 1;
export const ATAJO_MAXIMO = 9;

export const plantillaSchema = z.object({
  id: z.uuid(),
  atajo: z.number().int().nullable().describe("Número de la tecla Alt; null si la plantilla está desactivada"),
  etiqueta: z.string(),
  entidad: z.object({ id: z.uuid(), numeroDocumento: z.string(), razonSocial: z.string() }),
  detalle: z.string(),
  cuentaContableCodigo: z.string(),
  medioPagoCodigo: z.string(),
  analitico: z.string().describe("--, prefijo como 01- o vacío"),
  tipo: z.enum(TIPOS_MOVIMIENTO),
  importe: z.string().nullable(),
  activa: z.boolean(),
});
export type Plantilla = z.infer<typeof plantillaSchema>;

export const guardarPlantillaSchema = z.object({
  atajo: z.number().int().min(ATAJO_MINIMO).max(ATAJO_MAXIMO).describe("Tecla Alt+1 a Alt+9"),
  etiqueta: z.string().trim().min(2, "Escribe un nombre corto.").max(40).describe("Nombre visible del atajo"),
  documento: z.string().trim().min(4, "Escribe el RUC o DNI.").max(15).describe("Documento de un proveedor ya registrado"),
  detalle: z.string().trim().min(1, "Escribe el detalle.").max(250),
  cuentaContableCodigo: z.string().trim().regex(/^\d{2,8}$/, "Elige una cuenta contable."),
  medioPagoCodigo: z.string().trim().regex(/^\d{3}$/, "Elige un medio de pago."),
  analitico: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(--|[0-9A-Z]{2,4}-)?$/, "Usa --, un prefijo como 01- o déjalo vacío.")
    .describe("--, prefijo del tipo de comprobante o vacío"),
  tipo: z.enum(TIPOS_MOVIMIENTO),
  importe: z
    .string()
    .trim()
    .regex(/^(\d{1,12}(\.\d{1,2})?)?$/, "El importe debe ser un número con hasta 2 decimales.")
    .describe("Importe fijo opcional; vacío si cambia cada vez"),
});
export type GuardarPlantillaEntrada = z.infer<typeof guardarPlantillaSchema>;
