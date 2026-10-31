"use client";

import type { KeyboardEvent } from "react";
import type { Problema } from "@conciliacion/contracts/rules";
import { AlertTriangle, Check, ListPlus, Minus, Pencil, Trash2, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BorradorEdicion, CampoCabecera, CampoDeLinea, CampoHoja, Foco } from "./draft-model";
import { CELDA, CELDA_SIN_RELLENO, ENTRADA, ENTRADA_NUMERO, GRILLA, MARCA_AVISO, MARCA_ERROR } from "./sheet-styles";
import { SuggestionBar, type Sugerencia } from "./suggestion-bar";

export type EstadoBorrador = "vacio" | "ok" | "aviso" | "error";

type Props = {
  borrador: BorradorEdicion;
  filaInicial: number;
  codigoProvisional: string;
  enSoles: boolean;
  problemas: Problema[];
  estado: EstadoBorrador;
  entidadConocida: boolean;
  foco: Foco | null;
  sugerencias: { titulo: string; lista: Sugerencia[] } | null;
  alCambiarCabecera: (campo: CampoCabecera, valor: string) => void;
  alCambiarLinea: (linea: number, campo: CampoDeLinea, valor: string) => void;
  alNormalizarMonto: (linea: number, campo: "ingreso" | "egreso") => void;
  alEnfocar: (campo: CampoHoja, linea: number) => void;
  alTeclear: (evento: KeyboardEvent<HTMLInputElement>, campo: CampoHoja, linea: number) => void;
  alAgregarLinea: () => void;
  alQuitarLinea: (linea: number) => void;
  alQuitar: () => void;
};

const ETIQUETAS: Record<CampoHoja, string> = {
  nroOperacion: "Número de operación",
  fechaOperacion: "Fecha",
  analitico: "Analítico",
  documento: "RUC o DNI",
  razonSocial: "Razón social",
  detalle: "Detalle",
  tipoCambio: "Tipo de cambio",
  ingreso: "Ingreso",
  egreso: "Egreso",
  cuentaContableCodigo: "Cuenta contable",
  medioPagoCodigo: "Código de medio de pago",
};

function marca(problemas: Problema[], campo: CampoHoja, linea: number | null, suprimirErrores: boolean): string {
  const campoRegla = campo === "ingreso" || campo === "egreso" ? "importe" : campo;
  const propios = problemas.filter((problema) => problema.campo === campoRegla && problema.linea === linea);
  if (!suprimirErrores && propios.some((problema) => problema.nivel === "error")) {
    return MARCA_ERROR;
  }
  return propios.some((problema) => problema.nivel === "aviso") ? MARCA_AVISO : "";
}

export function DraftRows(props: Props) {
  const { borrador, filaInicial, codigoProvisional, enSoles, problemas, estado, entidadConocida, foco, sugerencias } = props;
  const enfocado = foco?.borradorId === borrador.id;
  const visibles = enfocado ? problemas.filter((problema) => problema.nivel === "aviso") : problemas;
  const fondo = estado === "error" ? "bg-[#2a1a24]" : estado === "aviso" ? "bg-[#272414]" : estado === "vacio" ? "bg-[#0a1f36]" : "bg-[#0c2540]";
  const borde = borrador.voucherId ? "border-l-2 border-l-primary" : "";

  const entrada = (campo: CampoHoja, linea: number, valor: string, opciones: { numero?: boolean; tipo?: string; modo?: "numeric" | "decimal" } = {}) => {
    const lineaProblema = campo === "detalle" || campo === "ingreso" || campo === "egreso" || campo === "cuentaContableCodigo" ? linea : null;
    const claseMarca = marca(problemas, campo, lineaProblema, enfocado);
    return (
      <input
        className={cn(opciones.numero ? ENTRADA_NUMERO : ENTRADA, claseMarca)}
        type={opciones.tipo ?? "text"}
        inputMode={opciones.modo}
        value={valor}
        data-borrador={borrador.id}
        data-campo={campo}
        data-linea={linea}
        aria-label={`${ETIQUETAS[campo]}, fila ${filaInicial + linea}`}
        aria-invalid={claseMarca === MARCA_ERROR}
        autoComplete="off"
        spellCheck={false}
        onFocus={() => props.alEnfocar(campo, linea)}
        onKeyDown={(evento) => props.alTeclear(evento, campo, linea)}
        onBlur={campo === "ingreso" || campo === "egreso" ? () => props.alNormalizarMonto(linea, campo) : undefined}
        onChange={(evento) => {
          if (campo === "detalle" || campo === "ingreso" || campo === "egreso" || campo === "cuentaContableCodigo") {
            props.alCambiarLinea(linea, campo, evento.target.value);
          } else {
            props.alCambiarCabecera(campo, evento.target.value);
          }
        }}
      />
    );
  };

  const [primera, ...resto] = borrador.lineas;
  if (!primera) {
    return null;
  }

  return (
    <div className={cn("border-b border-border/70", fondo, borde)}>
      <div className={GRILLA}>
        <div className={cn(CELDA, "justify-center text-[11px] text-muted-foreground")}>{filaInicial}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("nroOperacion", 0, borrador.nroOperacion)}</div>
        {borrador.voucherId ? (
          <div className={cn(CELDA, "gap-1 font-semibold tabular-nums text-primary")} title="Editando un voucher registrado; conserva su número">
            <Pencil className="size-3 shrink-0" aria-hidden="true" />
            {borrador.codigo}
          </div>
        ) : (
          <div className={cn(CELDA, "italic tabular-nums text-sistema")} title="Correlativo provisional; se confirma al registrar">
            {codigoProvisional}
          </div>
        )}
        <div className={CELDA_SIN_RELLENO}>{entrada("fechaOperacion", 0, borrador.fechaOperacion, { tipo: "date" })}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("analitico", 0, borrador.analitico)}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("documento", 0, borrador.documento, { numero: true, modo: "numeric" })}</div>
        {entidadConocida ? (
          <div className={cn(CELDA, "text-sistema")} title={borrador.razonSocial}>
            {borrador.razonSocial}
          </div>
        ) : (
          <div className={CELDA_SIN_RELLENO}>{entrada("razonSocial", 0, borrador.razonSocial)}</div>
        )}
        <div className={CELDA_SIN_RELLENO}>{entrada("detalle", 0, primera.detalle)}</div>
        {enSoles ? (
          <div className={cn(CELDA, "justify-end tabular-nums text-sistema")}>1.000</div>
        ) : (
          <div className={CELDA_SIN_RELLENO}>{entrada("tipoCambio", 0, borrador.tipoCambio, { numero: true, modo: "decimal" })}</div>
        )}
        <div className={CELDA_SIN_RELLENO}>{entrada("ingreso", 0, primera.ingreso, { numero: true, modo: "decimal" })}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("egreso", 0, primera.egreso, { numero: true, modo: "decimal" })}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("cuentaContableCodigo", 0, primera.cuentaContableCodigo, { modo: "numeric" })}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("medioPagoCodigo", 0, borrador.medioPagoCodigo, { modo: "numeric" })}</div>
        <div className={cn(CELDA, "justify-center gap-1 px-1")}>
          {estado === "vacio" ? (
            <span role="img" aria-label="Fila vacía" className="grid size-5 place-items-center rounded-md border border-dashed border-input" />
          ) : (
            <span
              role="img"
              aria-label={estado === "ok" ? "Fila lista" : estado === "aviso" ? "Fila con aviso" : "Fila con error"}
              className={cn(
                "grid size-5 place-items-center rounded-md",
                estado === "ok" && "bg-exito/15 text-exito",
                estado === "aviso" && "bg-[#4b3918] text-[#ffda79]",
                estado === "error" && "bg-destructive/20 text-destructive",
              )}
            >
              {estado === "ok" ? <Check className="size-3" strokeWidth={3} /> : estado === "aviso" ? <AlertTriangle className="size-3" /> : <X className="size-3" strokeWidth={3} />}
            </span>
          )}
          <button type="button" onClick={props.alAgregarLinea} title="Agregar línea al mismo voucher (Alt+L)" aria-label={`Agregar línea a la fila ${filaInicial}`} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-primary">
            <ListPlus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={props.alQuitar}
            title={borrador.voucherId ? "Descartar cambios" : "Quitar fila de la hoja"}
            aria-label={borrador.voucherId ? `Descartar cambios del voucher ${borrador.codigo ?? ""}` : `Quitar fila ${filaInicial}`}
            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
          >
            {borrador.voucherId ? <Undo2 className="size-3.5" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      </div>

      {resto.map((linea, posicion) => {
        const indice = posicion + 1;
        return (
          <div key={linea.id} className={GRILLA}>
            <div className={cn(CELDA, "justify-center text-[11px] text-muted-foreground")}>{filaInicial + indice}</div>
            <div className={CELDA} />
            <div className={cn(CELDA, "border-l-2 border-l-primary/50 text-[10px] text-muted-foreground")}>línea {indice + 1}</div>
            <div className={CELDA} />
            <div className={CELDA} />
            <div className={CELDA} />
            <div className={CELDA} />
            <div className={CELDA_SIN_RELLENO}>{entrada("detalle", indice, linea.detalle)}</div>
            <div className={CELDA} />
            <div className={CELDA_SIN_RELLENO}>{entrada("ingreso", indice, linea.ingreso, { numero: true, modo: "decimal" })}</div>
            <div className={CELDA_SIN_RELLENO}>{entrada("egreso", indice, linea.egreso, { numero: true, modo: "decimal" })}</div>
            <div className={CELDA_SIN_RELLENO}>{entrada("cuentaContableCodigo", indice, linea.cuentaContableCodigo, { modo: "numeric" })}</div>
            <div className={cn(CELDA, "text-muted-foreground tabular-nums")}>{borrador.medioPagoCodigo}</div>
            <div className={cn(CELDA, "justify-center")}>
              <button type="button" onClick={() => props.alQuitarLinea(indice)} title="Quitar esta línea" aria-label={`Quitar línea ${indice + 1} de la fila ${filaInicial}`} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-destructive/20 hover:text-destructive">
                <Minus className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}

      {visibles.length > 0 ? (
        <div className={cn("min-w-[1420px] py-1.5 pl-11 pr-3 text-[11px] font-medium", visibles.some((problema) => problema.nivel === "error") ? "text-destructive" : "text-[#ffda79]")}>
          {visibles.map((problema) => (problema.linea !== null && borrador.lineas.length > 1 ? `Línea ${problema.linea + 1}: ${problema.mensaje}` : problema.mensaje)).join("  ·  ")}
        </div>
      ) : null}

      {enfocado && sugerencias ? <SuggestionBar titulo={sugerencias.titulo} sugerencias={sugerencias.lista} /> : null}
    </div>
  );
}
