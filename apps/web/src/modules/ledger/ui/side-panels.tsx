import type { ReactNode } from "react";
import type { EntidadConHistorial } from "@conciliacion/contracts";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ObservacionHoja = { clave: string; fila: number; nivel: "error" | "aviso"; mensaje: string };

const ATAJOS: [string, string][] = [
  ["Tab", "Siguiente celda, igual que en Excel"],
  ["Enter", "En COD: nueva fila con la misma fecha"],
  ["F4", "Copiar el valor de la celda de arriba"],
  ["Alt+L", "Agregar línea al mismo voucher"],
  ["Alt+D", "Duplicar la fila anterior"],
  ["Alt+N", "Fila nueva"],
  ["Alt+Shift+↑↓", "Mover la fila arriba o abajo"],
  ["Ctrl+Enter", "Registrar todas las filas listas"],
];

function Panel({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      {descripcion ? <p className="mb-3 mt-0.5 text-xs text-muted-foreground">{descripcion}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

export function SidePanels({ observaciones, entidad, documentoEnfocado }: { observaciones: ObservacionHoja[]; entidad: EntidadConHistorial | null; documentoEnfocado: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Panel titulo="Control de la hoja" descripcion="Nada se registra con errores. Los avisos se pueden aceptar.">
        {observaciones.length === 0 ? (
          <p className="text-xs text-exito">Sin observaciones en las filas en edición.</p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
            {observaciones.map((observacion) => (
              <li key={observacion.clave} className="flex items-start gap-2 text-xs leading-relaxed">
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded", observacion.nivel === "error" ? "bg-destructive/20 text-destructive" : "bg-[#4b3918] text-[#ffda79]")}>
                  {observacion.nivel === "error" ? <X className="size-3" strokeWidth={3} aria-label="Error" /> : <AlertTriangle className="size-3" aria-label="Aviso" />}
                </span>
                <span>
                  <b className="text-white">Fila {observacion.fila}</b> <span className="text-muted-foreground">· {observacion.mensaje}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel titulo="Lo que el sistema ya sabe" descripcion="Historial del proveedor de la fila activa.">
        {entidad ? (
          <div>
            <p className="text-sm font-semibold text-white">{entidad.razonSocial}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {entidad.numeroDocumento} · {entidad.usos} {entidad.usos === 1 ? "movimiento registrado" : "movimientos registrados"}
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {entidad.detalles.map((detalle) => (
                <li key={detalle.detalle} className="flex items-center justify-between gap-3 rounded-md bg-muted px-2.5 py-1.5 text-[11px]">
                  <span className="truncate">{detalle.detalle}</span>
                  <span className="shrink-0 text-sistema">
                    CTA {detalle.cuentaContableCodigo} · COD {detalle.medioPagoCodigo}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {documentoEnfocado ? `El documento ${documentoEnfocado} aún no está registrado. Si es nuevo, se creará al registrar.` : "Enfoca una fila para ver su proveedor."}
          </p>
        )}
      </Panel>

      <Panel titulo="Teclado">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
          {ATAJOS.map(([tecla, accion]) => (
            <div key={tecla} className="contents">
              <dt>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-primary">{tecla}</kbd>
              </dt>
              <dd>{accion}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
