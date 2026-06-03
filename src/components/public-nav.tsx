"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useOptionalAuth } from "@/contexts/auth-context";
import { Code2, Sun, Moon, LayoutDashboard, LogOut, User } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

/** Public pages where the top bar is always visible (not scroll-reveal like the landing page). */
const PINNED_TOPBAR_PATHS = new Set(["/hall-of-fame", "/startups", "/faq"]);

type PublicNavProps = {
    /** Force pinned visibility. If omitted, pinned routes are detected from the pathname. */
    alwaysVisible?: boolean;
};

export function PublicNav({ alwaysVisible }: PublicNavProps = {}) {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { user, profile, signOut } = useOptionalAuth();
    const [showDropdown, setShowDropdown] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    const pinned = useMemo(
        () => alwaysVisible === true || (pathname != null && PINNED_TOPBAR_PATHS.has(pathname)),
        [alwaysVisible, pathname]
    );

    useEffect(() => {
        if (pinned) return;
        const handleScroll = () => setScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [pinned]);

    const showBar = pinned || scrolled;

    return (
        <>
            <nav
                className={cn(
                    "border-b glass fixed top-0 w-full z-[100] scanlines",
                    pinned ? "bg-background/80 border-border/50 backdrop-blur-md" : "transition-all duration-500 ease-in-out",
                    showBar
                        ? pinned
                            ? "translate-y-0 opacity-100"
                            : "bg-background/80 border-border/50 backdrop-blur-md translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0 pointer-events-none"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between relative z-10">
                    <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 hud-corners bg-primary/10 border border-primary/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                            <span className="font-black text-xl sm:text-2xl tracking-tighter uppercase leading-none block group-hover:text-primary transition-colors">
                                CODE<span className="text-primary text-xl">.</span>
                            </span>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <Link
                            href="/startups"
                            className="text-[10px] sm:text-xs font-mono font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors hidden sm:block"
                        >
                            STARTUPS
                        </Link>
                        <Link
                            href="/hall-of-fame"
                            className="text-[10px] sm:text-xs font-mono font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors hidden sm:block"
                        >
                            Hall of fame
                        </Link>
                        <Link
                            href="/faq"
                            className="text-[10px] sm:text-xs font-mono font-bold text-muted-foreground hover:text-primary uppercase tracking-widest transition-colors hidden sm:block"
                        >
                            FAQ
                        </Link>

                        <div className="w-px h-6 bg-border/50 hidden sm:block mx-1" />

                        <button
                            type="button"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 hud-panel-sm bg-background border border-border/50 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                            <Sun className="w-4 h-4 hidden dark:block" />
                            <Moon className="w-4 h-4 dark:hidden" />
                        </button>

                        {user ? (
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-2 hud-panel-sm bg-card border border-border/50 px-3 py-1.5 hover:border-primary/50 transition-colors group"
                                >
                                    {profile?.photoURL ? (
                                        <img src={profile.photoURL} alt="" className="w-6 h-6 hud-corners object-cover border border-border" />
                                    ) : (
                                        <div className="w-6 h-6 hud-corners bg-background flex items-center justify-center border border-border group-hover:border-primary transition-colors">
                                            <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                                        </div>
                                    )}
                                    <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest hidden sm:inline max-w-[120px] truncate group-hover:text-primary transition-colors mt-0.5">
                                        {profile?.displayName || "MEMBER"}
                                    </span>
                                </button>

                                {showDropdown && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                                        <div className="absolute right-0 top-full mt-2 w-56 hud-panel-sm bg-card/95 backdrop-blur-md border border-primary/40 shadow-[0_0_20px_rgba(0,0,0,0.5)] z-50 overflow-hidden scanlines">
                                            <div className="relative z-10 p-2 space-y-1">
                                                <div className="px-3 py-2 border-b border-border/50 mb-2">
                                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Signed in as</p>
                                                    <p className="text-xs font-mono font-bold text-foreground truncate">{profile?.email}</p>
                                                </div>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setShowDropdown(false)}
                                                    className="flex items-center gap-3 px-3 py-2 hud-panel-sm hover:bg-primary/10 hover:text-primary transition-colors text-xs font-mono font-bold uppercase tracking-widest"
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
                                                    className="w-full flex items-center gap-3 px-3 py-2 hud-panel-sm hover:bg-destructive/10 hover:text-destructive transition-colors text-destructive text-xs font-mono font-bold uppercase tracking-widest"
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
                                className="hud-panel-sm bg-primary text-primary-foreground px-5 sm:px-6 py-2 sm:py-2.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border"
                            >
                                Sign in
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
            {pinned && <div className="h-[52px] sm:h-[60px] shrink-0" aria-hidden />}
        </>
    );
}
