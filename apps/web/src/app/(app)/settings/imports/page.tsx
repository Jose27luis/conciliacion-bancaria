import type { Metadata } from "next";
import Link from "next/link";
import { importacionResumenSchema, ROLES_EDITAN_MAESTROS } from "@conciliacion/contracts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadForm } from "@/modules/imports/ui/upload-form";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = { title: "Importar Excel" };

const ESTADOS = {
  VALIDADA: { texto: "Pendiente de confirmar", clase: "border-[#ffda79]/50 text-[#ffda79]" },
  IMPORTADA: { texto: "Importada", clase: "border-exito/40 text-exito" },
  DESCARTADA: { texto: "Descartada", clase: "text-muted-foreground" },
} as const;

export default async function ImportsPage() {
  await exigirSesion(ROLES_EDITAN_MAESTROS);
  const importaciones = await api("/imports", importacionResumenSchema.array());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Configuración"
        titulo="Importar Excel histórico"
        descripcion="Carga los meses que ya están en el Excel modelo para que el sistema arranque con tus proveedores, detalles y correlativos reales."
      />
      <UploadForm />
      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Historial</h2>
        </div>
        {importaciones.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aún no se ha subido ningún Excel.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Vouchers válidos</TableHead>
                <TableHead className="text-right">Omitidos</TableHead>
                <TableHead className="text-right">Importados</TableHead>
                <TableHead>Subido por</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importaciones.map((importacion) => (
                <TableRow key={importacion.id}>
                  <TableCell>
                    <Link href={`/settings/imports/${importacion.id}`} className="font-semibold text-primary hover:underline">
                      {importacion.archivo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={ESTADOS[importacion.estado].clase}>
                      {ESTADOS[importacion.estado].texto}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{importacion.vouchers}</TableCell>
                  <TableCell className="text-right tabular-nums">{importacion.omitidos}</TableCell>
                  <TableCell className="text-right tabular-nums">{importacion.importados ?? ""}</TableCell>
                  <TableCell>{importacion.creadoPorNombre}</TableCell>
                  <TableCell className="tabular-nums">
                    {new Date(importacion.creadoEn).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
