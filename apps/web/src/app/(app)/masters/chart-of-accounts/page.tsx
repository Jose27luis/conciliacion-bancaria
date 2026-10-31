import type { Metadata } from "next";
import Link from "next/link";
import { cuentasContablesQuerySchema, paginaCuentasContablesSchema, ROLES_EDITAN_MAESTROS, ETIQUETAS_CLASE_CUENTA_CONTABLE } from "@conciliacion/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionCuentaContable } from "@/modules/masters/actions";
import { AccountDialog } from "@/modules/masters/ui/account-dialog";
import { ChartImportDialog } from "@/modules/masters/ui/chart-import-dialog";
import { DestinationsDialog } from "@/modules/masters/ui/destinations-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { FilterSelect, LiveSearch } from "@/shared/ui/live-search";
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
        acciones={
          editable ? (
            <>
              <AccountDialog />
              <ChartImportDialog />
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap items-start gap-3" role="search">
        <LiveSearch
          id="buscar-cuenta"
          etiqueta="Buscar por código o denominación"
          ayuda="Busca mientras escribes; acepta palabras sueltas, sin tildes y con errores de tipeo."
          className="w-full max-w-md"
        />
        <FilterSelect
          id="filtro-movimiento"
          etiqueta="Tipo de cuenta"
          parametro="movimiento"
          opciones={[
            { valor: "", etiqueta: "Todas" },
            { valor: "true", etiqueta: "Solo de movimiento" },
            { valor: "false", etiqueta: "Solo agrupadoras" },
          ]}
        />
        {consulta.q || consulta.movimiento !== undefined ? (
          <Button asChild variant="ghost" className="mt-6">
            <Link href="?">Limpiar</Link>
          </Button>
        ) : null}
      </div>

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
                        <AccountDialog cuenta={cuenta} />
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
