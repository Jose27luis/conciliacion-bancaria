import type { ReactNode } from "react";
import { exigirSesion } from "@/shared/auth/session";
import { AppShell } from "@/shared/ui/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const usuario = await exigirSesion();
  return <AppShell usuario={usuario}>{children}</AppShell>;
}
