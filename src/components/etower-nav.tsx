"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Instagram } from "lucide-react";
import { ETOWER } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/startups", label: "Startups" },
  { href: "/our-story", label: "Our Story" },
  { href: "/#outlets", label: "Outlets" },
  { href: "/#join", label: "Join eTower" },
  { href: "/#contact", label: "Contact" },
];

export function EtowerNav() {
  const pathname = usePathname();

  return (
    <header className="etower-nav sticky top-0 z-[100] bg-white/90 backdrop-blur-md border-b border-[#0A111F]/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/etower-logo.png"
            alt="eTower"
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isPage = link.href.startsWith("/") && !link.href.includes("#");
            const active = isPage && pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium px-3 py-2 rounded-lg transition-colors",
                  active
                    ? "text-[#5aad4a] font-semibold"
                    : "text-[#0A111F]/70 hover:text-[#5aad4a]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href={ETOWER.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-[#0A111F]/70 hover:text-[#5aad4a] px-3 py-2 transition-colors"
          >
            <Instagram className="w-4 h-4" />
            Instagram
          </a>
          <Link href="/#join" className="etower-btn etower-btn--primary text-sm px-4 py-2">
            Join Us
          </Link>
        </div>
      </div>
    </header>
  );
}
