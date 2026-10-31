import type { Voucher } from "@conciliacion/contracts";
import type { Moneda } from "@conciliacion/contracts/enums";
import type { LineaBorrador, VoucherBorrador } from "@conciliacion/contracts/rules";

export type LineaEdicion = LineaBorrador & { id: string };

export type BorradorEdicion = Omit<VoucherBorrador, "lineas"> & { id: string; lineas: LineaEdicion[]; voucherId?: string; codigo?: string };

export type EntradaConVoucher = VoucherBorrador & { voucherId?: string };

export type CampoCabecera = "nroOperacion" | "fechaOperacion" | "analitico" | "documento" | "razonSocial" | "medioPagoCodigo" | "tipoCambio";
export type CampoDeLinea = "detalle" | "ingreso" | "egreso" | "cuentaContableCodigo";
export type CampoHoja = CampoCabecera | CampoDeLinea;

export type Foco = { borradorId: string; campo: CampoHoja; linea: number };

export const ORDEN_CAMPOS: CampoHoja[] = [
  "nroOperacion",
  "fechaOperacion",
  "analitico",
  "documento",
  "razonSocial",
  "detalle",
  "tipoCambio",
  "ingreso",
  "egreso",
  "cuentaContableCodigo",
  "medioPagoCodigo",
];

export function esCampoDeLinea(campo: CampoHoja): campo is CampoDeLinea {
  return campo === "detalle" || campo === "ingreso" || campo === "egreso" || campo === "cuentaContableCodigo";
}

let secuencia = 0;

export function nuevoId(prefijo: string): string {
  secuencia += 1;
  return `${prefijo}-${Date.now().toString(36)}-${secuencia}`;
}

export function lineaVacia(): LineaEdicion {
  return { id: nuevoId("linea"), detalle: "", ingreso: "", egreso: "", cuentaContableCodigo: "" };
}

export function borradorVacio(fechaOperacion: string, tipoCambio: string): BorradorEdicion {
  return {
    id: nuevoId("borrador"),
    nroOperacion: "",
    fechaOperacion,
    analitico: "",
    documento: "",
    razonSocial: "",
    medioPagoCodigo: "",
    tipoCambio,
    lineas: [lineaVacia()],
  };
}

export function estaVacio(borrador: BorradorEdicion): boolean {
  const cabeceraVacia = [borrador.nroOperacion, borrador.analitico, borrador.documento, borrador.razonSocial, borrador.medioPagoCodigo].every((valor) => valor.trim() === "");
  return cabeceraVacia && borrador.lineas.every((linea) => [linea.detalle, linea.ingreso, linea.egreso, linea.cuentaContableCodigo].every((valor) => valor.trim() === ""));
}

export function borradorDesdeVoucher(voucher: Voucher): BorradorEdicion {
  const sinCero = (valor: string): string => (Number(valor) === 0 ? "" : valor);
  return {
    id: nuevoId("borrador"),
    voucherId: voucher.id,
    codigo: voucher.codigo,
    nroOperacion: voucher.nroOperacion ?? "",
    fechaOperacion: voucher.fechaOperacion,
    analitico: voucher.analitico,
    documento: voucher.entidad.numeroDocumento,
    razonSocial: voucher.entidad.razonSocial,
    medioPagoCodigo: voucher.medioPagoCodigo,
    tipoCambio: voucher.moneda === "PEN" ? "" : voucher.tipoCambio,
    lineas: voucher.lineas.map((linea) => ({
      id: nuevoId("linea"),
      detalle: linea.detalle,
      ingreso: sinCero(linea.ingreso),
      egreso: sinCero(linea.egreso),
      cuentaContableCodigo: linea.cuentaContableCodigo,
    })),
  };
}

export function aEntrada(borrador: BorradorEdicion, moneda: Moneda): EntradaConVoucher {
  return {
    ...(borrador.voucherId ? { voucherId: borrador.voucherId } : {}),
    nroOperacion: borrador.nroOperacion,
    fechaOperacion: borrador.fechaOperacion,
    analitico: borrador.analitico,
    documento: borrador.documento,
    razonSocial: borrador.razonSocial,
    medioPagoCodigo: borrador.medioPagoCodigo,
    tipoCambio: moneda === "PEN" ? "" : borrador.tipoCambio,
    lineas: borrador.lineas.map(({ detalle, ingreso, egreso, cuentaContableCodigo }) => ({ detalle, ingreso, egreso, cuentaContableCodigo })),
  };
}

function esLineaEdicion(valor: unknown): valor is LineaEdicion {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  return ["id", "detalle", "ingreso", "egreso", "cuentaContableCodigo"].every((clave) => typeof Reflect.get(valor, clave) === "string");
}

function esBorradorEdicion(valor: unknown): valor is BorradorEdicion {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const textos = ["id", "nroOperacion", "fechaOperacion", "analitico", "documento", "razonSocial", "medioPagoCodigo", "tipoCambio"];
  const opcionales = ["voucherId", "codigo"];
  const lineas: unknown = Reflect.get(valor, "lineas");
  return (
    textos.every((clave) => typeof Reflect.get(valor, clave) === "string") &&
    opcionales.every((clave) => ["string", "undefined"].includes(typeof Reflect.get(valor, clave))) &&
    Array.isArray(lineas) &&
    lineas.length > 0 &&
    lineas.every(esLineaEdicion)
  );
}

export function leerBorradoresGuardados(clave: string): BorradorEdicion[] {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) {
      return [];
    }
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(esBorradorEdicion) : [];
  } catch {
    return [];
  }
}

export function guardarBorradores(clave: string, borradores: BorradorEdicion[]): boolean {
  try {
    if (borradores.length === 0) {
      window.localStorage.removeItem(clave);
    } else {
      window.localStorage.setItem(clave, JSON.stringify(borradores));
    }
    return true;
  } catch {
    return false;
  }
}
