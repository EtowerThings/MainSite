"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Rocket,
    Users,
    Loader2,
    Database,
    Instagram,
    Linkedin,
    Globe,
    X,
    Sparkles,
    Pencil,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicNav } from "@/components/public-nav";
import { useStartups, deleteStartup, type StartupItem } from "@/hooks/useFirestore";
import { useOptionalAuth } from "@/contexts/auth-context";
import { hrefWebsite, hrefInstagram, hrefLinkedIn } from "@/lib/startup-gallery";
import { isAdmin } from "@/lib/roles";

function StartupDetailModal({
    startup,
    onClose,
    canManage,
    onDeleted,
}: {
    startup: StartupItem;
    onClose: () => void;
    canManage: boolean;
    onDeleted?: () => void;
}) {
    const web = hrefWebsite(startup.website);
    const ig = hrefInstagram(startup.instagramUrl);
    const li = hrefLinkedIn(startup.linkedinCompanyUrl);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!canManage) return;
        if (!confirm(`Remove “${startup.name}” from the gallery? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteStartup(startup.id);
            onDeleted?.();
            onClose();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Could not delete.");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`startup-title-${startup.id}`}
        >
            <button
                type="button"
                className="absolute inset-0 bg-background/85 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close"
            />
            <div
                className="relative z-10 flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden border border-primary/40 bg-card shadow-[0_0_60px_color-mix(in_oklch,var(--primary)_12%,transparent)] hud-panel scanlines"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-border/40 bg-primary/5 px-5 py-4 sm:px-6">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                        {startup.logoUrl ? (
                            <img
                                src={startup.logoUrl}
                                alt=""
                                className="h-16 w-16 shrink-0 border border-border/50 object-contain sm:h-20 sm:w-20"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-primary/30 bg-primary/15 text-primary sm:h-20 sm:w-20">
                                <Rocket className="h-8 w-8" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-primary/80">{startup.businessCategory}</p>
                            <h2 id={`startup-title-${startup.id}`} className="text-xl font-black uppercase tracking-tight sm:text-2xl">
                                {startup.name}
                            </h2>
                            <p className="mt-1 text-xs font-mono text-muted-foreground">Founded {startup.foundedYear}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 rounded-sm border border-border/60 p-2 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="custom-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    {(web || ig || li) && (
                        <div className="mb-6 flex flex-wrap gap-2">
                            {web && (
                                <a
                                    href={web}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 border border-border/50 bg-background/60 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary transition-colors hover:border-primary/50"
                                >
                                    <Globe className="h-3.5 w-3.5" /> Website
                                </a>
                            )}
                            {ig && (
                                <a
                                    href={ig}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 border border-border/50 bg-background/60 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary transition-colors hover:border-primary/50"
                                >
                                    <Instagram className="h-3.5 w-3.5" /> Instagram
                                </a>
                            )}
                            {li && (
                                <a
                                    href={li}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 border border-border/50 bg-background/60 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary transition-colors hover:border-primary/50"
                                >
                                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                                </a>
                            )}
                        </div>
                    )}

                    <section className="mb-6">
                        <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Company overview</h3>
                        <p className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-foreground/90">{startup.companyOverview || "—"}</p>
                    </section>

                    <section className="mb-6">
                        <h3 className="mb-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Founder story</h3>
                        <p className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-muted-foreground">{startup.founderStory || "—"}</p>
                    </section>

                    <section className="mb-6 border-t border-border/30 pt-6">
                        <h3 className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                            <Users className="h-3.5 w-3.5" /> Founding team
                        </h3>
                        <p className="text-sm font-mono text-foreground/90">{startup.founders}</p>
                    </section>

                    {(startup.submitterName || startup.submitterPhotoURL || startup.submittedByUid) && (
                        <section className="rounded-sm border border-primary/25 bg-primary/5 p-4">
                            <h3 className="mb-3 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                                <Sparkles className="h-3.5 w-3.5" /> CODE founder
                            </h3>
                            <div className="flex items-center gap-4">
                                {startup.submitterPhotoURL ? (
                                    <img
                                        src={startup.submitterPhotoURL}
                                        alt=""
                                        className="h-16 w-16 shrink-0 border border-primary/30 object-cover sm:h-20 sm:w-20"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border/50 bg-background font-mono text-lg font-black text-muted-foreground sm:h-20 sm:w-20">
                                        {(startup.submitterName || "?").slice(0, 1).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold font-mono uppercase tracking-tight">
                                        {startup.submitterName?.trim() || "CODE member"}
                                    </p>
                                    {startup.submitterGraduationYear && (
                                        <p className="mt-1 text-xs font-mono text-muted-foreground">Class of {startup.submitterGraduationYear}</p>
                                    )}
                                    <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80">
                                        Listed member at submission
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                    {canManage && (
                        <div className="mt-6 flex flex-wrap gap-3 border-t border-border/40 pt-6">
                            <Link
                                href={`/startups/edit/${startup.id}`}
                                onClick={onClose}
                                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 border border-primary/50 bg-primary/10 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20 sm:flex-none"
                            >
                                <Pencil className="h-3.5 w-3.5" /> Edit listing
                            </Link>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleDelete}
                                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50 sm:flex-none"
                            >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {deleting ? "Removing…" : "Delete"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function StartupsGalleryPage() {
    const { data: startups, loading } = useStartups();
    const { user, profile } = useOptionalAuth();
    const [selected, setSelected] = useState<StartupItem | null>(null);

    const closeModal = useCallback(() => setSelected(null), []);

    const canManageStartup = useCallback(
        (s: StartupItem) =>
            !!user &&
            !!profile &&
            (isAdmin(profile.role) || (!!s.submittedByUid && s.submittedByUid === user.uid)),
        [user, profile]
    );

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />
            <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] bg-primary/10" />

            <PublicNav />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
                <div className="text-center mb-12 sm:mb-16 animate-fade-in">
                    <div className="inline-flex items-center gap-2 hud-panel-sm bg-background/50 border border-primary/30 text-primary px-4 py-1.5 text-xs font-mono tracking-widest uppercase mb-6 shadow-sm">
                        <Database className="w-3.5 h-3.5" />
                        CODE Alumni Startups
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase">
                        Startup <span className="gradient-text-cyber animate-flicker">Gallery</span>
                    </h1>
                    <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
                        <div className="hud-panel border border-border/50 bg-card/60 px-6 py-3 scanlines">
                            <p className="relative z-10 text-muted-foreground text-sm font-mono tracking-wider">
                                <span className="text-primary font-bold">&gt;</span> Click a card for full story, links, and CODE founder.
                            </p>
                        </div>
                        {user && (
                            <Link
                                href="/startups/submit"
                                className="hud-panel-sm border border-primary/50 bg-primary/10 px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-widest text-primary transition-colors hover:bg-primary/20"
                            >
                                Submit your startup
                            </Link>
                        )}
                    </div>
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-mono text-primary tracking-widest uppercase animate-pulse">Loading Startups...</span>
                    </div>
                )}

                {!loading && startups.length === 0 && (
                    <div className="text-center py-20 hud-panel bg-card/40 border border-border/50 max-w-2xl mx-auto scanlines">
                        <Rocket className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4 relative z-10" />
                        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase relative z-10">No startups found in archive.</p>
                    </div>
                )}

                {!loading && startups.length > 0 && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {startups.map((startup, i) => (
                            <button
                                key={startup.id}
                                type="button"
                                onClick={() => setSelected(startup)}
                                className={cn(
                                    "group relative w-full text-left bg-card/60 border border-border/40 overflow-hidden card-hover transition-all hover:border-primary/50 hover:bg-card/90 scanlines cursor-pointer",
                                    i % 2 === 0 ? "hud-panel" : "hud-panel-alt"
                                )}
                            >
                                <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-primary/20 border-l-[20px] border-l-transparent group-hover:border-t-primary/50 transition-colors z-20 pointer-events-none" />
                                <div className="relative z-10 flex gap-4 border-b border-border/40 bg-gradient-to-br from-primary/[0.08] to-transparent p-4 sm:p-5">
                                    <div
                                        className={cn(
                                            "relative shrink-0 overflow-hidden rounded-sm border border-border/50 bg-background/70 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)]",
                                            "flex h-[4.5rem] w-[4.5rem] items-center justify-center sm:h-[5rem] sm:w-[5rem]"
                                        )}
                                    >
                                        {startup.logoUrl ? (
                                            <img
                                                src={startup.logoUrl}
                                                alt=""
                                                className="h-full w-full object-contain p-2 transition-transform group-hover:scale-[1.03]"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                                                <Rocket className="h-8 w-8 opacity-90 sm:h-9 sm:w-9" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 pt-0.5">
                                        <p className="text-[10px] font-mono uppercase tracking-widest text-primary/80 line-clamp-2 sm:line-clamp-1">
                                            {startup.businessCategory}
                                        </p>
                                        <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors tracking-tight uppercase line-clamp-2 leading-snug">
                                            {startup.name}
                                        </h3>
                                        <p className="mt-1 text-xs font-mono text-muted-foreground">Founded {startup.foundedYear}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col min-h-[160px] flex-1 p-5 pt-4 relative z-10">
                                    <p className="text-xs text-muted-foreground font-mono mb-4 line-clamp-3 flex-grow">{startup.companyOverview}</p>
                                    <div className="mt-auto space-y-3 border-t border-border/40 pt-3">
                                        {(startup.submitterName || startup.submitterGraduationYear) && (
                                            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary/80">
                                                {startup.submitterPhotoURL && (
                                                    <img src={startup.submitterPhotoURL} alt="" className="h-7 w-7 border border-primary/30 object-cover" />
                                                )}
                                                <span>
                                                    {startup.submitterName}
                                                    {startup.submitterGraduationYear ? ` · ’${startup.submitterGraduationYear.slice(-2)}` : ""}
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/70 group-hover:text-primary">
                                            Open details →
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selected && (
                <StartupDetailModal
                    startup={selected}
                    onClose={closeModal}
                    canManage={canManageStartup(selected)}
                    onDeleted={() => setSelected(null)}
                />
            )}
        </div>
    );
}
