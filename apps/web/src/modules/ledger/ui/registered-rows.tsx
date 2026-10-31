import type { Voucher } from "@conciliacion/contracts";
import { Lock, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { fechaCorta, importe } from "@/shared/lib/dates";
import { CELDA, GRILLA } from "./sheet-styles";

type Props = {
  vouchers: Voucher[];
  enEdicion: ReadonlySet<string>;
  editables: ReadonlySet<string>;
  alEditar: (voucher: Voucher) => void;
};

export function RegisteredRows({ vouchers, enEdicion, editables, alEditar }: Props) {
  let fila = 0;
  return (
    <>
      {vouchers.map((voucher) => {
        if (enEdicion.has(voucher.id)) {
          return null;
        }
        const anulado = voucher.estado === "ANULADO";
        return voucher.lineas.map((linea, indice) => {
          fila += 1;
          const primera = indice === 0;
          return (
            <div
              key={linea.id}
              className={cn(GRILLA, "border-b border-border/60 text-[#c9d7e4] hover:bg-muted/60", anulado && "text-muted-foreground line-through decoration-destructive/60")}
              title={anulado && voucher.motivoAnulacion ? `Anulado: ${voucher.motivoAnulacion}` : undefined}
            >
              <div className={cn(CELDA, "justify-center text-[11px] text-muted-foreground no-underline")}>{fila}</div>
              <div className={cn(CELDA, "tabular-nums")}>{primera ? voucher.nroOperacion ?? "" : ""}</div>
              <div className={cn(CELDA, "tabular-nums", !primera && "border-l-2 border-l-primary/40")}>{primera ? voucher.codigo : ""}</div>
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
      })}
    </>
  );
}
