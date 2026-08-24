"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首頁" },
  { href: "/vocab", label: "詞彙" },
  { href: "/conversation", label: "會話" },
  { href: "/vocabulary", label: "我的" },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="app-nav" aria-label="主要導覽">
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
