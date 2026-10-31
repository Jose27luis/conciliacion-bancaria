export const ROLES = ["ADMIN", "CONTADOR", "ASISTENTE", "LECTOR"] as const;
export type Rol = (typeof ROLES)[number];

export const ROLES_EDITAN_MAESTROS: readonly Rol[] = ["ADMIN", "CONTADOR"];

export const ETIQUETAS_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  CONTADOR: "Contador",
  ASISTENTE: "Asistente",
  LECTOR: "Solo lectura",
};

export const MONEDAS = ["PEN", "USD"] as const;
export type Moneda = (typeof MONEDAS)[number];

export const ETIQUETAS_MONEDA: Record<Moneda, string> = {
  PEN: "Soles (S/)",
  USD: "Dólares (US$)",
};

export const TIPOS_CUENTA_TESORERIA = ["BANCO", "CAJA"] as const;
export type TipoCuentaTesoreria = (typeof TIPOS_CUENTA_TESORERIA)[number];

export const ETIQUETAS_TIPO_CUENTA_TESORERIA: Record<TipoCuentaTesoreria, string> = {
  BANCO: "Cuenta bancaria",
  CAJA: "Caja",
};

export const TIPOS_CUENTA_CONTABLE = ["BAL", "RNA", "RNF", "NIN", "RFU", "ORD"] as const;
export type TipoCuentaContable = (typeof TIPOS_CUENTA_CONTABLE)[number];

export const CLASES_CUENTA_CONTABLE = ["ORDEN", "ACTIVO", "PASIVO", "PATRIMONIO", "GASTO", "INGRESO", "GESTION"] as const;
export type ClaseCuentaContable = (typeof CLASES_CUENTA_CONTABLE)[number];

export const ETIQUETAS_CLASE_CUENTA_CONTABLE: Record<ClaseCuentaContable, string> = {
  ORDEN: "Orden",
  ACTIVO: "Activo",
  PASIVO: "Pasivo",
  PATRIMONIO: "Patrimonio",
  GASTO: "Gasto",
  INGRESO: "Ingreso",
  GESTION: "Gestión",
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && ROLES.some((rol) => rol === valor);
}
