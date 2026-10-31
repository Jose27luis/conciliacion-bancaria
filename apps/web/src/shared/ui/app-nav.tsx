"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BookText, Building2, CreditCard, Keyboard, FileText, Landmark, Table, Users, type LucideIcon } from "lucide-react";
import type { Rol } from "@conciliacion/contracts";
import { cn } from "@/lib/utils";

type Enlace = { href: string; etiqueta: string; icono: LucideIcon; roles?: readonly Rol[] };
type Grupo = { titulo: string; enlaces: Enlace[] };

const GRUPOS: Grupo[] = [
  {
    titulo: "Registro",
    enlaces: [
      { href: "/quick-entry", etiqueta: "Registro rápido", icono: Table },
      { href: "/ledger", etiqueta: "Libro de movimientos", icono: BookText },
    ],
  },
  {
    titulo: "Maestros",
    enlaces: [
      { href: "/masters/entities", etiqueta: "Proveedores y clientes", icono: Building2 },
      { href: "/masters/templates", etiqueta: "Plantillas de atajos", icono: Keyboard },
      { href: "/masters/chart-of-accounts", etiqueta: "Plan contable", icono: BookOpen },
      { href: "/masters/payment-methods", etiqueta: "Medios de pago", icono: CreditCard },
      { href: "/masters/voucher-types", etiqueta: "Tipos de comprobante", icono: FileText },
    ],
  },
  {
    titulo: "Configuración",
    enlaces: [
      { href: "/settings/treasury-accounts", etiqueta: "Cuentas de tesorería", icono: Landmark },
      { href: "/settings/users", etiqueta: "Usuarios", icono: Users, roles: ["ADMIN"] },
    ],
  },
];

export function AppNav({ rol }: { rol: Rol }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Módulos" className="flex flex-col gap-6">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="flex flex-col gap-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground">{grupo.titulo}</p>
          {grupo.enlaces
            .filter((enlace) => !enlace.roles || enlace.roles.includes(rol))
            .map((enlace) => {
              const activo = ruta.startsWith(enlace.href);
              const Icono = enlace.icono;
              return (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-white",
                    activo && "border-border bg-accent font-semibold text-primary",
                  )}
                >
                  <Icono className="size-4 shrink-0" aria-hidden="true" />
                  {enlace.etiqueta}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );
}
