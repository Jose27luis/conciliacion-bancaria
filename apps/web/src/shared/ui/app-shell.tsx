import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { ETIQUETAS_ROL, type UsuarioSesion } from "@conciliacion/contracts";
import { cerrarSesion } from "@/modules/identity/actions";
import { Button } from "@/components/ui/button";
import { AppNav } from "./app-nav";

export function AppShell({ usuario, children }: { usuario: UsuarioSesion; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-border bg-[#050f1d] p-4 md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-1">
          <div aria-hidden="true" className="grid size-10 place-items-center rounded-xl border border-primary text-lg font-extrabold text-primary">
            CB
          </div>
          <div>
            <p className="text-sm font-extrabold text-white">Conciliación</p>
            <p className="text-xs text-muted-foreground">Bancaria</p>
          </div>
        </div>
        <AppNav rol={usuario.rol} />
        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
            <p className="text-xs text-muted-foreground">{ETIQUETAS_ROL[usuario.rol]}</p>
          </div>
          <form action={cerrarSesion}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión" title="Cerrar sesión">
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
