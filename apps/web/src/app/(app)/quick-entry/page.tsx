import type { Metadata } from "next";
import Link from "next/link";
import {
  cuentaTesoreriaSchema,
  hojaSchema,
  medioPagoSchema,
  opcionCuentaContableSchema,
  ROLES_REGISTRAN,
  tipoComprobanteSchema,
} from "@conciliacion/contracts";
import { Button } from "@/components/ui/button";
import { QuickEntry } from "@/modules/ledger/ui/quick-entry";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { MotionProvider } from "@/shared/ui/motion-provider";
import { PageHeader } from "@/shared/ui/page-header";

export const metadata: Metadata = { title: "Registro rápido" };

type Props = { searchParams: Record<string, string | string[] | undefined> };

function hoyEnLima(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function entero(valor: string | string[] | undefined, minimo: number, maximo: number): number | null {
  const numero = typeof valor === "string" ? Number(valor) : Number.NaN;
  return Number.isInteger(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

export default async function QuickEntryPage({ searchParams }: Props) {
  const sesion = await exigirSesion();
  const hoy = hoyEnLima();
  const anio = entero(searchParams.anio, 2000, 2100) ?? Number(hoy.slice(0, 4));
  const mes = entero(searchParams.mes, 1, 12) ?? Number(hoy.slice(5, 7));

  const cuentas = await api("/treasury-accounts", cuentaTesoreriaSchema.array(), { consulta: { activas: true } });
  if (cuentas.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader seccion="Registro de bancos" titulo="Registro rápido" descripcion="Escribe como en tu Excel. El sistema completa, valida y avisa de duplicados." />
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <p>Aún no hay cuentas de tesorería activas. Crea una por cada cuenta bancaria o caja (por ejemplo CTA CTE SOLES, CTA CTE DÓLARES y EFECTIVO).</p>
          <Button asChild className="mt-4">
            <Link href="/settings/treasury-accounts">Ir a cuentas de tesorería</Link>
          </Button>
        </div>
      </div>
    );
  }

  const solicitada = typeof searchParams.cuenta === "string" ? cuentas.find((cuenta) => cuenta.id === searchParams.cuenta) : undefined;
  const seleccionada = solicitada ?? cuentas[0];
  if (!seleccionada) {
    return null;
  }

  const [hoja, opcionesCuentas, medios, tipos] = await Promise.all([
    api("/ledger/sheet", hojaSchema, { consulta: { cuenta: seleccionada.id, anio, mes } }),
    api("/chart-of-accounts/options", opcionCuentaContableSchema.array()),
    api("/payment-methods", medioPagoSchema.array()),
    api("/voucher-types", tipoComprobanteSchema.array()),
  ]);

  return (
    <MotionProvider>
      <QuickEntry
        key={`${seleccionada.id}-${anio}-${mes}`}
        hoja={hoja}
        cuentas={cuentas.map((cuenta) => ({
          id: cuenta.id,
          nombre: cuenta.nombre,
          detalle: `${cuenta.banco ?? "Caja"} · ${cuenta.moneda === "PEN" ? "S/" : "US$"}`,
        }))}
        opcionesCuentas={opcionesCuentas}
        medios={medios.filter((medio) => medio.activo).map(({ codigo, descripcion }) => ({ codigo, descripcion }))}
        tipos={tipos.filter((tipo) => tipo.activo).map(({ codigo, descripcion }) => ({ codigo, descripcion }))}
        hoy={hoy}
        puedeRegistrar={ROLES_REGISTRAN.includes(sesion.rol)}
      />
    </MotionProvider>
  );
}
