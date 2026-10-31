import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { entidadesQuerySchema, paginaEntidadesSchema, ROLES_EDITAN_MAESTROS } from "@conciliacion/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntityDialog } from "@/modules/entities/ui/entity-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { PageHeader } from "@/shared/ui/page-header";
import { Pagination } from "@/shared/ui/pagination";

export const metadata: Metadata = { title: "Proveedores y clientes" };

type Props = { searchParams: Record<string, string | string[] | undefined> };

function valor(parametro: string | string[] | undefined): string | undefined {
  return typeof parametro === "string" && parametro.trim() !== "" ? parametro.trim() : undefined;
}

export default async function EntitiesPage({ searchParams }: Props) {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const consulta = entidadesQuerySchema.parse({ q: valor(searchParams.q), pagina: valor(searchParams.pagina), porPagina: 50 });
  const pagina = await api("/entities", paginaEntidadesSchema, { consulta: { q: consulta.q, pagina: consulta.pagina, porPagina: consulta.porPagina } });

  const enlace = (numero: number): string => {
    const parametros = new URLSearchParams();
    if (consulta.q) {
      parametros.set("q", consulta.q);
    }
    parametros.set("pagina", String(numero));
    return `?${parametros.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Maestros"
        titulo="Proveedores y clientes"
        descripcion="Se crean solos al registrar. Aquí se corrige la razón social y los detalles que el sistema aprendió."
      />

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="grid gap-1.5">
          <Label htmlFor="buscar-entidad">Buscar por documento o razón social</Label>
          <Input id="buscar-entidad" name="q" defaultValue={consulta.q} className="w-72" />
        </div>
        <Button type="submit" variant="secondary">
          <Search className="size-4" aria-hidden="true" />
          Buscar
        </Button>
        {consulta.q ? (
          <Button asChild variant="ghost">
            <Link href="?">Limpiar</Link>
          </Button>
        ) : null}
      </form>

      <Card className="overflow-hidden">
        {pagina.total === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{consulta.q ? "Ningún proveedor coincide con la búsqueda." : "Aún no hay proveedores. Se crean al registrar el primer movimiento con su documento."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Razón social</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Movimientos</TableHead>
                <TableHead className="text-right">Detalles activos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagina.items.map((entidad) => (
                <TableRow key={entidad.id}>
                  <TableCell className="font-semibold tabular-nums text-white">{entidad.numeroDocumento}</TableCell>
                  <TableCell>{entidad.razonSocial}</TableCell>
                  <TableCell>{entidad.tipoDocumento === "EXTRANJERO" ? "Extranjero" : entidad.tipoDocumento}</TableCell>
                  <TableCell className="text-right tabular-nums">{entidad.usos}</TableCell>
                  <TableCell className="text-right tabular-nums">{entidad.detallesActivos}</TableCell>
                  <TableCell className="text-right">
                    <EntityDialog id={entidad.id} razonSocial={entidad.razonSocial} editable={editable} />
                  </TableCell>
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
