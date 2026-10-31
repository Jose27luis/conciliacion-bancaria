import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";
import { periodoAnualSchema, resumenAnualSchema, resumenMensualSchema, ROLES_EDITAN_MAESTROS } from "@conciliacion/contracts";
import { MESES } from "@conciliacion/contracts/enums";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leerPeriodo, nombreDeMes, opcionesDeMes } from "@/modules/ledger/ui/month-options";
import { PeriodActions } from "@/modules/reports/ui/period-actions";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { hoyEnLima, mesActual } from "@/shared/lib/dates";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = { title: "Resumen y cierre" };

type Props = { searchParams: Record<string, string | string[] | undefined> };

function dinero(valor: string | null): string {
  return valor === null ? "Sin apertura" : Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SummaryPage({ searchParams }: Props) {
  const sesion = await exigirSesion();
  const actual = mesActual(hoyEnLima());
  const periodo = leerPeriodo(searchParams.periodo, actual);
  const [resumen, anual, meses] = await Promise.all([
    api("/reports/summary", resumenMensualSchema, { consulta: { anio: periodo.anio, mes: periodo.mes } }),
    api("/reports/year", resumenAnualSchema, { consulta: { anio: periodo.anio } }),
    api("/periods", periodoAnualSchema.array(), { consulta: { anio: periodo.anio } }),
  ]);
  const nombre = nombreDeMes(periodo);
  const cerrado = resumen.periodo.estado === "CERRADO";
  const futuro = periodo.anio * 12 + periodo.mes > actual.anio * 12 + actual.mes;
  const sinApertura = resumen.cuentas.filter((cuenta) => cuenta.apertura === null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Registro"
        titulo="Resumen y cierre"
        descripcion="Saldos de cada cuenta por mes y cierre de periodos."
        acciones={
          <PeriodActions
            anio={periodo.anio}
            mes={periodo.mes}
            nombre={nombre}
            cerrado={cerrado}
            puedeCerrar={ROLES_EDITAN_MAESTROS.includes(sesion.rol) && !futuro}
            puedeReabrir={sesion.rol === "ADMIN"}
            vouchers={resumen.periodo.vouchers}
          />
        }
      />

      <form className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="resumen-periodo">Periodo</Label>
          <select id="resumen-periodo" name="periodo" defaultValue={`${periodo.anio}-${periodo.mes}`} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:dark]">
            {opcionesDeMes(actual, periodo).map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Ver
        </Button>
      </form>

      <nav aria-label={`Meses de ${periodo.anio}`} className="flex flex-wrap gap-1.5">
        {meses.map((mes) => {
          const seleccionado = mes.mes === periodo.mes;
          return (
            <Link
              key={mes.mes}
              href={`?periodo=${mes.anio}-${mes.mes}`}
              aria-current={seleccionado ? "page" : undefined}
              title={mes.estado === "CERRADO" ? `Cerrado por ${mes.cerradoPorNombre ?? ""}` : `${mes.vouchers} vouchers`}
              className={cn(
                "flex min-w-[78px] flex-col rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                seleccionado ? "border-primary bg-accent text-white" : "border-border bg-card text-muted-foreground hover:border-input",
              )}
            >
              <span className="flex items-center gap-1 font-semibold">
                {mes.estado === "CERRADO" ? <Lock className="size-3 text-primary" aria-label="Cerrado" /> : null}
                {(MESES[mes.mes - 1] ?? "").slice(0, 3)}
              </span>
              <span className="tabular-nums text-[10px]">{mes.vouchers} vouchers</span>
            </Link>
          );
        })}
      </nav>

      <Card className={cn("flex flex-wrap items-center gap-3 p-4 text-sm", cerrado ? "border-primary/50" : "")}>
        {cerrado ? <Lock className="size-5 text-primary" aria-hidden="true" /> : null}
        <span className="font-semibold text-white">{nombre}</span>
        <span className="text-muted-foreground">
          {cerrado
            ? `Cerrado${resumen.periodo.cerradoPorNombre ? ` por ${resumen.periodo.cerradoPorNombre}` : ""}${resumen.periodo.cerradoEn ? ` el ${new Date(resumen.periodo.cerradoEn).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" })}` : ""}. No admite cambios.`
            : futuro
              ? "Aún no empieza."
              : "Abierto: se puede registrar y modificar."}
        </span>
        <span className="ml-auto tabular-nums text-muted-foreground">
          {resumen.periodo.vouchers} vouchers · {resumen.periodo.anulados} anulados
        </span>
      </Card>

      {sinApertura.length > 0 ? (
        <Card className="flex flex-wrap items-center gap-3 border-[#ffda79]/40 bg-[#272414] p-4 text-sm text-[#ffda79]">
          <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
          <span>
            {sinApertura.map((cuenta) => cuenta.nombre).join(", ")} {sinApertura.length === 1 ? "no tiene" : "no tienen"} saldo de apertura: se muestran sus movimientos, pero no sus saldos.
          </span>
          {ROLES_EDITAN_MAESTROS.includes(sesion.rol) ? (
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link href="/settings/treasury-accounts">Cargar saldos de apertura</Link>
            </Button>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {resumen.cuentas.map((cuenta) => {
          const simbolo = cuenta.moneda === "PEN" ? "S/" : "US$";
          return (
            <Card key={cuenta.cuentaTesoreriaId} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{cuenta.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {cuenta.moneda === "PEN" ? "Soles" : "Dólares"} · {cuenta.vouchers} vouchers{cuenta.anulados > 0 ? ` · ${cuenta.anulados} anulados` : ""}
                  </p>
                </div>
                {!cuenta.activa ? <span className="text-[10px] text-muted-foreground">Inactiva</span> : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Saldo inicial</dt>
                  <dd className="font-semibold tabular-nums text-white">
                    {cuenta.saldoInicial === null ? <span className="text-muted-foreground">Sin apertura</span> : `${simbolo} ${dinero(cuenta.saldoInicial)}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Saldo final</dt>
                  <dd className="text-lg font-semibold tabular-nums text-primary">
                    {cuenta.saldoFinal === null ? <span className="text-sm text-muted-foreground">Sin apertura</span> : `${simbolo} ${dinero(cuenta.saldoFinal)}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Ingresos</dt>
                  <dd className="tabular-nums text-exito">+ {dinero(cuenta.ingresos)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Egresos</dt>
                  <dd className="tabular-nums text-destructive">- {dinero(cuenta.egresos)}</dd>
                </div>
              </dl>
              {cuenta.apertura ? (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Apertura: {simbolo} {dinero(cuenta.apertura.saldo)} al 01/{String(cuenta.apertura.mes).padStart(2, "0")}/{cuenta.apertura.anio}
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Saldo final por mes · {periodo.anio}</h2>
          <p className="text-xs text-muted-foreground">Sin saldo de apertura se muestra el neto del mes (ingresos menos egresos) en gris.</p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Cuenta</TableHead>
                {MESES.map((mes, indice) => (
                  <TableHead key={mes} className={cn("text-right", indice + 1 === periodo.mes && "text-primary")}>
                    {mes.slice(0, 3)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {anual.cuentas.map((cuenta) => (
                <TableRow key={cuenta.cuentaTesoreriaId}>
                  <TableCell className="whitespace-nowrap font-semibold text-white">
                    {cuenta.nombre}
                    <span className="ml-1 text-[10px] text-muted-foreground">{cuenta.moneda === "PEN" ? "S/" : "US$"}</span>
                  </TableCell>
                  {cuenta.meses.map((mes) => {
                    const neto = Number(mes.ingresos) - Number(mes.egresos);
                    const vacio = (Number(mes.ingresos) === 0 && Number(mes.egresos) === 0 && mes.saldoFinal === null) || periodo.anio * 12 + mes.mes > actual.anio * 12 + actual.mes;
                    return (
                      <TableCell key={mes.mes} className={cn("whitespace-nowrap text-right tabular-nums", mes.mes === periodo.mes && "bg-accent/60")}>
                        {vacio ? (
                          <span className="text-muted-foreground">·</span>
                        ) : mes.saldoFinal !== null ? (
                          <span className="text-white">{dinero(mes.saldoFinal)}</span>
                        ) : (
                          <span className="text-muted-foreground">{dinero(neto.toFixed(2))}</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
