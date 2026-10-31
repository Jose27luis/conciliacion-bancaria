import type { Metadata } from "next";
import { medioPagoSchema, ROLES_EDITAN_MAESTROS } from "@conciliacion/contracts";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionMedioPago } from "@/modules/masters/actions";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Medios de pago" };

export default async function PaymentMethodsPage() {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const medios = await api("/payment-methods", medioPagoSchema.array());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Maestros"
        titulo="Medios de pago"
        descripcion="Tabla 1 de SUNAT para la columna COD. Desactiva los que no uses para que no aparezcan en el registro."
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
            {medios.map((medio) => (
              <TableRow key={medio.codigo}>
                <TableCell className="font-semibold tabular-nums text-white">{medio.codigo}</TableCell>
                <TableCell>{medio.descripcion}</TableCell>
                <TableCell>
                  <StatusBadge activo={medio.activo} />
                </TableCell>
                {editable ? (
                  <TableCell className="text-right">
                    <ActivationButton accion={cambiarActivacionMedioPago.bind(null, medio.codigo)} activo={medio.activo} nombre={`el medio ${medio.codigo}`} />
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
