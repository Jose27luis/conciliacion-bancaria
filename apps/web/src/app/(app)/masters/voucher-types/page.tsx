import type { Metadata } from "next";
import { ROLES_EDITAN_MAESTROS, tipoComprobanteSchema } from "@conciliacion/contracts";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionTipoComprobante } from "@/modules/masters/actions";
import { VoucherTypeDialog } from "@/modules/masters/ui/voucher-type-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Tipos de comprobante" };

export default async function VoucherTypesPage() {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const tipos = await api("/voucher-types", tipoComprobanteSchema.array());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Maestros"
        titulo="Tipos de comprobante"
        descripcion="Tipos válidos para el analítico. Un movimiento sin comprobante se registra con --."
        acciones={editable ? <VoucherTypeDialog /> : null}
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-28">Estado</TableHead>
              {editable ? <TableHead className="w-32 text-right">Acciones</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tipos.map((tipo) => (
              <TableRow key={tipo.codigo}>
                <TableCell className="font-semibold tabular-nums text-white">{tipo.codigo}</TableCell>
                <TableCell>{tipo.descripcion}</TableCell>
                <TableCell>
                  <StatusBadge activo={tipo.activo} />
                </TableCell>
                {editable ? (
                  <TableCell className="text-right">
                    <ActivationButton accion={cambiarActivacionTipoComprobante.bind(null, tipo.codigo)} activo={tipo.activo} nombre={`el tipo ${tipo.codigo}`} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
