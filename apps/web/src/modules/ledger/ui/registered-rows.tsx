"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import type { Voucher } from "@conciliacion/contracts";
import { formatoVoucher } from "@conciliacion/contracts/rules";
import { Hand, HandGrab, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fechaCorta, importe } from "@/shared/lib/dates";
import { CELDA, GRILLA } from "./sheet-styles";
import { SortableRow, type ArrastreFila } from "./sortable-row";

type Props = {
  vouchers: Voucher[];
  enEdicion: ReadonlySet<string>;
  editables: ReadonlySet<string>;
  ordenable: boolean;
  motivoNoOrdenable: string | null;
  alEditar: (voucher: Voucher) => void;
  alOrdenar: (ids: string[]) => Promise<boolean>;
};

function mismoOrden(a: Voucher[], b: Voucher[]): boolean {
  return a.length === b.length && a.every((voucher, indice) => voucher.id === b[indice]?.id);
}

export function RegisteredRows({ vouchers, enEdicion, editables, ordenable, motivoNoOrdenable, alEditar, alOrdenar }: Props) {
  const [orden, setOrden] = useState(vouchers);
  const [guardando, setGuardando] = useState(false);
  const ordenActual = useRef(orden);
  ordenActual.current = orden;

  useEffect(() => {
    setOrden(vouchers);
  }, [vouchers]);

  const numeros = vouchers.map((voucher) => voucher.numero).sort((a, b) => a - b);

  const soltar = (): void => {
    const nuevo = ordenActual.current;
    if (mismoOrden(nuevo, vouchers)) {
      return;
    }
    const anuladoMovido = nuevo.find((voucher, posicion) => voucher.estado === "ANULADO" && voucher.numero !== numeros[posicion]);
    if (anuladoMovido) {
      toast.error(`El voucher anulado ${anuladoMovido.codigo} no puede cambiar de número. Mueve las filas sin pasar por encima de él.`);
      setOrden(vouchers);
      return;
    }
    setGuardando(true);
    alOrdenar(nuevo.map((voucher) => voucher.id))
      .then((correcto) => {
        if (!correcto) {
          setOrden(vouchers);
        }
      })
      .finally(() => setGuardando(false));
  };

  let fila = 0;
  const renderVoucher = (voucher: Voucher, posicion: number, arrastre: ArrastreFila | null) => {
    const anulado = voucher.estado === "ANULADO";
    const codigo = ordenable ? formatoVoucher(voucher.mes, numeros[posicion] ?? voucher.numero) : voucher.codigo;
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
            anulado && "text-muted-foreground line-through decoration-destructive/60",
            arrastre?.arrastrando && "bg-[#123150]",
          )}
          title={anulado && voucher.motivoAnulacion ? `Anulado: ${voucher.motivoAnulacion}` : undefined}
        >
          {primera && arrastre && !anulado ? (
            <button
              type="button"
              tabIndex={-1}
              disabled={guardando}
              onPointerDown={(evento) => {
                evento.preventDefault();
                arrastre.iniciar(evento);
              }}
              aria-label={`Mover el voucher ${voucher.codigo}`}
              title="Arrastra para mover el voucher; los números se reordenan"
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
            <div
              className={cn(CELDA, "justify-center text-[11px] text-muted-foreground no-underline")}
              title={primera && anulado && ordenable ? "Los anulados conservan su número y no se mueven" : primera && motivoNoOrdenable ? motivoNoOrdenable : undefined}
            >
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
          <div className={cn(CELDA, "justify-end tabular-nums")}>{importe(linea.egreso)}</div>
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
                aria-label={`Editar voucher ${voucher.codigo}`}
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

  if (!ordenable) {
    return <>{vouchers.map((voucher, posicion) => (enEdicion.has(voucher.id) ? null : <div key={voucher.id}>{renderVoucher(voucher, posicion, null)}</div>))}</>;
  }

  return (
    <Reorder.Group as="div" axis="y" values={orden} onReorder={setOrden}>
      {orden.map((voucher, posicion) => (
        <SortableRow key={voucher.id} valor={voucher} alSoltar={soltar}>
          {(arrastre) => renderVoucher(voucher, posicion, arrastre)}
        </SortableRow>
      ))}
    </Reorder.Group>
  );
}
