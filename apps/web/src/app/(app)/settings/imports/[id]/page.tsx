import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from "lucide-react";
import { cuentaTesoreriaSchema, importacionSchema, ROLES_EDITAN_MAESTROS, uuidSchema } from "@conciliacion/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ConfirmForm } from "@/modules/imports/ui/confirm-form";
import { api, ErrorDeApi } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = { title: "Vista previa de importación" };

type Props = { params: { id: string }; searchParams: Record<string, string | string[] | undefined> };

async function cargar(id: string) {
  try {
    return await api(`/imports/${id}`, importacionSchema);
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi && error.estado === 404) {
      notFound();
    }
    throw error;
  }
}

export default async function ImportPage({ params, searchParams }: Props) {
  await exigirSesion(ROLES_EDITAN_MAESTROS);
  if (!uuidSchema.safeParse(params.id).success) {
    notFound();
  }
  const [importacion, cuentas] = await Promise.all([cargar(params.id), api("/treasury-accounts", cuentaTesoreriaSchema.array(), { consulta: { activas: true } })]);
  const filtro = searchParams.ver === "errores" || searchParams.ver === "avisos" ? searchParams.ver : "todas";
  const observaciones = importacion.observaciones.filter((observacion) => filtro === "todas" || (filtro === "errores" ? observacion.nivel === "error" : observacion.nivel === "aviso"));
  const errores = importacion.observaciones.filter((observacion) => observacion.nivel === "error").length;
  const vouchers = importacion.hojas.reduce((suma, hoja) => suma + hoja.vouchers, 0);
  const omitidos = importacion.hojas.reduce((suma, hoja) => suma + hoja.omitidos, 0);

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/settings/imports">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al historial
        </Link>
      </Button>
      <PageHeader
        seccion="Importar Excel"
        titulo={importacion.archivo}
        descripcion={`Subido por ${importacion.creadoPorNombre} el ${new Date(importacion.creadoEn).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "long", timeStyle: "short" })}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { titulo: "Vouchers válidos", valor: vouchers, clase: "text-exito" },
          { titulo: "Omitidos por errores", valor: omitidos, clase: omitidos > 0 ? "text-destructive" : "text-white" },
          { titulo: "Proveedores nuevos", valor: importacion.proveedoresNuevos, clase: "text-white" },
          { titulo: "Amarres detectados", valor: importacion.amarres.length, clase: "text-sistema" },
        ].map((dato) => (
          <Card key={dato.titulo} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{dato.titulo}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", dato.clase)}>{dato.valor}</p>
          </Card>
        ))}
      </div>

      {importacion.estado === "VALIDADA" ? (
        <ConfirmForm id={importacion.id} hojas={importacion.hojas} cuentas={cuentas.map(({ id, nombre, moneda }) => ({ id, nombre, moneda }))} />
      ) : (
        <Card className={cn("flex items-center gap-3 p-4 text-sm", importacion.estado === "IMPORTADA" ? "text-exito" : "text-muted-foreground")}>
          {importacion.estado === "IMPORTADA" ? <CheckCircle2 className="size-5" aria-hidden="true" /> : <X className="size-5" aria-hidden="true" />}
          {importacion.estado === "IMPORTADA" ? `Importación realizada: ${importacion.importados ?? 0} vouchers registrados.` : "Esta vista previa fue descartada; no se registró nada."}
          {importacion.estado === "IMPORTADA" ? (
            <Button asChild variant="outline" size="sm" className="ml-auto">
              <Link href="/ledger">Ver el libro de movimientos</Link>
            </Button>
          ) : null}
        </Card>
      )}

      {importacion.amarres.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-white">Amarres de destino detectados</h2>
          <p className="mb-3 text-xs text-muted-foreground">Vienen de las columnas de destino del Excel. Se configuran al confirmar, solo en cuentas que aún no tienen amarre.</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {importacion.amarres.map((amarre) => (
              <li key={amarre.cuentaContableCodigo} className="rounded-md bg-muted px-2.5 py-1.5 tabular-nums">
                <b className="text-white">{amarre.cuentaContableCodigo}</b> → {amarre.destinoDebeCodigo} / {amarre.destinoHaberCodigo}
                <span className="ml-1.5 text-muted-foreground">({amarre.lineas} líneas)</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Observaciones</h2>
            <p className="text-xs text-muted-foreground">
              Los errores omiten el voucher; los avisos se importan igual.
              {importacion.totalObservaciones > importacion.observaciones.length ? ` Se muestran ${importacion.observaciones.length} de ${importacion.totalObservaciones}.` : ""}
            </p>
          </div>
          <nav aria-label="Filtrar observaciones" className="flex gap-1">
            {[
              ["todas", `Todas (${importacion.observaciones.length})`],
              ["errores", `Errores (${errores})`],
              ["avisos", `Avisos (${importacion.observaciones.length - errores})`],
            ].map(([valor, etiqueta]) => (
              <Button key={valor} asChild size="sm" variant={filtro === valor ? "secondary" : "ghost"}>
                <Link href={`?ver=${valor ?? ""}`}>{etiqueta}</Link>
              </Button>
            ))}
          </nav>
        </div>
        {observaciones.length === 0 ? (
          <p className="p-6 text-sm text-exito">Sin observaciones.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Hoja</TableHead>
                <TableHead className="text-right">Fila</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead>Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observaciones.map((observacion, indice) => (
                <TableRow key={`${observacion.hoja}-${observacion.fila}-${indice}`}>
                  <TableCell>
                    {observacion.nivel === "error" ? (
                      <X className="size-4 text-destructive" aria-label="Error" />
                    ) : (
                      <AlertTriangle className="size-4 text-[#ffda79]" aria-label="Aviso" />
                    )}
                  </TableCell>
                  <TableCell>{observacion.hoja}</TableCell>
                  <TableCell className="text-right tabular-nums">{observacion.fila > 0 ? observacion.fila : ""}</TableCell>
                  <TableCell className="tabular-nums">{observacion.voucher ?? ""}</TableCell>
                  <TableCell className={observacion.nivel === "error" ? "text-destructive" : "text-[#ffda79]"}>{observacion.mensaje}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
