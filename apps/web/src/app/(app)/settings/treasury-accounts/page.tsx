import type { Metadata } from "next";
import {
  cuentaTesoreriaSchema,
  ETIQUETAS_TIPO_CUENTA_TESORERIA,
  paginaCuentasContablesSchema,
  ROLES_EDITAN_MAESTROS,
} from "@conciliacion/contracts";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionCuentaTesoreria } from "@/modules/masters/actions";
import { TreasuryAccountDialog } from "@/modules/masters/ui/treasury-account-dialog";
import { OpeningDialog } from "@/modules/reports/ui/opening-dialog";
import { hoyEnLima } from "@/shared/lib/dates";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Cuentas de tesorería" };

export default async function TreasuryAccountsPage() {
  const sesion = await exigirSesion();
  const editable = ROLES_EDITAN_MAESTROS.includes(sesion.rol);
  const [cuentas, opciones] = await Promise.all([
    api("/treasury-accounts", cuentaTesoreriaSchema.array()),
    editable
      ? api("/chart-of-accounts", paginaCuentasContablesSchema, { consulta: { prefijo: "10", movimiento: true, activa: true, porPagina: 200 } })
      : null,
  ]);
  const cuentasContables = (opciones?.items ?? []).map((cuenta) => ({ codigo: cuenta.codigo, denominacion: cuenta.denominacion }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        seccion="Configuración"
        titulo="Cuentas de tesorería"
        descripcion="Cuentas bancarias y cajas donde se registran los movimientos."
        acciones={editable ? <TreasuryAccountDialog cuentasContables={cuentasContables} /> : null}
      />
      <Card className="overflow-hidden">
        {cuentas.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Aún no hay cuentas. Crea una por cada cuenta bancaria o caja que registres.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Orden</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Cuenta contable</TableHead>
                <TableHead className="text-right">Saldo de apertura</TableHead>
                <TableHead>Estado</TableHead>
                {editable ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((cuenta) => (
                <TableRow key={cuenta.id}>
                  <TableCell className="tabular-nums">{cuenta.orden}</TableCell>
                  <TableCell className="font-semibold text-white">{cuenta.nombre}</TableCell>
                  <TableCell>{ETIQUETAS_TIPO_CUENTA_TESORERIA[cuenta.tipo]}</TableCell>
                  <TableCell>
                    {cuenta.banco ?? <span className="text-muted-foreground">No aplica</span>}
                    {cuenta.numeroCuenta ? <span className="block text-xs text-muted-foreground tabular-nums">{cuenta.numeroCuenta}</span> : null}
                  </TableCell>
                  <TableCell>{cuenta.moneda === "PEN" ? "S/" : "US$"}</TableCell>
                  <TableCell>
                    <span className="font-semibold tabular-nums text-white">{cuenta.cuentaContableCodigo}</span>
                    <span className="block text-xs text-muted-foreground">{cuenta.cuentaContableDenominacion}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {cuenta.saldoApertura !== null && cuenta.aperturaAnio !== null && cuenta.aperturaMes !== null ? (
                      <>
                        <span className="font-semibold tabular-nums text-white">
                          {Number(cuenta.saldoApertura).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="block text-xs text-muted-foreground tabular-nums">
                          al 01/{String(cuenta.aperturaMes).padStart(2, "0")}/{cuenta.aperturaAnio}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-[#ffda79]">Sin cargar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge activo={cuenta.activa} />
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <OpeningDialog
                          cuentaId={cuenta.id}
                          nombre={cuenta.nombre}
                          simbolo={cuenta.moneda === "PEN" ? "S/" : "US$"}
                          saldo={cuenta.saldoApertura}
                          anio={cuenta.aperturaAnio}
                          mes={cuenta.aperturaMes}
                          mesSugerido={`${hoyEnLima().slice(0, 4)}-01`}
                        />
                        <TreasuryAccountDialog cuenta={cuenta} cuentasContables={cuentasContables} />
                        <ActivationButton accion={cambiarActivacionCuentaTesoreria.bind(null, cuenta.id)} activo={cuenta.activa} nombre={cuenta.nombre} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
