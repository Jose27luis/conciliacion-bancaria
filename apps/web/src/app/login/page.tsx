import type { Metadata } from "next";
import { LoginForm } from "@/modules/identity/ui/login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage({ searchParams }: { searchParams: { expirada?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div aria-hidden="true" className="grid size-11 place-items-center rounded-xl border border-primary text-lg font-extrabold text-primary">
            CB
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-primary">Registro de bancos</p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Conciliación Bancaria</h1>
          </div>
        </div>
        <LoginForm sesionExpirada={searchParams.expirada === "1"} />
      </div>
    </main>
  );
}
