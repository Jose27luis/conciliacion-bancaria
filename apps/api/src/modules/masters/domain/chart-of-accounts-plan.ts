import {
  CLASES_CUENTA_CONTABLE,
  MONEDAS,
  TIPOS_CUENTA_CONTABLE,
  type ClaseCuentaContable,
  type ImportacionPlanFilaError,
  type Moneda,
  type TipoCuentaContable,
} from "@conciliacion/contracts";

export const COLUMNAS_PLAN = {
  codigo: "COD_CTA",
  denominacion: "DEN_CTA",
  tipo: "TIP_CTA",
  analitica: "FLAG_CUENTA_ANALITICA",
  centroCosto: "FLA_CENTROCOSTO",
  moneda: "MONEDA_CTA",
  clase: "CLASE",
} as const;

export type ColumnaPlan = keyof typeof COLUMNAS_PLAN;

export type FilaPlan = {
  fila: number;
  valores: Record<ColumnaPlan, string>;
};

export type CuentaLeida = {
  codigo: string;
  denominacion: string;
  tipo: TipoCuentaContable;
  clase: ClaseCuentaContable;
  analitica: boolean;
  centroCosto: boolean;
  moneda: Moneda;
};

export type CuentaJerarquica = CuentaLeida & {
  padreCodigo: string | null;
  nivel: number;
  deMovimiento: boolean;
};

export type CuentaExistente = {
  codigo: string;
  padreCodigo: string | null;
};

export type ResultadoLectura = { cuentas: CuentaLeida[]; errores: ImportacionPlanFilaError[] };

function sinTildes(valor: string): string {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

function enLista<T extends string>(lista: readonly T[], valor: string): T | null {
  return lista.find((opcion) => opcion === valor) ?? null;
}

function bandera(valor: string): boolean | null {
  const normal = sinTildes(valor);
  if (normal === "S" || normal === "SI") {
    return true;
  }
  if (normal === "N" || normal === "NO") {
    return false;
  }
  return null;
}

export function leerCuentas(filas: readonly FilaPlan[]): ResultadoLectura {
  const cuentas: CuentaLeida[] = [];
  const errores: ImportacionPlanFilaError[] = [];
  const vistos = new Map<string, number>();

  for (const { fila, valores } of filas) {
    const codigo = valores.codigo.trim();
    const problemas: string[] = [];

    if (!/^\d{2,8}$/.test(codigo)) {
      problemas.push(`el código "${codigo}" debe tener de 2 a 8 dígitos`);
    }
    const filaPrevia = vistos.get(codigo);
    if (filaPrevia !== undefined) {
      problemas.push(`el código ${codigo} ya aparece en la fila ${filaPrevia}`);
    }
    const denominacion = valores.denominacion.trim();
    if (!denominacion) {
      problemas.push("falta la denominación");
    }
    const tipo = enLista(TIPOS_CUENTA_CONTABLE, sinTildes(valores.tipo.trim()));
    if (!tipo) {
      problemas.push(`el tipo "${valores.tipo}" no es ${TIPOS_CUENTA_CONTABLE.join(", ")}`);
    }
    const clase = enLista(CLASES_CUENTA_CONTABLE, sinTildes(valores.clase.trim()));
    if (!clase) {
      problemas.push(`la clase "${valores.clase}" no es ${CLASES_CUENTA_CONTABLE.join(", ")}`);
    }
    const moneda = enLista(MONEDAS, sinTildes(valores.moneda.trim()));
    if (!moneda) {
      problemas.push(`la moneda "${valores.moneda}" no es ${MONEDAS.join(" ni ")}`);
    }
    const analitica = bandera(valores.analitica);
    if (analitica === null) {
      problemas.push(`${COLUMNAS_PLAN.analitica} debe ser S o N`);
    }
    const centroCosto = bandera(valores.centroCosto);
    if (centroCosto === null) {
      problemas.push(`${COLUMNAS_PLAN.centroCosto} debe ser S o N`);
    }

    if (problemas.length > 0 || !tipo || !clase || !moneda || analitica === null || centroCosto === null) {
      errores.push({ fila, mensaje: `Fila ${fila}: ${problemas.join("; ")}.` });
      continue;
    }
    vistos.set(codigo, fila);
    cuentas.push({ codigo, denominacion, tipo, clase, moneda, analitica, centroCosto });
  }

  return { cuentas, errores };
}

function padreMasCercano(codigo: string, codigos: ReadonlySet<string>): string | null {
  for (let largo = codigo.length - 1; largo >= 2; largo -= 1) {
    const prefijo = codigo.slice(0, largo);
    if (codigos.has(prefijo)) {
      return prefijo;
    }
  }
  return null;
}

export type Jerarquia = { cuentas: Map<string, CuentaJerarquica>; conHijas: ReadonlySet<string> };

export function armarJerarquia(cuentas: readonly CuentaLeida[], existentes: readonly CuentaExistente[]): Jerarquia {
  const nuevas = new Set(cuentas.map((cuenta) => cuenta.codigo));
  const codigos = new Set<string>([...nuevas, ...existentes.map((cuenta) => cuenta.codigo)]);
  const padres = new Map<string, string | null>();

  for (const existente of existentes) {
    if (!nuevas.has(existente.codigo)) {
      padres.set(existente.codigo, existente.padreCodigo);
    }
  }
  for (const cuenta of cuentas) {
    padres.set(cuenta.codigo, padreMasCercano(cuenta.codigo, codigos));
  }

  const conHijas = new Set<string>();
  for (const padre of padres.values()) {
    if (padre) {
      conHijas.add(padre);
    }
  }

  const niveles = new Map<string, number>();
  const nivelDe = (codigo: string): number => {
    const conocido = niveles.get(codigo);
    if (conocido !== undefined) {
      return conocido;
    }
    const padre = padres.get(codigo) ?? null;
    const nivel = padre ? nivelDe(padre) + 1 : 1;
    niveles.set(codigo, nivel);
    return nivel;
  };

  const resultado = new Map<string, CuentaJerarquica>();
  for (const cuenta of cuentas) {
    resultado.set(cuenta.codigo, {
      ...cuenta,
      padreCodigo: padres.get(cuenta.codigo) ?? null,
      nivel: nivelDe(cuenta.codigo),
      deMovimiento: !conHijas.has(cuenta.codigo),
    });
  }
  return { cuentas: resultado, conHijas };
}
