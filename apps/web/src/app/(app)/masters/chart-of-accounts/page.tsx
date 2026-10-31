import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { cuentasContablesQuerySchema, paginaCuentasContablesSchema, ROLES_EDITAN_MAESTROS, ETIQUETAS_CLASE_CUENTA_CONTABLE } from "@conciliacion/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionCuentaContable } from "@/modules/masters/actions";
import { ChartImportDialog } from "@/modules/masters/ui/chart-import-dialog";
import { DestinationsDialog } from "@/modules/masters/ui/destinations-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Plan contable" };

type Props = { searchParams: Record<string, string | string[] | undefined> };

function valor(parametro: string | string[] | undefined): string | undefined {
  return typeof parametro === "string" && parametro.trim() !== "" ? parametro.trim() : undefined;
}

export default async function ChartOfAccountsPage({ searchParams }: Props) {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const consulta = cuentasContablesQuerySchema.parse({
    q: valor(searchParams.q),
    movimiento: valor(searchParams.movimiento),
    pagina: valor(searchParams.pagina),
    porPagina: 50,
  });
  const pagina = await api("/chart-of-accounts", paginaCuentasContablesSchema, {
    consulta: { q: consulta.q, movimiento: consulta.movimiento, pagina: consulta.pagina, porPagina: consulta.porPagina },
  });

  const enlace = (numero: number): string => {
    const parametros = new URLSearchParams();
    if (consulta.q) {
      parametros.set("q", consulta.q);
    }
    if (consulta.movimiento !== undefined) {
      parametros.set("movimiento", String(consulta.movimiento));
    }
    parametros.set("pagina", String(numero));
    return `?${parametros.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Maestros"
        titulo="Plan contable"
        descripcion="Cuentas que se usan en la columna CTA. Solo las cuentas de movimiento se pueden registrar."
        acciones={editable ? <ChartImportDialog /> : null}
      />

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="grid gap-1.5">
          <Label htmlFor="buscar-cuenta">Buscar por código o denominación</Label>
          <Input id="buscar-cuenta" name="q" defaultValue={consulta.q} className="w-72" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-movimiento">Tipo de cuenta</Label>
          <select
            id="filtro-movimiento"
            name="movimiento"
            defaultValue={consulta.movimiento === undefined ? "" : String(consulta.movimiento)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">Todas</option>
            <option value="true">Solo de movimiento</option>
            <option value="false">Solo agrupadoras</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
        {consulta.q || consulta.movimiento !== undefined ? (
          <Button asChild variant="ghost">
            <Link href="?">Limpiar</Link>
          </Button>
        ) : null}
      </form>

      <Card className="overflow-hidden">
        {pagina.total === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {consulta.q || consulta.movimiento !== undefined
              ? "Ninguna cuenta coincide con la búsqueda."
              : "Aún no hay plan contable. Impórtalo desde el Excel con el botón Importar plan contable."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Denominación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Clase</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead>Amarre</TableHead>
                <TableHead>Estado</TableHead>
                {editable ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagina.items.map((cuenta) => (
                <TableRow key={cuenta.codigo}>
                  <TableCell className="font-semibold tabular-nums text-white" style={{ paddingLeft: `${0.5 + (cuenta.nivel - 1) * 0.9}rem` }}>
                    {cuenta.codigo}
                  </TableCell>
                  <TableCell className={cuenta.deMovimiento ? "" : "font-semibold text-white"}>{cuenta.denominacion}</TableCell>
                  <TableCell className="tabular-nums">{cuenta.tipo}</TableCell>
                  <TableCell>{ETIQUETAS_CLASE_CUENTA_CONTABLE[cuenta.clase]}</TableCell>
                  <TableCell>
                    {cuenta.deMovimiento ? (
                      <Badge variant="outline" className="border-sistema/40 text-sistema">
                        Movimiento
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Agrupadora</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sistema">
                    {cuenta.destinoDebeCodigo && cuenta.destinoHaberCodigo ? `${cuenta.destinoDebeCodigo} / ${cuenta.destinoHaberCodigo}` : ""}
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={cuenta.activa} />
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {cuenta.deMovimiento ? (
                          <DestinationsDialog codigo={cuenta.codigo} denominacion={cuenta.denominacion} destinoDebe={cuenta.destinoDebeCodigo} destinoHaber={cuenta.destinoHaberCodigo} />
                        ) : null}
                        <ActivationButton accion={cambiarActivacionCuentaContable.bind(null, cuenta.codigo)} activo={cuenta.activa} nombre={`la cuenta ${cuenta.codigo}`} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Pagination pagina={pagina.pagina} porPagina={pagina.porPagina} total={pagina.total} enlace={enlace} />
    </div>
  );
}
