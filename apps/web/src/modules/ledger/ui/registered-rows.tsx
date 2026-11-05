"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import type { Voucher } from "@conciliacion/contracts";
import { formatoVoucher } from "@conciliacion/contracts/rules";
import { Hand, HandGrab, Lock, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta, importe } from "@/shared/lib/dates";
import { CELDA, GRILLA } from "./sheet-styles";
import { SortableRow, type ArrastreFila } from "./sortable-row";

type Props = {
  vouchers: Voucher[];
  enEdicion: ReadonlySet<string>;
  editables: ReadonlySet<string>;
  mostrarAnulados: boolean;
  ordenable: boolean;
  motivoNoOrdenable: string | null;
  alEditar: (voucher: Voucher) => void;
  alOrdenar: (ids: string[]) => Promise<boolean>;
};

function mismoOrden(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, indice) => id === b[indice]);
}

export function RegisteredRows({ vouchers, enEdicion, editables, mostrarAnulados, ordenable, motivoNoOrdenable, alEditar, alOrdenar }: Props) {
  const vigentes = useMemo(() => vouchers.filter((voucher) => voucher.estado === "REGISTRADO"), [vouchers]);
  const anulados = useMemo(() => vouchers.filter((voucher) => voucher.estado === "ANULADO"), [vouchers]);
  const idsOriginales = useMemo(() => vigentes.map((voucher) => voucher.id), [vigentes]);
  const numeros = useMemo(() => vigentes.map((voucher) => voucher.numero).sort((a, b) => a - b), [vigentes]);
  const porId = useMemo(() => new Map(vigentes.map((voucher) => [voucher.id, voucher])), [vigentes]);

  const [orden, setOrden] = useState(idsOriginales);
  const [guardando, setGuardando] = useState(false);
  const ordenActual = useRef(orden);
  ordenActual.current = orden;

  useEffect(() => {
    setOrden(idsOriginales);
  }, [idsOriginales]);

  const visibles = orden.flatMap((id) => {
    const voucher = porId.get(id);
    return voucher && !enEdicion.has(id) ? [voucher] : [];
  });

  const reordenar = (nuevos: Voucher[]): void => {
    const ids = nuevos.map((voucher) => voucher.id);
    setOrden((previo) => {
      let siguiente = 0;
      return previo.map((id) => {
        if (enEdicion.has(id)) {
          return id;
        }
        const reemplazo = ids[siguiente] ?? id;
        siguiente += 1;
        return reemplazo;
      });
    });
  };

  const soltar = (): void => {
    const nuevo = ordenActual.current;
    if (mismoOrden(nuevo, idsOriginales)) {
      return;
    }
    setGuardando(true);
    alOrdenar(nuevo)
      .then((correcto) => {
        if (!correcto) {
          setOrden(idsOriginales);
        }
      })
      .finally(() => setGuardando(false));
  };

  const posicionDe = new Map(orden.map((id, indice) => [id, indice]));
  let fila = 0;

  const renderVoucher = (voucher: Voucher, arrastre: ArrastreFila | null) => {
    const anulado = voucher.estado === "ANULADO";
    const posicion = posicionDe.get(voucher.id);
    const codigo = !anulado && posicion !== undefined ? formatoVoucher(voucher.mes, numeros[posicion] ?? voucher.numero) : voucher.codigo;
    const renumerado = codigo !== voucher.codigo;
    return voucher.lineas.map((linea, indice) => {
      fila += 1;
      const primera = indice === 0;
      return (
        <div
          key={linea.id}
          className={cn(
            GRILLA,
            "border-b border-border/60 bg-[#0a1c30] text-[#c9d7e4] hover:bg-muted/60",
            anulado && "bg-[#0a1726] text-muted-foreground line-through decoration-destructive/60",
            arrastre?.arrastrando && "bg-[#123150]",
          )}
          title={anulado && voucher.motivoAnulacion ? `Anulado: ${voucher.motivoAnulacion}` : undefined}
        >
          {primera && arrastre ? (
            <button
              type="button"
              tabIndex={-1}
              disabled={guardando}
              onPointerDown={(evento) => {
                evento.preventDefault();
                arrastre.iniciar(evento);
              }}
              aria-label={`Mover el voucher ${codigo}`}
              title="Arrastra para mover el voucher; el número se ajusta a la fila"
              className={cn(
                CELDA,
                "group/mano relative touch-none select-none justify-center text-[11px] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-wait disabled:opacity-60",
                arrastre.arrastrando ? "cursor-grabbing bg-primary/15 text-primary" : "cursor-grab",
              )}
            >
              <span className={cn("transition-opacity", arrastre.arrastrando ? "opacity-0" : "group-hover/mano:opacity-0")}>{fila}</span>
              {arrastre.arrastrando ? (
                <HandGrab className="absolute size-4" aria-hidden="true" />
              ) : (
                <Hand className="absolute size-4 -rotate-12 opacity-0 transition-all group-hover/mano:rotate-0 group-hover/mano:opacity-100" aria-hidden="true" />
              )}
            </button>
          ) : (
            <div className={cn(CELDA, "justify-center text-[11px] text-muted-foreground no-underline")} title={primera && !anulado && motivoNoOrdenable ? motivoNoOrdenable : undefined}>
              {fila}
            </div>
          )}
          <div className={cn(CELDA, "tabular-nums")}>{primera ? voucher.nroOperacion ?? "" : ""}</div>
          <div
            className={cn(CELDA, "tabular-nums transition-colors", !primera && "border-l-2 border-l-primary/40", primera && renumerado && "font-semibold text-primary")}
            title={primera && renumerado ? `Antes ${voucher.codigo}` : undefined}
          >
            {primera ? codigo : ""}
          </div>
          <div className={cn(CELDA, "tabular-nums")}>{primera ? fechaCorta(voucher.fechaOperacion) : ""}</div>
          <div className={cn(CELDA, "tabular-nums")}>{primera ? voucher.analitico : ""}</div>
          <div className={cn(CELDA, "tabular-nums")}>{primera ? voucher.entidad.numeroDocumento : ""}</div>
          <div className={CELDA} title={voucher.entidad.razonSocial}>
            {primera ? voucher.entidad.razonSocial : ""}
          </div>
          <div className={CELDA} title={linea.detalle}>
            {linea.detalle}
          </div>
          <div className={cn(CELDA, "justify-end tabular-nums")}>{primera ? voucher.tipoCambio : ""}</div>
          <div className={cn(CELDA, "justify-end tabular-nums")}>{importe(linea.ingreso)}</div>
          <div className={cn(CELDA, "justify-end tabular-nums")}>{Number(linea.ingreso) === 0 && Number(linea.egreso) === 0 ? "0.00" : importe(linea.egreso)}</div>
          <div className={cn(CELDA, "tabular-nums")} title={`${linea.cuentaContableCodigo} · ${linea.cuentaContableDenominacion}`}>
            {linea.cuentaContableCodigo}
          </div>
          <div className={cn(CELDA, "tabular-nums")} title={`${voucher.medioPagoCodigo} · ${voucher.medioPagoDescripcion}`}>
            {primera ? voucher.medioPagoCodigo : ""}
          </div>
          <div className={cn(CELDA, "justify-center gap-1 no-underline")}>
            {primera && anulado ? <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">Anulado</span> : null}
            {primera && !anulado && editables.has(voucher.id) ? (
              <button
                type="button"
                onClick={() => alEditar(voucher)}
                title="Editar voucher"
                aria-label={`Editar voucher ${codigo}`}
                className="grid size-6 place-items-center rounded text-primary hover:bg-accent"
              >
                <Pencil className="size-3.5" />
              </button>
            ) : null}
            {primera && !anulado && !editables.has(voucher.id) ? <Lock className="size-3.5 text-muted-foreground" aria-label="Registrado" /> : null}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      {ordenable ? (
        <Reorder.Group as="div" axis="y" values={visibles} onReorder={reordenar}>
          {visibles.map((voucher) => (
            <SortableRow key={voucher.id} valor={voucher} alSoltar={soltar}>
              {(arrastre) => renderVoucher(voucher, arrastre)}
            </SortableRow>
          ))}
        </Reorder.Group>
      ) : (
        visibles.map((voucher) => <div key={voucher.id}>{renderVoucher(voucher, null)}</div>)
      )}
      {mostrarAnulados && anulados.length > 0 ? (
        <>
          <div className="flex h-8 min-w-[1420px] items-center gap-2 border-b border-border/60 bg-destructive/5 px-4 text-[10px] font-bold uppercase tracking-[0.16em] text-destructive/80">
            Anulados · conservan su número y no cuentan en el orden
          </div>
          {anulados.map((voucher) => (
            <div key={voucher.id}>{renderVoucher(voucher, null)}</div>
          ))}
        </>
      ) : null}
    </>
  );
}
