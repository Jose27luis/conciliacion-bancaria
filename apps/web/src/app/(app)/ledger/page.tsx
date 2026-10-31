import type { Metadata } from "next";
import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { cuentaTesoreriaSchema, libroQuerySchema, libroSchema, puedeModificarVoucher, ROLES_REGISTRAN } from "@conciliacion/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leerPeriodo, nombreDeMes } from "@/modules/ledger/ui/month-options";
import { LedgerFilters } from "@/modules/ledger/ui/ledger-filters";
import { VoidDialog } from "@/modules/ledger/ui/void-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { fechaCorta, hoyEnLima, importe, mesActual } from "@/shared/lib/dates";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

export const metadata: Metadata = { title: "Libro de movimientos" };

type Props = { searchParams: Record<string, string | string[] | undefined> };

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

function dinero(valor: string): string {
  return Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function LedgerPage({ searchParams }: Props) {
  const sesion = await exigirSesion();
  const actual = mesActual(hoyEnLima());
  const periodo = leerPeriodo(searchParams.periodo, actual);
  const consulta = libroQuerySchema.parse({
    cuenta: texto(searchParams.cuenta),
    anio: periodo.anio,
    mes: periodo.mes,
    q: texto(searchParams.q),
    estado: texto(searchParams.estado) ?? "REGISTRADO",
    pagina: texto(searchParams.pagina) ?? 1,
    porPagina: 30,
  });

  const [cuentas, libro] = await Promise.all([
    api("/treasury-accounts", cuentaTesoreriaSchema.array()),
    api("/ledger/vouchers", libroSchema, {
      consulta: { cuenta: consulta.cuenta, anio: consulta.anio, mes: consulta.mes, q: consulta.q, estado: consulta.estado, pagina: consulta.pagina, porPagina: consulta.porPagina },
    }),
  ]);
  const puedeRegistrar = ROLES_REGISTRAN.includes(sesion.rol);

  const parametrosBase = new URLSearchParams({ periodo: `${consulta.anio}-${consulta.mes}`, estado: consulta.estado });
  if (consulta.cuenta) {
    parametrosBase.set("cuenta", consulta.cuenta);
  }
  if (consulta.q) {
    parametrosBase.set("q", consulta.q);
  }
  const enlacePagina = (numero: number): string => {
    const parametros = new URLSearchParams(parametrosBase);
    parametros.set("pagina", String(numero));
    return `?${parametros.toString()}`;
  };
  const exportar = new URLSearchParams({ anio: String(consulta.anio), mes: String(consulta.mes) });
  if (consulta.cuenta) {
    exportar.set("cuenta", consulta.cuenta);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Registro"
        titulo="Libro de movimientos"
        descripcion={`Vouchers de ${nombreDeMes(periodo)}. Edita o anula los que estén en un mes abierto.`}
        acciones={
          <Button asChild variant="outline">
            <a href={`/ledger/export?${exportar.toString()}`} download>
              <Download className="size-4" aria-hidden="true" />
              Exportar a Excel
            </a>
          </Button>
        }
      />

      <LedgerFilters
        cuentas={cuentas.map((cuenta) => ({ id: cuenta.id, nombre: cuenta.nombre }))}
        cuenta={consulta.cuenta}
        anio={consulta.anio}
        mes={consulta.mes}
        q={consulta.q}
        estado={consulta.estado}
        actual={actual}
      />

      {libro.totales.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {libro.totales.map((total) => {
            const simbolo = total.moneda === "PEN" ? "S/" : "US$";
            const neto = Number(total.ingreso) - Number(total.egreso);
            return (
              <Card key={total.moneda} className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Cuentas en {total.moneda === "PEN" ? "soles" : "dólares"}</p>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Ingresos</dt>
                    <dd className="font-semibold tabular-nums text-exito">{dinero(total.ingreso)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Egresos</dt>
                    <dd className="font-semibold tabular-nums text-destructive">{dinero(total.egreso)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Neto</dt>
                    <dd className="font-semibold tabular-nums text-white">
                      {simbolo} {dinero(neto.toFixed(2))}
                    </dd>
                  </div>
                </dl>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {libro.items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No hay vouchers que coincidan con el filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1180px] text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Analítico</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="text-right">Ingreso</TableHead>
                  <TableHead className="text-right">Egreso</TableHead>
                  <TableHead>CTA</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Registró</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {libro.items.map((voucher) => {
                  const anulado = voucher.estado === "ANULADO";
                  const filas = voucher.lineas.length;
                  const modificable = !anulado && puedeRegistrar && puedeModificarVoucher(sesion.rol, sesion.id, voucher.creadoPorId);
                  const simbolo = voucher.moneda === "PEN" ? "S/" : "US$";
                  return voucher.lineas.map((linea, indice) => (
                    <TableRow key={linea.id} className={cn(anulado && "text-muted-foreground", indice < filas - 1 && "border-b-0")}>
                      {indice === 0 ? (
                        <>
                          <TableCell rowSpan={filas} className="whitespace-nowrap align-top font-semibold tabular-nums text-white">
                            <span className={cn(anulado && "line-through")}>{voucher.codigo}</span>
                            {anulado ? (
                              <span className="mt-1 block w-fit rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive" title={voucher.motivoAnulacion ?? undefined}>
                                Anulado
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell rowSpan={filas} className="whitespace-nowrap align-top tabular-nums">
                            {fechaCorta(voucher.fechaOperacion)}
                          </TableCell>
                          <TableCell rowSpan={filas} className="align-top">
                            {voucher.cuentaTesoreriaNombre}
                            {voucher.moneda === "USD" ? <span className="block text-[10px] text-muted-foreground">T.C. {voucher.tipoCambio}</span> : null}
                          </TableCell>
                          <TableCell rowSpan={filas} className="whitespace-nowrap align-top tabular-nums">
                            {voucher.analitico}
                          </TableCell>
                          <TableCell rowSpan={filas} className="max-w-[220px] align-top">
                            <span className="block truncate" title={voucher.entidad.razonSocial}>
                              {voucher.entidad.razonSocial}
                            </span>
                            <span className="block text-[10px] tabular-nums text-muted-foreground">{voucher.entidad.numeroDocumento}</span>
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className="max-w-[260px]">
                        <span className="block truncate" title={linea.detalle}>
                          {linea.detalle}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{importe(linea.ingreso) ? `${simbolo} ${importe(linea.ingreso)}` : ""}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{importe(linea.egreso) ? `${simbolo} ${importe(linea.egreso)}` : ""}</TableCell>
                      <TableCell className="tabular-nums" title={linea.cuentaContableDenominacion}>
                        {linea.cuentaContableCodigo}
                      </TableCell>
                      {indice === 0 ? (
                        <>
                          <TableCell rowSpan={filas} className="align-top tabular-nums" title={voucher.medioPagoDescripcion}>
                            {voucher.medioPagoCodigo}
                          </TableCell>
                          <TableCell rowSpan={filas} className="align-top">
                            {voucher.creadoPorNombre}
                          </TableCell>
                          <TableCell rowSpan={filas} className="align-top">
                            {modificable ? (
                              <div className="flex justify-end gap-1">
                                <Button asChild variant="ghost" size="sm">
                                  <Link href={`/quick-entry?cuenta=${voucher.cuentaTesoreriaId}&anio=${voucher.anio}&mes=${voucher.mes}&editar=${voucher.id}`} aria-label={`Editar voucher ${voucher.codigo}`}>
                                    <Pencil className="size-3.5" aria-hidden="true" />
                                    Editar
                                  </Link>
                                </Button>
                                <VoidDialog
                                  voucherId={voucher.id}
                                  codigo={voucher.codigo}
                                  resumen={`${voucher.entidad.razonSocial} · ${fechaCorta(voucher.fechaOperacion)}`}
                                />
                              </div>
                            ) : anulado && voucher.motivoAnulacion ? (
                              <p className="text-right text-[11px] text-muted-foreground">{voucher.motivoAnulacion}</p>
                            ) : null}
                          </TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Pagination pagina={libro.pagina} porPagina={libro.porPagina} total={libro.total} enlace={enlacePagina} />
    </div>
  );
}
