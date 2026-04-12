"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/auth-context";
import {
    LayoutDashboard,
    FolderKanban,
    BookOpen,
    Activity,
    CalendarDays,
    Users2,
    HelpCircle,
    Trophy,
    Shield,
    User,
    LogOut,
    Moon,
    Sun,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Code2,
    Terminal,
    GraduationCap,
    Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessAdminCenter as checkExecAccess } from "@/lib/roles";
import { useState, useEffect } from "react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
}

const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Projects", href: "/projects", icon: <FolderKanban className="w-4 h-4" /> },
    { label: "Resources", href: "/resources", icon: <BookOpen className="w-4 h-4" /> },
    { label: "Feed", href: "/feed", icon: <Activity className="w-4 h-4" /> },
    { label: "Events", href: "/events", icon: <CalendarDays className="w-4 h-4" /> },
    { label: "Members", href: "/members", icon: <Users2 className="w-4 h-4" /> },
    { label: "Alumni Network", href: "/network", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "Profile", href: "/profile", icon: <User className="w-4 h-4" /> },
    { label: "Admin Tools", href: "/admin", icon: <Shield className="w-4 h-4" />, adminOnly: true },
];

const bottomItems: NavItem[] = [
    { label: "Hall of Fame", href: "/hall-of-fame", icon: <Trophy className="w-4 h-4" /> },
    { label: "Startups Gallery", href: "/startups", icon: <Rocket className="w-4 h-4" /> },
    { label: "Community FAQ", href: "/faq", icon: <HelpCircle className="w-4 h-4" /> },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const { profile, signOut } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push("/");
    };

    const filteredNav = navItems.filter(
        (item) => !item.adminOnly || checkExecAccess(profile?.role)
    );

    const NavContent = () => (
        <div className="flex flex-col h-full bg-sidebar relative overflow-hidden scanlines">
            {/* Background elements */}
            <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

            {/* Header */}
            <Link href="/" className="p-5 flex items-center gap-3 relative z-10 border-b border-sidebar-border/50 bg-sidebar/50 backdrop-blur-sm group transition-colors hover:bg-sidebar-accent/50 cursor-pointer text-current no-underline">
                <div className="w-8 h-8 hud-panel-sm bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 relative group-hover:bg-primary/20 transition-colors">
                    <div className="absolute inset-0 glow-border opacity-50" />
                    <Code2 className="w-4 h-4 text-primary" />
                </div>
                {!collapsed && (
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-black text-xl tracking-tight uppercase">CODE</span>
                        <span className="text-[10px] font-mono text-primary uppercase tracking-widest hidden group-hover:inline-block transition-all">//SYS</span>
                    </div>
                )}
            </Link>

            {/* Main Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scroll relative z-10">
                {!collapsed && (
                    <div className="px-3 mb-3">
                        <p className="text-[10px] font-mono text-sidebar-foreground/50 uppercase tracking-widest">MAIN_MODULES</p>
                    </div>
                )}
                {filteredNav.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "group flex items-center gap-3 px-3 py-2.5 rounded-none text-xs font-mono font-bold tracking-wider uppercase transition-all relative",
                                isActive
                                    ? "text-primary bg-primary/5 hud-panel-sm"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-100 transition-transform" />
                            )}
                            <div className={cn(
                                "flex items-center justify-center transition-colors",
                                isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-primary"
                            )}>
                                {item.icon}
                            </div>
                            {!collapsed && <span>{item.label}</span>}
                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Section */}
            <div className="mt-auto border-t border-sidebar-border/50 relative z-10 bg-sidebar/50 backdrop-blur-sm">
                <div className="px-3 py-3 space-y-1.5">
                    {!collapsed && (
                        <div className="px-3 mb-2 mt-1">
                            <p className="text-[10px] font-mono text-sidebar-foreground/50 uppercase tracking-widest">EXTERNAL_LINKS</p>
                        </div>
                    )}
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "group flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider transition-all",
                                    isActive
                                        ? "text-primary bg-primary/5 hud-panel-sm"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                                )}
                            >
                                <div className={cn("transition-colors", isActive ? "text-primary" : "text-sidebar-foreground group-hover:text-primary")}>
                                    {item.icon}
                                </div>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}

                    {/* Theme Toggle */}
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-xs font-mono uppercase tracking-wider text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all group"
                    >
                        <div className="transition-colors group-hover:text-primary">
                            <Sun className="w-4 h-4 hidden dark:block" />
                            <Moon className="w-4 h-4 dark:hidden" />
                        </div>
                        {!collapsed && <span>{mounted ? (theme === "dark" ? "LIGHT THEME" : "DARK THEME") : "THEME"}</span>}
                    </button>
                </div>

                {/* User Info & Sign Out */}
                <div className="p-3 bg-sidebar-accent/30 border-t border-sidebar-border/50">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        {profile?.photoURL ? (
                            <div className="w-8 h-8 hud-panel-sm border border-primary/30 p-0.5 bg-background flex-shrink-0">
                                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                            </div>
                        ) : (
                            <div className="w-8 h-8 hud-panel-sm border border-primary/30 bg-sidebar-accent flex items-center justify-center flex-shrink-0 text-primary">
                                <Terminal className="w-4 h-4" />
                            </div>
                        )}
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-foreground truncate uppercase tracking-tight">
                                    {profile?.displayName || "UNKNOWN_USER"}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <p className="text-[10px] font-mono text-primary uppercase tracking-widest truncate">
                                        {profile?.role || "GUEST"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono font-bold text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/30 uppercase tracking-widest transition-all hud-panel-sm"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        {!collapsed && <span>DISCONNECT</span>}
                    </button>
                </div>
            </div>

            {/* Collapse Toggle (desktop) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex items-center justify-center py-2 bg-sidebar-accent/50 hover:bg-sidebar-accent border-t border-sidebar-border text-sidebar-foreground hover:text-foreground transition-colors absolute bottom-0 w-full z-20"
            >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
        </div>
    );

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-3 left-3 z-50 p-2 hud-panel-sm bg-card border border-primary/30 shadow-md text-primary"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="relative w-72 h-full shadow-2xl animate-slide-right">
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="absolute top-4 right-4 p-2 hud-panel-sm bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-colors z-50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <NavContent />
                    </div>
                </div>
            )}

            {/* Desktop frontend */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col h-[100dvh] sticky top-0 border-r border-sidebar-border transition-all duration-300",
                    collapsed ? "w-[72px]" : "w-64"
                )}
            >
                <NavContent />
            </aside>

            <style jsx global>{`
                .custom-scroll::-webkit-scrollbar { width: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: color-mix(in oklch, var(--primary) 20%, transparent); border-radius: 4px; }
                @keyframes slide-right {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-right { animation: slide-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </>
    );
}
