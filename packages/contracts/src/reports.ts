import { z } from "zod";
import { ESTADOS_PERIODO, MONEDAS } from "./enums";

const monto = z.string().describe("Importe con 2 decimales");

export const aperturaCuentaSchema = z.object({
  saldo: z
    .string()
    .trim()
    .regex(/^-?\d{1,12}(\.\d{1,2})?$/, "El saldo debe ser un número con hasta 2 decimales; puede ser negativo.")
    .describe("Saldo al inicio del mes de apertura, en la moneda de la cuenta"),
  anio: z.number().int().min(2000).max(2100).describe("Año del mes de apertura"),
  mes: z.number().int().min(1).max(12).describe("Mes de apertura: el saldo es al día 1 de este mes"),
});
export type AperturaCuentaEntrada = z.infer<typeof aperturaCuentaSchema>;

export const periodoAnualSchema = z.object({
  anio: z.number().int(),
  mes: z.number().int(),
  estado: z.enum(ESTADOS_PERIODO),
  vouchers: z.number().int().describe("Vouchers registrados en el mes"),
  anulados: z.number().int(),
  cerradoEn: z.iso.datetime().nullable(),
  cerradoPorNombre: z.string().nullable(),
});
export type PeriodoAnual = z.infer<typeof periodoAnualSchema>;

export const periodosQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
});

export const reabrirPeriodoSchema = z.object({
  motivo: z.string().trim().min(5, "Explica el motivo en al menos 5 caracteres.").max(250).describe("Por qué se reabre el mes"),
});
export type ReabrirPeriodoEntrada = z.infer<typeof reabrirPeriodoSchema>;

export const resumenQuerySchema = z.object({
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});
export type ResumenQuery = z.infer<typeof resumenQuerySchema>;

export const saldoCuentaSchema = z.object({
  cuentaTesoreriaId: z.uuid(),
  nombre: z.string(),
  moneda: z.enum(MONEDAS),
  activa: z.boolean(),
  apertura: z.object({ anio: z.number().int(), mes: z.number().int(), saldo: monto }).nullable(),
  saldoInicial: monto.nullable().describe("null si no hay saldo de apertura o el mes es anterior a la apertura"),
  ingresos: monto,
  egresos: monto,
  saldoFinal: monto.nullable(),
  vouchers: z.number().int(),
  anulados: z.number().int(),
});
export type SaldoCuenta = z.infer<typeof saldoCuentaSchema>;

export const resumenMensualSchema = z.object({
  periodo: periodoAnualSchema,
  cuentas: z.array(saldoCuentaSchema),
});
export type ResumenMensual = z.infer<typeof resumenMensualSchema>;

export const resumenAnualSchema = z.object({
  anio: z.number().int(),
  cuentas: z.array(
    z.object({
      cuentaTesoreriaId: z.uuid(),
      nombre: z.string(),
      moneda: z.enum(MONEDAS),
      meses: z.array(z.object({ mes: z.number().int(), ingresos: monto, egresos: monto, saldoFinal: monto.nullable() })),
    }),
  ),
});
export type ResumenAnual = z.infer<typeof resumenAnualSchema>;
