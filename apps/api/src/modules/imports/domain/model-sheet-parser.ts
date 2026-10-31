import {
  centavosATexto,
  normalizarAnalitico,
  normalizarDocumento,
  normalizarTexto,
  SIN_COMPROBANTE,
  type Moneda,
  type ObservacionImportacion,
} from "@conciliacion/contracts";

export type ValorCelda = string | number | Date | null;

export type FilaHoja = { fila: number; celdas: ValorCelda[] };

export type LineaImportada = {
  fila: number;
  detalle: string;
  ingreso: string;
  egreso: string;
  cuentaContableCodigo: string;
  destinoDebe: string | null;
  destinoHaber: string | null;
};

export type VoucherImportado = {
  hoja: string;
  fila: number;
  codigo: string;
  numero: number;
  anio: number;
  mes: number;
  fechaOperacion: string;
  nroOperacion: string;
  documento: string;
  razonSocial: string;
  analitico: string;
  medioPagoCodigo: string;
  tipoCambio: string;
  lineas: LineaImportada[];
};

export type HojaLeida = { nombre: string; moneda: Moneda; vouchers: VoucherImportado[]; observaciones: ObservacionImportacion[] };

type Columna = "nroOperacion" | "voucher" | "fecha" | "analitico" | "documento" | "razonSocial" | "detalle" | "tipoCambio" | "ingreso" | "egreso" | "cuenta" | "medioPago";

type Mapa = Partial<Record<Columna, number>>;

const PATRON_VOUCHER = /^(\d{2})-(\d{1,6})$/;
const PATRON_CODIGO_CUENTA = /^\d{2,6}$/;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);
const MILISEGUNDOS_DIA = 86_400_000;

function texto(valor: ValorCelda | undefined): string {
  if (valor === null || valor === undefined) {
    return "";
  }
  if (valor instanceof Date) {
    return valor.toISOString().slice(0, 10);
  }
  return String(valor).trim();
}

function columnaDeEncabezado(titulo: string): Columna | null {
  const normal = normalizarTexto(titulo).replace(/\s+/g, "");
  if (normal.includes("CHEQUE") || (normal.includes("OPERACION") && normal.startsWith("N"))) {
    return "nroOperacion";
  }
  if (normal.includes("VOUCHER")) {
    return "voucher";
  }
  if (normal.startsWith("FECHA")) {
    return "fecha";
  }
  if (normal.startsWith("ANALITICO")) {
    return "analitico";
  }
  if (normal === "RUC" || normal.startsWith("RUC/") || normal === "DNI") {
    return "documento";
  }
  if (normal.startsWith("RAZON")) {
    return "razonSocial";
  }
  if (normal.startsWith("DETALLE")) {
    return "detalle";
  }
  if (normal === "T.C" || normal === "TC" || normal === "T.C.") {
    return "tipoCambio";
  }
  if (normal === "INGRESO") {
    return "ingreso";
  }
  if (normal === "EGRESO") {
    return "egreso";
  }
  if (normal === "CTA") {
    return "cuenta";
  }
  if (normal === "COD") {
    return "medioPago";
  }
  return null;
}

function leerEncabezado(fila: FilaHoja): Mapa | null {
  const mapa: Mapa = {};
  fila.celdas.forEach((valor, indice) => {
    const columna = typeof valor === "string" ? columnaDeEncabezado(valor) : null;
    if (columna && mapa[columna] === undefined) {
      mapa[columna] = indice;
    }
  });
  return mapa.detalle !== undefined && mapa.ingreso !== undefined && mapa.egreso !== undefined ? mapa : null;
}

function fechaIso(valor: ValorCelda | undefined): string | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
  }
  if (typeof valor === "number" && valor > 20_000 && valor < 80_000) {
    return new Date(EPOCA_EXCEL + Math.round(valor) * MILISEGUNDOS_DIA).toISOString().slice(0, 10);
  }
  const partes = typeof valor === "string" ? /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor.trim()) : null;
  if (partes?.[1] && partes[2] && partes[3]) {
    return `${partes[3]}-${partes[2].padStart(2, "0")}-${partes[1].padStart(2, "0")}`;
  }
  return null;
}

function importe(valor: ValorCelda | undefined): { centavos: number; valido: boolean } {
  if (valor === null || valor === undefined || valor === "") {
    return { centavos: 0, valido: true };
  }
  const numero = typeof valor === "number" ? valor : Number(String(valor).replace(/,/g, ""));
  if (!Number.isFinite(numero) || numero < 0) {
    return { centavos: 0, valido: false };
  }
  return { centavos: Math.round(numero * 100), valido: true };
}

function analiticoNormal(valor: string): string {
  const normal = normalizarAnalitico(valor);
  if (normal === "" || normal === SIN_COMPROBANTE) {
    return SIN_COMPROBANTE;
  }
  return /^\d-/.test(normal) ? `0${normal}` : normal;
}

function codigoCuenta(valor: ValorCelda | undefined): string {
  const limpio = texto(valor).replace(/\.0+$/, "");
  return limpio;
}

function codigoMedioPago(valor: ValorCelda | undefined): string {
  const limpio = codigoCuenta(valor);
  return /^\d{1,3}$/.test(limpio) ? limpio.padStart(3, "0") : limpio;
}

function destino(valor: ValorCelda | undefined): string | null {
  const limpio = codigoCuenta(valor);
  return PATRON_CODIGO_CUENTA.test(limpio) ? limpio : null;
}

export function leerHojaModelo(nombre: string, filas: FilaHoja[]): HojaLeida {
  const observaciones: ObservacionImportacion[] = [];
  const porCodigo = new Map<string, VoucherImportado>();
  let mapa: Mapa | null = null;
  let esDolares = false;

  const observar = (fila: number, voucher: string | null, nivel: "error" | "aviso", mensaje: string): void => {
    observaciones.push({ hoja: nombre, fila, voucher, nivel, mensaje });
  };

  for (const fila of filas) {
    const encabezado = leerEncabezado(fila);
    if (encabezado) {
      mapa = { ...(mapa ?? {}), ...encabezado };
      continue;
    }
    if (!mapa) {
      continue;
    }
    const celda = (columna: Columna): ValorCelda | undefined => {
      const indice = mapa?.[columna];
      return indice === undefined ? undefined : fila.celdas[indice];
    };

    const codigo = texto(celda("voucher"));
    const fecha = fechaIso(celda("fecha"));
    const documentoCrudo = texto(celda("documento"));
    const detalle = texto(celda("detalle")).replace(/\s+/g, " ");
    const ingreso = importe(celda("ingreso"));
    const egreso = importe(celda("egreso"));
    const tieneDatos = Boolean(fecha || documentoCrudo || detalle || ingreso.centavos || egreso.centavos);
    if (!tieneDatos) {
      continue;
    }

    const partes = PATRON_VOUCHER.exec(codigo);
    if (!partes?.[1] || !partes[2]) {
      observar(fila.fila, null, "error", codigo ? `El voucher "${codigo}" no tiene el formato MM-NNNNN.` : "La fila tiene datos pero no tiene número de voucher.");
      continue;
    }
    if (!fecha) {
      observar(fila.fila, codigo, "error", "La fecha de operación está vacía o no es una fecha.");
      continue;
    }
    const mesVoucher = Number(partes[1]);
    const anio = Number(fecha.slice(0, 4));
    const mesFecha = Number(fecha.slice(5, 7));
    if (mesVoucher !== mesFecha) {
      observar(fila.fila, codigo, "aviso", `El voucher es del mes ${partes[1]} pero la fecha es ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}/${fecha.slice(0, 4)}; se importa en el mes ${partes[1]} con su fecha original.`);
    }
    if (!ingreso.valido || !egreso.valido) {
      observar(fila.fila, codigo, "error", "El ingreso o el egreso no es un número válido.");
      continue;
    }

    const tipoCambioCrudo = celda("tipoCambio");
    const tipoCambio = typeof tipoCambioCrudo === "number" ? tipoCambioCrudo : Number(texto(tipoCambioCrudo));
    if (Number.isFinite(tipoCambio) && Math.abs(tipoCambio - 1) > 0.0001 && tipoCambio > 0) {
      esDolares = true;
    }

    const indiceMedioPago = mapa.medioPago;
    const linea: LineaImportada = {
      fila: fila.fila,
      detalle,
      ingreso: ingreso.centavos > 0 ? centavosATexto(ingreso.centavos) : "",
      egreso: egreso.centavos > 0 ? centavosATexto(egreso.centavos) : "",
      cuentaContableCodigo: codigoCuenta(celda("cuenta")),
      destinoDebe: indiceMedioPago === undefined ? null : destino(fila.celdas[indiceMedioPago + 1]),
      destinoHaber: indiceMedioPago === undefined ? null : destino(fila.celdas[indiceMedioPago + 2]),
    };

    const clave = `${anio}-${codigo}`;
    const existente = porCodigo.get(clave);
    if (existente) {
      if (normalizarDocumento(documentoCrudo) !== existente.documento && documentoCrudo) {
        observar(fila.fila, codigo, "aviso", `La línea tiene otro documento (${documentoCrudo}); se agrupa en el voucher con ${existente.documento}.`);
      }
      existente.lineas.push(linea);
      continue;
    }

    const razonSocial = texto(celda("razonSocial")).replace(/\s+/g, " ");
    porCodigo.set(clave, {
      hoja: nombre,
      fila: fila.fila,
      codigo,
      numero: Number(partes[2]),
      anio,
      mes: mesVoucher,
      fechaOperacion: fecha,
      nroOperacion: texto(celda("nroOperacion")),
      documento: normalizarDocumento(documentoCrudo),
      razonSocial: /^#/.test(razonSocial) ? "" : razonSocial,
      analitico: analiticoNormal(texto(celda("analitico"))),
      medioPagoCodigo: codigoMedioPago(celda("medioPago")),
      tipoCambio: Number.isFinite(tipoCambio) && tipoCambio > 0 ? tipoCambio.toFixed(3) : "",
      lineas: [linea],
    });
  }

  return { nombre, moneda: esDolares ? "USD" : "PEN", vouchers: [...porCodigo.values()], observaciones };
}
