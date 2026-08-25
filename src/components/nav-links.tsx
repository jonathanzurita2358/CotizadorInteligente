"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/cotizar", label: "Cotizar" },
  { href: "/historial", label: "Historial" },
  { href: "/configuracion", label: "Configuración" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-red-50 text-red-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
