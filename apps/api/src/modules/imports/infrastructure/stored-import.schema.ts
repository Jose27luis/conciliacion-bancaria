import { amarreDetectadoSchema, hojaImportacionSchema, MONEDAS, observacionImportacionSchema } from "@conciliacion/contracts";
import { z } from "zod";

const lineaGuardadaSchema = z.object({
  fila: z.number().int(),
  detalle: z.string(),
  ingreso: z.string(),
  egreso: z.string(),
  cuentaContableCodigo: z.string(),
  destinoDebe: z.string().nullable(),
  destinoHaber: z.string().nullable(),
});

const voucherGuardadoSchema = z.object({
  hoja: z.string(),
  fila: z.number().int(),
  codigo: z.string(),
  numero: z.number().int(),
  anio: z.number().int(),
  mes: z.number().int(),
  fechaOperacion: z.string(),
  nroOperacion: z.string(),
  documento: z.string(),
  razonSocial: z.string(),
  analitico: z.string(),
  medioPagoCodigo: z.string(),
  tipoCambio: z.string(),
  lineas: z.array(lineaGuardadaSchema),
});

export const datosGuardadosSchema = z.object({
  hojas: z.array(z.object({ nombre: z.string(), moneda: z.enum(MONEDAS), vouchers: z.array(voucherGuardadoSchema) })),
});
export type DatosGuardados = z.infer<typeof datosGuardadosSchema>;

export const resumenGuardadoSchema = z.object({
  hojas: z.array(hojaImportacionSchema),
  observaciones: z.array(observacionImportacionSchema),
  proveedoresNuevos: z.number().int(),
  amarres: z.array(amarreDetectadoSchema),
  vouchers: z.number().int(),
  omitidos: z.number().int(),
});
export type ResumenGuardado = z.infer<typeof resumenGuardadoSchema>;
