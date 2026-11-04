import { z } from "zod";
import { paginaQuerySchema, paginaSchema } from "./common";
import { ESTADOS_PERIODO, ESTADOS_VOUCHER, MONEDAS } from "./enums";
import { MAXIMO_LINEAS_VOUCHER, TIPOS_DOCUMENTO_ENTIDAD } from "./ledger-rules";

const texto = (maximo: number, descripcion: string) => z.string().max(maximo).describe(descripcion);

export const lineaEntradaSchema = z.object({
  detalle: texto(250, "Detalle o glosa de la línea"),
  ingreso: texto(20, "Importe de ingreso en la moneda de la cuenta; vacío si es egreso"),
  egreso: texto(20, "Importe de egreso en la moneda de la cuenta; vacío si es ingreso"),
  cuentaContableCodigo: texto(8, "Cuenta contable de movimiento (CTA)"),
});

export const voucherEntradaSchema = z.object({
  nroOperacion: texto(30, "Número de operación bancaria o cheque, opcional"),
  fechaOperacion: texto(10, "Fecha de operación en formato AAAA-MM-DD"),
  analitico: texto(30, "Comprobante tipo-serie-número, o -- si no hay"),
  documento: texto(20, "RUC, DNI o documento extranjero"),
  razonSocial: texto(200, "Razón social; obligatoria solo si el documento es nuevo"),
  medioPagoCodigo: texto(3, "Código de medio de pago (Tabla 1 SUNAT)"),
  tipoCambio: texto(10, "Tipo de cambio digitado; en cuentas en soles se ignora"),
  lineas: z.array(lineaEntradaSchema).min(1).max(MAXIMO_LINEAS_VOUCHER).describe("Líneas del voucher; varias si es un pago agrupado"),
  voucherId: z.uuid().optional().describe("Solo para avisos: voucher que se está editando, para no compararlo consigo mismo"),
});
export type VoucherEntrada = z.infer<typeof voucherEntradaSchema>;

export const loteVouchersSchema = z.object({
  cuentaTesoreriaId: z.uuid().describe("Cuenta de tesorería (pestaña) donde se registran"),
  anio: z.number().int().min(2000).max(2100).describe("Año del periodo que se está viendo"),
  mes: z.number().int().min(1).max(12).describe("Mes del periodo que se está viendo"),
  vouchers: z.array(voucherEntradaSchema).min(1).max(200),
});
export type LoteVouchersEntrada = z.infer<typeof loteVouchersSchema>;

export const avisoLoteSchema = z.object({
  indice: z.number().int().describe("Posición del voucher en el lote"),
  mensaje: z.string(),
});
export type AvisoLote = z.infer<typeof avisoLoteSchema>;

export const avisosLoteSchema = z.object({ avisos: z.array(avisoLoteSchema) });
export type AvisosLote = z.infer<typeof avisosLoteSchema>;

export const lineaSchema = z.object({
  id: z.uuid(),
  linea: z.number().int(),
  detalle: z.string(),
  ingreso: z.string().describe("Importe con 2 decimales"),
  egreso: z.string().describe("Importe con 2 decimales"),
  cuentaContableCodigo: z.string(),
  cuentaContableDenominacion: z.string(),
});
export type Linea = z.infer<typeof lineaSchema>;

export const entidadSchema = z.object({
  id: z.uuid(),
  tipoDocumento: z.enum(TIPOS_DOCUMENTO_ENTIDAD),
  numeroDocumento: z.string(),
  razonSocial: z.string(),
  usos: z.number().int(),
});
export type Entidad = z.infer<typeof entidadSchema>;

export const FUENTES_CONSULTA_DOCUMENTO = ["SUNAT", "RENIEC"] as const;

export const consultaDocumentoSchema = z.object({
  tipoDocumento: z.enum(["RUC", "DNI"]).describe("Tipo de documento consultado"),
  numeroDocumento: z.string().describe("RUC de 11 dígitos o DNI de 8"),
  razonSocial: z.string().describe("Razón social del RUC o nombre completo del DNI"),
  estado: z.string().nullable().describe("Estado del contribuyente en SUNAT, por ejemplo ACTIVO o BAJA DE OFICIO"),
  condicion: z.string().nullable().describe("Condición del domicilio en SUNAT, por ejemplo HABIDO o NO HABIDO"),
  direccion: z.string().nullable().describe("Domicilio fiscal"),
  fuente: z.enum(FUENTES_CONSULTA_DOCUMENTO).describe("SUNAT para RUC, RENIEC para DNI"),
});
export type ConsultaDocumento = z.infer<typeof consultaDocumentoSchema>;

export const voucherSchema = z.object({
  id: z.uuid(),
  codigo: z.string().describe("MM-NNNNN"),
  numero: z.number().int(),
  anio: z.number().int(),
  mes: z.number().int(),
  cuentaTesoreriaId: z.uuid(),
  cuentaTesoreriaNombre: z.string(),
  moneda: z.enum(MONEDAS),
  fechaOperacion: z.string(),
  nroOperacion: z.string().nullable(),
  analitico: z.string(),
  entidad: entidadSchema,
  medioPagoCodigo: z.string(),
  medioPagoDescripcion: z.string(),
  tipoCambio: z.string().describe("Tipo de cambio con 3 decimales"),
  estado: z.enum(ESTADOS_VOUCHER),
  motivoAnulacion: z.string().nullable(),
  lineas: z.array(lineaSchema),
  creadoPorId: z.uuid(),
  creadoPorNombre: z.string(),
  creadoEn: z.iso.datetime(),
});
export type Voucher = z.infer<typeof voucherSchema>;

export const anularVoucherSchema = z.object({
  motivo: z.string().trim().min(5, "Explica el motivo en al menos 5 caracteres.").max(250).describe("Motivo de la anulación"),
});
export type AnularVoucherEntrada = z.infer<typeof anularVoucherSchema>;

export const FILTROS_ESTADO_VOUCHER = ["REGISTRADO", "ANULADO", "TODOS"] as const;

export const libroQuerySchema = paginaQuerySchema.extend({
  cuenta: z.uuid().optional().describe("Cuenta de tesorería; sin valor, todas"),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  q: z.string().trim().max(120).optional().describe("Voucher MM-NNNNN, documento, razón social, analítico o detalle"),
  estado: z.enum(FILTROS_ESTADO_VOUCHER).default("REGISTRADO").describe("REGISTRADO, ANULADO o TODOS"),
});
export type LibroQuery = z.infer<typeof libroQuerySchema>;

export const totalMonedaSchema = z.object({
  moneda: z.enum(MONEDAS),
  ingreso: z.string(),
  egreso: z.string(),
});

export const libroSchema = paginaSchema(voucherSchema).extend({
  totales: z.array(totalMonedaSchema).describe("Totales de los vouchers registrados que cumplen el filtro, por moneda"),
});
export type Libro = z.infer<typeof libroSchema>;

export const exportacionQuerySchema = z.object({
  cuenta: z.uuid().optional().describe("Cuenta de tesorería; sin valor, una hoja por cada cuenta"),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});
export type ExportacionQuery = z.infer<typeof exportacionQuerySchema>;

export const loteRegistradoSchema = z.object({ vouchers: z.array(voucherSchema) });
export type LoteRegistrado = z.infer<typeof loteRegistradoSchema>;

export const periodoSchema = z.object({
  anio: z.number().int(),
  mes: z.number().int(),
  estado: z.enum(ESTADOS_PERIODO),
  proximoNumero: z.number().int().describe("Próximo correlativo del mes, compartido por todas las cuentas"),
});
export type Periodo = z.infer<typeof periodoSchema>;

export const hojaQuerySchema = z.object({
  cuenta: z.uuid().describe("Cuenta de tesorería"),
  anio: z.coerce.number().int().min(2000).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
});
export type HojaQuery = z.infer<typeof hojaQuerySchema>;

export const ordenHojaSchema = z.object({
  cuentaTesoreriaId: z.uuid().describe("Cuenta de tesorería (pestaña) que se reordena"),
  anio: z.number().int().min(2000).max(2100).describe("Año del periodo"),
  mes: z.number().int().min(1).max(12).describe("Mes del periodo"),
  voucherIds: z.array(z.uuid()).min(1).max(5000).describe("Todos los vouchers vigentes (no anulados) de la hoja en el orden nuevo; los números se reparten de menor a mayor en ese orden"),
});
export type OrdenHojaEntrada = z.infer<typeof ordenHojaSchema>;

export const hojaSchema = z.object({
  cuenta: z.object({ id: z.uuid(), nombre: z.string(), moneda: z.enum(MONEDAS) }),
  periodo: periodoSchema,
  vouchers: z.array(voucherSchema),
});
export type Hoja = z.infer<typeof hojaSchema>;

export const detalleFrecuenteSchema = z.object({
  detalle: z.string(),
  cuentaContableCodigo: z.string(),
  medioPagoCodigo: z.string(),
  usos: z.number().int(),
});
export type DetalleFrecuente = z.infer<typeof detalleFrecuenteSchema>;

export const entidadConHistorialSchema = entidadSchema.extend({
  detalles: z.array(detalleFrecuenteSchema).describe("Detalles usados con esta entidad, del más usado al menos usado"),
});
export type EntidadConHistorial = z.infer<typeof entidadConHistorialSchema>;

export const busquedaEntidadesQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).describe("Prefijo del documento o parte de la razón social"),
});

export const opcionCuentaContableSchema = z.object({ codigo: z.string(), denominacion: z.string() });
export type OpcionCuentaContable = z.infer<typeof opcionCuentaContableSchema>;
