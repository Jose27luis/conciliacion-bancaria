import type { Moneda } from "./enums";

export const TIPOS_DOCUMENTO_ENTIDAD = ["RUC", "DNI", "EXTRANJERO"] as const;
export type TipoDocumentoEntidad = (typeof TIPOS_DOCUMENTO_ENTIDAD)[number];

export const SIN_COMPROBANTE = "--";
export const MAXIMO_LINEAS_VOUCHER = 20;

export type Analitico = { tipo: string; serie: string; numero: string };

export type LineaBorrador = {
  detalle: string;
  ingreso: string;
  egreso: string;
  cuentaContableCodigo: string;
};

export type VoucherBorrador = {
  nroOperacion: string;
  fechaOperacion: string;
  analitico: string;
  documento: string;
  razonSocial: string;
  medioPagoCodigo: string;
  tipoCambio: string;
  lineas: LineaBorrador[];
};

export type CampoVoucher = "nroOperacion" | "fechaOperacion" | "analitico" | "documento" | "razonSocial" | "medioPagoCodigo" | "tipoCambio";
export type CampoLinea = "detalle" | "importe" | "cuentaContableCodigo";

export type Problema = {
  nivel: "error" | "aviso";
  campo: CampoVoucher | CampoLinea;
  linea: number | null;
  mensaje: string;
};

export type ContextoValidacion = {
  moneda: Moneda;
  periodo: { anio: number; mes: number };
  cuentasContables: ReadonlySet<string>;
  mediosPago: ReadonlySet<string>;
  tiposComprobante: ReadonlySet<string>;
  entidadConocida: boolean;
};

const PATRON_MONTO = /^\d{1,12}(\.\d{1,2})?$/;
const PATRON_TIPO_CAMBIO = /^\d{1,3}(\.\d{1,3})?$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_ANALITICO = /^([0-9A-Z]{2,4})-([0-9A-Z]{1,8})-([0-9A-Z]{1,12})$/;

export function normalizarDocumento(valor: string): string {
  const limpio = valor.replace(/[\s.-]/g, "").toUpperCase();
  return /^\d{7}$/.test(limpio) ? `0${limpio}` : limpio;
}

const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function rucConDigitoValido(ruc: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) {
    return false;
  }
  const suma = PESOS_RUC.reduce((total, peso, indice) => total + peso * Number(ruc[indice]), 0);
  const digito = (11 - (suma % 11)) % 10;
  return digito === Number(ruc[10]);
}

export function tipoDeDocumento(numero: string): TipoDocumentoEntidad {
  if (/^\d{11}$/.test(numero)) {
    return "RUC";
  }
  if (/^\d{8}$/.test(numero)) {
    return "DNI";
  }
  return "EXTRANJERO";
}

export function normalizarAnalitico(valor: string): string {
  return valor.trim().toUpperCase().replace(/\s+/g, "");
}

export function parsearAnalitico(valor: string): Analitico | "SIN_COMPROBANTE" | null {
  const normal = normalizarAnalitico(valor);
  if (normal === SIN_COMPROBANTE) {
    return "SIN_COMPROBANTE";
  }
  const partes = PATRON_ANALITICO.exec(normal);
  if (!partes?.[1] || !partes[2] || !partes[3]) {
    return null;
  }
  return { tipo: partes[1], serie: partes[2], numero: partes[3] };
}

export function textoAnalitico(analitico: Analitico | null): string {
  return analitico ? `${analitico.tipo}-${analitico.serie}-${analitico.numero}` : SIN_COMPROBANTE;
}

export function normalizarMonto(valor: string): string {
  return valor.trim().replace(/,/g, "");
}

export function montoACentavos(valor: string): number {
  const normal = normalizarMonto(valor);
  if (!PATRON_MONTO.test(normal)) {
    return 0;
  }
  const [enteros = "0", decimales = ""] = normal.split(".");
  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

export function centavosATexto(centavos: number): string {
  const signo = centavos < 0 ? "-" : "";
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, "0")}`;
}

export function formatoVoucher(mes: number, numero: number): string {
  return `${String(mes).padStart(2, "0")}-${String(numero).padStart(5, "0")}`;
}

export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function distanciaMaximaUno(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  let i = 0;
  let j = 0;
  let diferencias = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    diferencias += 1;
    if (diferencias > 1) {
      return false;
    }
    if (a.length === b.length && a[i] === b[j + 1] && a[i + 1] === b[j]) {
      i += 2;
      j += 2;
    } else if (a.length > b.length) {
      i += 1;
    } else if (b.length > a.length) {
      j += 1;
    } else {
      i += 1;
      j += 1;
    }
  }
  return diferencias + (a.length - i) + (b.length - j) <= 1;
}

function palabraCoincide(buscada: string, palabras: string[]): number {
  if (palabras.some((palabra) => palabra.startsWith(buscada))) {
    return 2;
  }
  if (palabras.some((palabra) => palabra.includes(buscada))) {
    return 1.5;
  }
  if (buscada.length >= 4 && palabras.some((palabra) => distanciaMaximaUno(buscada, palabra) || distanciaMaximaUno(buscada, palabra.slice(0, buscada.length)))) {
    return 1;
  }
  return 0;
}

export function puntajeCoincidencia(texto: string, consulta: string): number {
  const buscadas = normalizarTexto(consulta).split(" ").filter(Boolean);
  if (buscadas.length === 0) {
    return 1;
  }
  const palabras = normalizarTexto(texto).split(/[^A-Z0-9]+/).filter(Boolean);
  let total = 0;
  for (const buscada of buscadas) {
    const puntaje = palabraCoincide(buscada, palabras);
    if (puntaje === 0) {
      return 0;
    }
    total += puntaje;
  }
  return total / buscadas.length;
}

function validarDocumento(borrador: VoucherBorrador, contexto: ContextoValidacion, problemas: Problema[]): void {
  const documento = normalizarDocumento(borrador.documento);
  if (!documento) {
    problemas.push({ nivel: "error", campo: "documento", linea: null, mensaje: "Falta RUC o DNI." });
    return;
  }
  if (!/^[0-9A-Z]{4,15}$/.test(documento)) {
    problemas.push({ nivel: "error", campo: "documento", linea: null, mensaje: "El documento solo admite letras y números (4 a 15)." });
    return;
  }
  const tipo = tipoDeDocumento(documento);
  if (tipo === "EXTRANJERO") {
    problemas.push({ nivel: "aviso", campo: "documento", linea: null, mensaje: "No es RUC (11) ni DNI (8): se guardará como documento extranjero." });
  }
  if (!contexto.entidadConocida) {
    if (!borrador.razonSocial.trim()) {
      problemas.push({ nivel: "error", campo: "razonSocial", linea: null, mensaje: "Documento nuevo: escribe la razón social." });
    } else {
      problemas.push({ nivel: "aviso", campo: "razonSocial", linea: null, mensaje: "Proveedor nuevo: se agregará al maestro al registrar." });
    }
  }
}

function validarCabecera(borrador: VoucherBorrador, contexto: ContextoValidacion, problemas: Problema[]): void {
  if (borrador.nroOperacion.trim().length > 30) {
    problemas.push({ nivel: "error", campo: "nroOperacion", linea: null, mensaje: "El número de operación admite hasta 30 caracteres." });
  }

  if (!PATRON_FECHA.test(borrador.fechaOperacion) || Number.isNaN(Date.parse(`${borrador.fechaOperacion}T00:00:00Z`))) {
    problemas.push({ nivel: "error", campo: "fechaOperacion", linea: null, mensaje: "Falta la fecha de operación." });
  } else {
    const [anio, mes] = borrador.fechaOperacion.split("-").map(Number);
    if (anio !== contexto.periodo.anio || mes !== contexto.periodo.mes) {
      problemas.push({ nivel: "aviso", campo: "fechaOperacion", linea: null, mensaje: "La fecha está fuera del periodo que estás viendo." });
    }
  }

  const analitico = parsearAnalitico(borrador.analitico);
  if (!borrador.analitico.trim()) {
    problemas.push({ nivel: "error", campo: "analitico", linea: null, mensaje: "Falta el analítico. Usa -- si no hay comprobante." });
  } else if (analitico === null) {
    problemas.push({ nivel: "error", campo: "analitico", linea: null, mensaje: "El analítico debe ser tipo-serie-número (por ejemplo 01-F001-123) o --." });
  } else if (analitico !== "SIN_COMPROBANTE" && !contexto.tiposComprobante.has(analitico.tipo)) {
    problemas.push({ nivel: "error", campo: "analitico", linea: null, mensaje: `El tipo de comprobante ${analitico.tipo} no existe o está desactivado.` });
  }

  validarDocumento(borrador, contexto, problemas);

  if (!borrador.medioPagoCodigo.trim()) {
    problemas.push({ nivel: "error", campo: "medioPagoCodigo", linea: null, mensaje: "Falta el código de medio de pago (COD)." });
  } else if (!contexto.mediosPago.has(borrador.medioPagoCodigo.trim())) {
    problemas.push({ nivel: "error", campo: "medioPagoCodigo", linea: null, mensaje: `COD ${borrador.medioPagoCodigo} no es un medio de pago válido (Tabla 1 SUNAT).` });
  }

  if (contexto.moneda === "USD") {
    const tipoCambio = borrador.tipoCambio.trim();
    if (!tipoCambio) {
      problemas.push({ nivel: "error", campo: "tipoCambio", linea: null, mensaje: "Falta el tipo de cambio." });
    } else if (!PATRON_TIPO_CAMBIO.test(tipoCambio) || Number(tipoCambio) <= 0) {
      problemas.push({ nivel: "error", campo: "tipoCambio", linea: null, mensaje: "El tipo de cambio debe ser un número mayor que 0 con hasta 3 decimales." });
    }
  }
}

function validarLineas(borrador: VoucherBorrador, contexto: ContextoValidacion, problemas: Problema[]): void {
  if (borrador.lineas.length === 0) {
    problemas.push({ nivel: "error", campo: "detalle", linea: 0, mensaje: "El voucher no tiene líneas." });
    return;
  }
  if (borrador.lineas.length > MAXIMO_LINEAS_VOUCHER) {
    problemas.push({ nivel: "error", campo: "detalle", linea: 0, mensaje: `Un voucher admite hasta ${MAXIMO_LINEAS_VOUCHER} líneas.` });
  }
  borrador.lineas.forEach((linea, indice) => {
    if (!linea.detalle.trim()) {
      problemas.push({ nivel: "error", campo: "detalle", linea: indice, mensaje: "Falta el detalle." });
    } else if (linea.detalle.trim().length > 250) {
      problemas.push({ nivel: "error", campo: "detalle", linea: indice, mensaje: "El detalle admite hasta 250 caracteres." });
    }

    const ingresoTexto = normalizarMonto(linea.ingreso);
    const egresoTexto = normalizarMonto(linea.egreso);
    const formatoMalo = [ingresoTexto, egresoTexto].some((monto) => monto !== "" && !PATRON_MONTO.test(monto));
    const ingreso = montoACentavos(ingresoTexto);
    const egreso = montoACentavos(egresoTexto);
    if (formatoMalo) {
      problemas.push({ nivel: "error", campo: "importe", linea: indice, mensaje: "El importe debe ser un número con hasta 2 decimales." });
    } else if (ingresoTexto === "" && egresoTexto === "") {
      problemas.push({ nivel: "error", campo: "importe", linea: indice, mensaje: "Ingresa un importe en Ingreso o en Egreso; escribe 0 si el movimiento es en cero." });
    } else if (ingreso === 0 && egreso === 0) {
      problemas.push({ nivel: "aviso", campo: "importe", linea: indice, mensaje: "Importe en 0: confirma que el movimiento sea sin monto." });
    } else if (ingreso > 0 && egreso > 0) {
      problemas.push({ nivel: "error", campo: "importe", linea: indice, mensaje: "Una línea no puede tener ingreso y egreso a la vez." });
    }

    const cuenta = linea.cuentaContableCodigo.trim();
    if (!cuenta) {
      problemas.push({ nivel: "error", campo: "cuentaContableCodigo", linea: indice, mensaje: "Falta la cuenta contable (CTA)." });
    } else if (!contexto.cuentasContables.has(cuenta)) {
      problemas.push({ nivel: "error", campo: "cuentaContableCodigo", linea: indice, mensaje: `La CTA ${cuenta} no es una cuenta de movimiento activa del plan contable.` });
    }
  });
}

export function validarVoucher(borrador: VoucherBorrador, contexto: ContextoValidacion): Problema[] {
  const problemas: Problema[] = [];
  validarCabecera(borrador, contexto, problemas);
  validarLineas(borrador, contexto, problemas);
  return problemas;
}

export function tieneErrores(problemas: readonly Problema[]): boolean {
  return problemas.some((problema) => problema.nivel === "error");
}
