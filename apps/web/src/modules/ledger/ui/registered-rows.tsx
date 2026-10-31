import type { Voucher } from "@conciliacion/contracts";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CELDA, GRILLA } from "./sheet-styles";

function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia ?? ""}/${mes ?? ""}/${anio ?? ""}`;
}

function monto(valor: string): string {
  const numero = Number(valor);
  return numero === 0 ? "" : numero.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function RegisteredRows({ vouchers }: { vouchers: Voucher[] }) {
  let fila = 0;
  return (
    <>
      {vouchers.map((voucher) =>
        voucher.lineas.map((linea, indice) => {
          fila += 1;
          const primera = indice === 0;
          return (
            <div key={linea.id} className={cn(GRILLA, "border-b border-border/60 text-[#c9d7e4] hover:bg-muted/60", voucher.estado === "ANULADO" && "line-through opacity-50")}>
              <div className={cn(CELDA, "justify-center text-[11px] text-muted-foreground")}>{fila}</div>
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
              <div className={cn(CELDA, "justify-end tabular-nums")}>{monto(linea.ingreso)}</div>
              <div className={cn(CELDA, "justify-end tabular-nums")}>{monto(linea.egreso)}</div>
              <div className={cn(CELDA, "tabular-nums")} title={`${linea.cuentaContableCodigo} · ${linea.cuentaContableDenominacion}`}>
                {linea.cuentaContableCodigo}
              </div>
              <div className={cn(CELDA, "tabular-nums")} title={`${voucher.medioPagoCodigo} · ${voucher.medioPagoDescripcion}`}>
                {primera ? voucher.medioPagoCodigo : ""}
              </div>
              <div className={cn(CELDA, "justify-center")}>
                {primera ? <Lock className="size-3.5 text-muted-foreground" aria-label={voucher.estado === "ANULADO" ? "Anulado" : "Registrado"} /> : null}
              </div>
            </div>
          );
        }),
      )}
    </>
  );
}
