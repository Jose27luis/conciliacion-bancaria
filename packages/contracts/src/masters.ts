import { z } from "zod";
import { paginaQuerySchema, paginaSchema } from "./common";
import { CLASES_CUENTA_CONTABLE, MONEDAS, TIPOS_CUENTA_CONTABLE, TIPOS_CUENTA_TESORERIA } from "./enums";

const codigoCuenta = z
  .string()
  .trim()
  .regex(/^\d{2,8}$/, "El código de cuenta debe tener de 2 a 8 dígitos.")
  .describe("Código de la cuenta en el plan contable");

const booleanoQuery = z
  .enum(["true", "false"])
  .transform((valor) => valor === "true")
  .optional();

export const cuentaContableSchema = z.object({
  codigo: z.string(),
  denominacion: z.string(),
  padreCodigo: z.string().nullable(),
  nivel: z.number().int().describe("1 para las cuentas de 2 dígitos, aumenta con cada subcuenta"),
  deMovimiento: z.boolean().describe("true si no tiene subcuentas y puede usarse en movimientos"),
  tipo: z.enum(TIPOS_CUENTA_CONTABLE),
  clase: z.enum(CLASES_CUENTA_CONTABLE),
  analitica: z.boolean(),
  centroCosto: z.boolean(),
  moneda: z.enum(MONEDAS),
  destinoDebeCodigo: z.string().nullable(),
  destinoHaberCodigo: z.string().nullable(),
  activa: z.boolean(),
});
export type CuentaContable = z.infer<typeof cuentaContableSchema>;

export const cuentasContablesQuerySchema = paginaQuerySchema.extend({
  q: z.string().trim().max(120).optional().describe("Busca por código (prefijo) o por denominación"),
  prefijo: z.string().trim().regex(/^\d{1,8}$/).optional().describe("Solo cuentas cuyo código empieza con este prefijo"),
  movimiento: booleanoQuery.describe("true para solo cuentas de movimiento"),
  activa: booleanoQuery.describe("Filtra por estado"),
});
export type CuentasContablesQuery = z.infer<typeof cuentasContablesQuerySchema>;

export const paginaCuentasContablesSchema = paginaSchema(cuentaContableSchema);

export const importacionPlanFilaErrorSchema = z.object({
  fila: z.number().int().describe("Número de fila en la hoja de Excel"),
  mensaje: z.string(),
});
export type ImportacionPlanFilaError = z.infer<typeof importacionPlanFilaErrorSchema>;

export const importacionPlanResultadoSchema = z.object({
  leidas: z.number().int().describe("Cuentas leídas del archivo"),
  creadas: z.number().int(),
  actualizadas: z.number().int(),
  sinCambios: z.number().int(),
});
export type ImportacionPlanResultado = z.infer<typeof importacionPlanResultadoSchema>;

export const importacionPlanRechazoSchema = z.object({
  mensaje: z.string(),
  filas: z.array(importacionPlanFilaErrorSchema),
});
export type ImportacionPlanRechazo = z.infer<typeof importacionPlanRechazoSchema>;

export const medioPagoSchema = z.object({
  codigo: z.string().describe("Código de la Tabla 1 de SUNAT"),
  descripcion: z.string(),
  activo: z.boolean(),
});
export type MedioPago = z.infer<typeof medioPagoSchema>;

export const tipoComprobanteSchema = z.object({
  codigo: z.string().describe("Código de la Tabla 10 de SUNAT o código interno"),
  descripcion: z.string(),
  activo: z.boolean(),
});
export type TipoComprobante = z.infer<typeof tipoComprobanteSchema>;

export const crearTipoComprobanteSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]{2,4}$/, "El código debe tener de 2 a 4 letras o números.")
    .describe("Código del tipo de comprobante"),
  descripcion: z.string().trim().min(3, "Escribe la descripción.").max(120).describe("Descripción"),
});
export type CrearTipoComprobanteEntrada = z.infer<typeof crearTipoComprobanteSchema>;

export const cuentaTesoreriaSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  tipo: z.enum(TIPOS_CUENTA_TESORERIA),
  banco: z.string().nullable(),
  numeroCuenta: z.string().nullable(),
  moneda: z.enum(MONEDAS),
  cuentaContableCodigo: z.string(),
  cuentaContableDenominacion: z.string(),
  orden: z.number().int(),
  activa: z.boolean(),
  saldoApertura: z.string().nullable().describe("Saldo al inicio del mes de apertura"),
  aperturaAnio: z.number().int().nullable(),
  aperturaMes: z.number().int().nullable(),
});
export type CuentaTesoreria = z.infer<typeof cuentaTesoreriaSchema>;

export const guardarCuentaTesoreriaSchema = z
  .object({
    nombre: z.string().trim().min(3, "Escribe el nombre de la cuenta.").max(60).describe("Nombre visible, por ejemplo CTA CTE SOLES"),
    tipo: z.enum(TIPOS_CUENTA_TESORERIA).describe("BANCO o CAJA"),
    banco: z.string().trim().max(80).nullable().describe("Nombre del banco, obligatorio si el tipo es BANCO"),
    numeroCuenta: z
      .string()
      .trim()
      .regex(/^[0-9-]{6,30}$/, "El número de cuenta solo admite dígitos y guiones.")
      .nullable()
      .describe("Número de cuenta bancaria"),
    moneda: z.enum(MONEDAS).describe("Moneda de la cuenta"),
    cuentaContableCodigo: codigoCuenta,
    orden: z.number().int().min(0).max(999).describe("Orden en las pestañas del registro rápido"),
  })
  .superRefine((valor, contexto) => {
    if (valor.tipo === "BANCO" && !valor.banco) {
      contexto.addIssue({ code: "custom", path: ["banco"], message: "Escribe el nombre del banco." });
    }
  });
export type GuardarCuentaTesoreriaEntrada = z.infer<typeof guardarCuentaTesoreriaSchema>;
