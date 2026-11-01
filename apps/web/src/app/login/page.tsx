import type { Metadata } from "next";
import { LoginBackdrop } from "@/modules/identity/ui/login-backdrop";
import { LoginForm } from "@/modules/identity/ui/login-form";
import { LoginShowcase } from "@/modules/identity/ui/login-showcase";
import { MotionProvider } from "@/shared/ui/motion-provider";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage({ searchParams }: { searchParams: { expirada?: string } }) {
  return (
    <MotionProvider>
      <LoginBackdrop />
      <main className="relative grid min-h-[100dvh] items-center gap-12 overflow-x-hidden px-4 py-10 sm:px-8 lg:grid-cols-[1.15fr_minmax(0,28rem)] lg:px-16 xl:px-24 bajo:py-6 apaisado:py-3">
        <div className="hidden lg:block">
          <LoginShowcase />
        </div>
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <LoginForm sesionExpirada={searchParams.expirada === "1"} />
        </div>
      </main>
    </MotionProvider>
  );
}
