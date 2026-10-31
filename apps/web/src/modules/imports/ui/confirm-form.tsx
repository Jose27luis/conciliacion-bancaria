"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import type { HojaImportacion } from "@conciliacion/contracts";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ESTADO_INICIAL } from "@/shared/lib/form-state";
import { FormAlert } from "@/shared/ui/form-alert";
import { SubmitButton } from "@/shared/ui/submit-button";
import { confirmarImportacion, descartarImportacion } from "../actions";

type Cuenta = { id: string; nombre: string; moneda: "PEN" | "USD" };

type Props = { id: string; hojas: HojaImportacion[]; cuentas: Cuenta[] };

function dinero(valor: string): string {
  return Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ConfirmForm({ id, hojas, cuentas }: Props) {
  const router = useRouter();
  const [estado, despachar] = useFormState(
    confirmarImportacion.bind(
      null,
      id,
      hojas.map((hoja) => hoja.nombre),
    ),
    ESTADO_INICIAL,
  );
  const [estadoDescarte, despacharDescarte] = useFormState(() => descartarImportacion(id), ESTADO_INICIAL);

  useEffect(() => {
    for (const actual of [estado, estadoDescarte]) {
      if (actual.estado === "ok") {
        toast.success(actual.mensaje);
        router.refresh();
      }
    }
  }, [estado, estadoDescarte, router]);

  const total = hojas.reduce((suma, hoja) => suma + hoja.vouchers, 0);

  return (
    <div className="grid gap-4">
      <form action={despachar} className="grid gap-4" noValidate>
        <FormAlert estado={estado} />
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Hoja del Excel</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Meses</TableHead>
                <TableHead className="text-right">Vouchers</TableHead>
                <TableHead className="text-right">Omitidos</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Egresos</TableHead>
                <TableHead>Importar en</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hojas.map((hoja, indice) => {
                const opciones = cuentas.filter((cuenta) => cuenta.moneda === hoja.moneda);
                return (
                  <TableRow key={hoja.nombre}>
                    <TableCell className="font-semibold text-white">{hoja.nombre}</TableCell>
                    <TableCell>{hoja.moneda === "PEN" ? "Soles" : "Dólares"}</TableCell>
                    <TableCell className="text-xs tabular-nums">{hoja.meses.map((mes) => mes.slice(5)).join(", ")}</TableCell>
                    <TableCell className="text-right tabular-nums">{hoja.vouchers}</TableCell>
                    <TableCell className={hoja.omitidos > 0 ? "text-right tabular-nums text-destructive" : "text-right tabular-nums"}>{hoja.omitidos}</TableCell>
                    <TableCell className="text-right tabular-nums text-exito">{dinero(hoja.ingreso)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">{dinero(hoja.egreso)}</TableCell>
                    <TableCell>
                      <label htmlFor={`cuenta-${indice}`} className="sr-only">
                        Cuenta de tesorería para la hoja {hoja.nombre}
                      </label>
                      <select
                        id={`cuenta-${indice}`}
                        name={`cuenta-${indice}`}
                        defaultValue={hoja.cuentaSugeridaId ?? ""}
                        className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm text-foreground [color-scheme:dark]"
                      >
                        <option value="">No importar esta hoja</option>
                        {opciones.map((cuenta) => (
                          <option key={cuenta.id} value={cuenta.id}>
                            {cuenta.nombre}
                          </option>
                        ))}
                      </select>
                      {opciones.length === 0 ? (
                        <p className="mt-1 text-[11px] text-[#ffda79]">No hay cuentas en {hoja.moneda === "PEN" ? "soles" : "dólares"}; créala en Cuentas de tesorería.</p>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="mr-auto text-xs text-muted-foreground">
            Se registrarán hasta {total} vouchers con su número original. Los omitidos no se importan; corrígelos en el Excel y súbelo otra vez o regístralos a mano.
          </p>
          <SubmitButton textoEnviando="Importando, puede tardar un momento">Confirmar importación</SubmitButton>
        </div>
      </form>
      <form action={despacharDescarte} className="flex justify-end">
        <FormAlert estado={estadoDescarte} />
        <SubmitButton variant="ghost" textoEnviando="Descartando">
          Descartar vista previa
        </SubmitButton>
      </form>
    </div>
  );
}
