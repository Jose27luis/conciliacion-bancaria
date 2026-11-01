import type { ReactNode } from "react";
import { cookies } from "next/headers";
import type { UsuarioSesion } from "@conciliacion/contracts";
import { Sidebar } from "./sidebar";
import { COOKIE_GRUPOS_CERRADOS, COOKIE_SIDEBAR_COLAPSADO, leerGruposCerrados } from "./sidebar-preferences";

export function AppShell({ usuario, children }: { usuario: UsuarioSesion; children: ReactNode }) {
  const preferencias = cookies();
  const colapsado = preferencias.get(COOKIE_SIDEBAR_COLAPSADO)?.value === "1";
  const gruposCerrados = leerGruposCerrados(preferencias.get(COOKIE_GRUPOS_CERRADOS)?.value);
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <Sidebar usuario={usuario} colapsadoInicial={colapsado} gruposCerrados={gruposCerrados} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
