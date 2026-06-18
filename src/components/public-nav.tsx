"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useOptionalAuth } from "@/contexts/auth-context";
import { Sun, Moon, LayoutDashboard, LogOut, User } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Public pages where the top bar is always visible. */
const PINNED_TOPBAR_PATHS = new Set(["/", "/hall-of-fame", "/startups", "/faq"]);

type PublicNavProps = {
    /** Force pinned visibility. If omitted, pinned routes are detected from the pathname. */
    alwaysVisible?: boolean;
};

export function PublicNav({ alwaysVisible }: PublicNavProps = {}) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { user, profile, signOut } = useOptionalAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const pinned = useMemo(
        () => alwaysVisible === true || (pathname != null && PINNED_TOPBAR_PATHS.has(pathname)),
        [alwaysVisible, pathname]
    );

    const navLinks = [
        { href: "/#story", label: "Our Story" },
        { href: "/startups", label: "Startups" },
        { href: "/hall-of-fame", label: "Hall of Fame" },
        { href: "/faq", label: "FAQ" },
    ];

    return (
        <>
            <nav
                className={cn(
                    "border-b border-border/50 bg-background/80 backdrop-blur-md fixed top-0 w-full z-[100]",
                    pinned ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <Image
                            src="/CODELogo.png"
                            alt="CODE"
                            width={36}
                            height={36}
                            className="rounded-lg group-hover:opacity-90 transition-opacity"
                        />
                        <span className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors">
                            CODE
                        </span>
                    </Link>

                    <div className="flex items-center gap-1 sm:gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary px-2 sm:px-3 py-1.5 rounded-md transition-colors hidden sm:block"
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="w-px h-5 bg-border/50 hidden sm:block mx-1" />

                        <button
                            type="button"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 rounded-md border border-border/50 hover:border-primary/50 hover:text-primary transition-colors"
                            aria-label="Toggle theme"
                        >
                            <Sun className="w-4 h-4 hidden dark:block" />
                            <Moon className="w-4 h-4 dark:hidden" />
                        </button>

                        {user ? (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-2 border border-border/50 bg-card px-3 py-1.5 rounded-md hover:border-primary/50 transition-colors group ml-1"
                                >
                                    {profile?.photoURL ? (
                                        <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border group-hover:border-primary transition-colors">
                                            <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                    )}
                                    <span className="text-xs font-medium hidden sm:inline max-w-[120px] truncate group-hover:text-primary transition-colors">
                                        {profile?.displayName || "Member"}
                                    </span>
                                </button>

                                {showDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                            <div className="p-2 space-y-1">
                                                <div className="px-3 py-2 border-b border-border/50 mb-2">
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Signed in as</p>
                                                    <p className="text-xs font-medium text-foreground truncate">{profile?.email}</p>
                                                </div>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setShowDropdown(false)}
                                                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-primary/10 hover:text-primary transition-colors text-xs font-medium"
                                                >
                                                    <LayoutDashboard className="w-4 h-4 text-primary" />
                                                    Dashboard
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await signOut();
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors text-destructive text-xs font-medium"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Sign out
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Link
                                href="/login"
                                className="bg-primary text-primary-foreground px-4 sm:px-5 py-2 rounded-md text-xs sm:text-sm font-semibold hover:brightness-110 transition-all ml-1"
                            >
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
            {pinned && <div className="h-[60px] shrink-0" aria-hidden />}
        </>
    );
}
