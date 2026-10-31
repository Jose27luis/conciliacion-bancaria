import type { Metadata } from "next";
import { ATAJO_MAXIMO, ATAJO_MINIMO, medioPagoSchema, plantillaSchema, ROLES_EDITAN_MAESTROS, tipoComprobanteSchema } from "@conciliacion/contracts";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionPlantilla } from "@/modules/templates/actions";
import { TemplateDialog } from "@/modules/templates/ui/template-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { importe } from "@/shared/lib/dates";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Plantillas de atajos" };

export default async function TemplatesPage() {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const [plantillas, medios, tipos] = await Promise.all([
    api("/templates", plantillaSchema.array()),
    api("/payment-methods", medioPagoSchema.array()),
    api("/voucher-types", tipoComprobanteSchema.array()),
  ]);
  const ocupados = new Set(plantillas.flatMap((plantilla) => (plantilla.atajo === null ? [] : [plantilla.atajo])));
  const libres = Array.from({ length: ATAJO_MAXIMO - ATAJO_MINIMO + 1 }, (_valor, indice) => ATAJO_MINIMO + indice).filter((tecla) => !ocupados.has(tecla));
  const mediosActivos = medios.filter((medio) => medio.activo).map(({ codigo, descripcion }) => ({ codigo, descripcion }));
  const tiposActivos = tipos.filter((tipo) => tipo.activo).map(({ codigo, descripcion }) => ({ codigo, descripcion }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Maestros"
        titulo="Plantillas de atajos"
        descripcion="Movimientos que se repiten (ITF, mantenimiento, peajes). En el registro rápido, Alt+1 a Alt+9 crea la fila ya llena."
        acciones={editable ? <TemplateDialog libres={libres} medios={mediosActivos} tipos={tiposActivos} /> : null}
      />
      <Card className="overflow-hidden">
        {plantillas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aún no hay plantillas. Crea una por cada movimiento que registres seguido con los mismos datos.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Tecla</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>CTA</TableHead>
                  <TableHead>COD</TableHead>
                  <TableHead>Analítico</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  {editable ? <TableHead className="text-right">Acciones</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantillas.map((plantilla) => (
                  <TableRow key={plantilla.id}>
                    <TableCell>
                      {plantilla.atajo === null ? (
                        <span className="text-muted-foreground">Sin tecla</span>
                      ) : (
                        <kbd className="rounded border border-input bg-background px-1.5 py-0.5 text-[11px] font-semibold text-primary">Alt+{plantilla.atajo}</kbd>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-white">{plantilla.etiqueta}</TableCell>
                    <TableCell>
                      <span className="block max-w-[220px] truncate">{plantilla.entidad.razonSocial}</span>
                      <span className="block text-[11px] tabular-nums text-muted-foreground">{plantilla.entidad.numeroDocumento}</span>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{plantilla.detalle}</TableCell>
                    <TableCell className="tabular-nums">{plantilla.cuentaContableCodigo}</TableCell>
                    <TableCell className="tabular-nums">{plantilla.medioPagoCodigo}</TableCell>
                    <TableCell className="tabular-nums">{plantilla.analitico || "Vacío"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {plantilla.importe ? `${plantilla.tipo === "INGRESO" ? "+" : "-"} ${importe(plantilla.importe)}` : <span className="text-muted-foreground">Variable</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge activo={plantilla.activa} />
                    </TableCell>
                    {editable ? (
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {plantilla.activa ? <TemplateDialog plantilla={plantilla} libres={libres} medios={mediosActivos} tipos={tiposActivos} /> : null}
                          <ActivationButton accion={cambiarActivacionPlantilla.bind(null, plantilla.id)} activo={plantilla.activa} nombre={`la plantilla ${plantilla.etiqueta}`} />
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
