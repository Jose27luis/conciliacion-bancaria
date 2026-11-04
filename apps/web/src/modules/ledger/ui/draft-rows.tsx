"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence } from "framer-motion";
import type { Problema } from "@conciliacion/contracts/rules";
import { AlertTriangle, CalendarDays, Check, Hand, HandGrab, Info, ListPlus, Loader2, Minus, Pencil, Trash2, Undo2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateCalendar } from "@/shared/ui/date-calendar";
import type { ResultadoConsultaDocumento } from "../actions";
import type { BorradorEdicion, CampoCabecera, CampoDeLinea, CampoHoja, Foco } from "./draft-model";
import { CELDA, CELDA_SIN_RELLENO, ENTRADA, ENTRADA_NUMERO, GRILLA, MARCA_AVISO, MARCA_ERROR } from "./sheet-styles";
import type { ArrastreFila } from "./sortable-row";
import { SuggestionBar, type Sugerencia } from "./suggestion-bar";

export type EstadoBorrador = "vacio" | "ok" | "aviso" | "error";

export type ConsultaExterna = ResultadoConsultaDocumento | { estado: "consultando" };

export type CalendarioHoja = { hoy: string; desde: string; hasta: string; marcas: Record<string, number> };

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
  calendario: CalendarioHoja;
  consultaExterna: ConsultaExterna | null;
  arrastre: ArrastreFila;
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
  const [celdaFecha, setCeldaFecha] = useState<HTMLDivElement | null>(null);
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);

  const cerrarCalendario = (devolverFoco: boolean): void => {
    setCalendarioAbierto(false);
    if (devolverFoco) {
      celdaFecha?.querySelector("input")?.focus();
    }
  };

  const entrada = (campo: CampoHoja, linea: number, valor: string, opciones: { numero?: boolean; tipo?: string; modo?: "numeric" | "decimal"; clase?: string } = {}) => {
    const lineaProblema = campo === "detalle" || campo === "ingreso" || campo === "egreso" || campo === "cuentaContableCodigo" ? linea : null;
    const claseMarca = marca(problemas, campo, lineaProblema, enfocado);
    return (
      <input
        className={cn(opciones.numero ? ENTRADA_NUMERO : ENTRADA, opciones.clase, claseMarca)}
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
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={(evento) => {
            evento.preventDefault();
            props.arrastre.iniciar(evento);
          }}
          aria-label={`Mover la fila ${filaInicial}`}
          title="Arrastra para mover la fila (Alt+Shift+↑ o ↓)"
          className={cn(
            CELDA,
            "group/mano relative touch-none select-none justify-center text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
            props.arrastre.arrastrando ? "cursor-grabbing bg-primary/15 text-primary" : "cursor-grab",
          )}
        >
          <span className={cn("transition-opacity", props.arrastre.arrastrando ? "opacity-0" : "group-hover/mano:opacity-0")}>{filaInicial}</span>
          {props.arrastre.arrastrando ? (
            <HandGrab className="absolute size-4" aria-hidden="true" />
          ) : (
            <Hand className="absolute size-4 -rotate-12 opacity-0 transition-all group-hover/mano:rotate-0 group-hover/mano:opacity-100" aria-hidden="true" />
          )}
        </button>
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
        <div
          ref={setCeldaFecha}
          className={cn(CELDA_SIN_RELLENO, "relative")}
          onKeyDown={(evento) => {
            if (evento.altKey && !evento.shiftKey && evento.key === "ArrowDown") {
              evento.preventDefault();
              setCalendarioAbierto(true);
            }
          }}
        >
          {entrada("fechaOperacion", 0, borrador.fechaOperacion, { tipo: "date", clase: "pr-7 [&::-webkit-calendar-picker-indicator]:hidden" })}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setCalendarioAbierto((abierto) => !abierto)}
            aria-label="Abrir calendario"
            aria-expanded={calendarioAbierto}
            title="Abrir calendario (Alt+↓)"
            className={cn(
              "absolute right-1 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md transition-colors hover:bg-primary/15 hover:text-primary",
              calendarioAbierto ? "bg-primary/15 text-primary" : "text-muted-foreground",
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <div className={CELDA_SIN_RELLENO}>{entrada("analitico", 0, borrador.analitico)}</div>
        <div className={CELDA_SIN_RELLENO}>{entrada("documento", 0, borrador.documento, { numero: true, modo: "numeric" })}</div>
        {entidadConocida ? (
          <div className={cn(CELDA, "text-sistema")} title={borrador.razonSocial}>
            {borrador.razonSocial}
          </div>
        ) : (
          <div className={cn(CELDA_SIN_RELLENO, "relative")}>
            {entrada("razonSocial", 0, borrador.razonSocial, { clase: props.consultaExterna ? "pr-16" : undefined })}
            {props.consultaExterna?.estado === "consultando" ? (
              <span className="pointer-events-none absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] font-semibold text-muted-foreground" role="status">
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                {borrador.documento.replace(/\D/g, "").length === 11 ? "SUNAT" : "RENIEC"}
              </span>
            ) : props.consultaExterna?.estado === "encontrado" ? (
              <span
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded border border-sistema/50 bg-sistema/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-sistema"
                title={[`Datos de ${props.consultaExterna.consulta.fuente}`, props.consultaExterna.consulta.estado, props.consultaExterna.consulta.condicion, props.consultaExterna.consulta.direccion].filter(Boolean).join(" · ")}
              >
                {props.consultaExterna.consulta.fuente}
              </span>
            ) : props.consultaExterna?.estado === "sinDatos" ? (
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground" title={props.consultaExterna.mensaje}>
                <Info className="size-3.5" aria-label={props.consultaExterna.mensaje} />
              </span>
            ) : null}
          </div>
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

      <AnimatePresence>
        {calendarioAbierto && celdaFecha ? (
          <DateCalendar
            key="calendario"
            ancla={celdaFecha}
            valor={borrador.fechaOperacion}
            hoy={props.calendario.hoy}
            desde={props.calendario.desde}
            hasta={props.calendario.hasta}
            marcas={props.calendario.marcas}
            etiquetaRango="Periodo de la hoja"
            alElegir={(fecha) => {
              props.alCambiarCabecera("fechaOperacion", fecha);
              cerrarCalendario(true);
            }}
            alCerrar={cerrarCalendario}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
