import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fuente = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Conciliación Bancaria", template: "%s · Conciliación Bancaria" },
  description: "Registro de movimientos de bancos y caja.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={fuente.variable}>
      <body className="font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
