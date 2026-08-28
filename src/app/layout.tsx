import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cotizador Inteligente",
  description:
    "Cotización de productos personalizados: grabado láser, sublimación, DTF, UV DTF, vinil y resina.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen text-slate-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/cotizar" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-black text-white">
                CI
              </span>
              <span className="text-base font-bold tracking-tight">
                Cotizador <span className="text-red-600">Inteligente</span>
              </span>
            </Link>
            <NavLinks />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
