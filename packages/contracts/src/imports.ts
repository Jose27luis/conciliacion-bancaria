import { z } from "zod";
import { MONEDAS } from "./enums";

export const ESTADOS_IMPORTACION = ["VALIDADA", "IMPORTADA", "DESCARTADA"] as const;
export type EstadoImportacion = (typeof ESTADOS_IMPORTACION)[number];

export const NIVELES_OBSERVACION = ["error", "aviso"] as const;

export const observacionImportacionSchema = z.object({
  hoja: z.string(),
  fila: z.number().int().describe("Fila en la hoja de Excel"),
  voucher: z.string().nullable(),
  nivel: z.enum(NIVELES_OBSERVACION).describe("error: el voucher se omite; aviso: se importa"),
  mensaje: z.string(),
});
export type ObservacionImportacion = z.infer<typeof observacionImportacionSchema>;

export const hojaImportacionSchema = z.object({
  nombre: z.string(),
  moneda: z.enum(MONEDAS).describe("USD si algún tipo de cambio es distinto de 1"),
  vouchers: z.number().int().describe("Vouchers válidos que se importarán"),
  lineas: z.number().int(),
  omitidos: z.number().int().describe("Vouchers con errores que no se importarán"),
  meses: z.array(z.string()).describe("Periodos AAAA-MM presentes"),
  ingreso: z.string(),
  egreso: z.string(),
  cuentaSugeridaId: z.uuid().nullable().describe("Cuenta de tesorería con el mismo nombre y moneda"),
});
export type HojaImportacion = z.infer<typeof hojaImportacionSchema>;

export const amarreDetectadoSchema = z.object({
  cuentaContableCodigo: z.string(),
  destinoDebeCodigo: z.string(),
  destinoHaberCodigo: z.string(),
  lineas: z.number().int(),
});
export type AmarreDetectado = z.infer<typeof amarreDetectadoSchema>;

export const importacionSchema = z.object({
  id: z.uuid(),
  archivo: z.string(),
  estado: z.enum(ESTADOS_IMPORTACION),
  hojas: z.array(hojaImportacionSchema),
  observaciones: z.array(observacionImportacionSchema),
  totalObservaciones: z.number().int(),
  proveedoresNuevos: z.number().int(),
  amarres: z.array(amarreDetectadoSchema).describe("Amarres de destino que se configurarán en cuentas que aún no tienen"),
  importados: z.number().int().nullable(),
  creadoPorNombre: z.string(),
  creadoEn: z.iso.datetime(),
});
export type Importacion = z.infer<typeof importacionSchema>;

export const importacionResumenSchema = importacionSchema.pick({ id: true, archivo: true, estado: true, importados: true, creadoPorNombre: true, creadoEn: true }).extend({
  vouchers: z.number().int(),
  omitidos: z.number().int(),
});
export type ImportacionResumen = z.infer<typeof importacionResumenSchema>;

export const confirmarImportacionSchema = z.object({
  asignaciones: z
    .array(
      z.object({
        hoja: z.string().min(1),
        cuentaTesoreriaId: z.uuid().nullable().describe("Cuenta destino; null para no importar esa hoja"),
      }),
    )
    .min(1)
    .describe("A qué cuenta de tesorería va cada hoja"),
});
export type ConfirmarImportacionEntrada = z.infer<typeof confirmarImportacionSchema>;
