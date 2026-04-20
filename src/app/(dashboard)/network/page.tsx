"use client";

import { useAuth } from "@/contexts/auth-context";
import { isAdmin } from "@/lib/roles";
import { useMembers, MemberItem } from "@/hooks/useFirestore";
import {
    GraduationCap,
    Search,
    Mail,
    ExternalLink,
    Loader2,
    Clock,
    User,
    Shield,
    Terminal
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AlumniNetworkPage() {
    const { profile } = useAuth();
    const { data: members, loading } = useMembers();
    const [search, setSearch] = useState("");

    // Only fetch alumni explicitly.
    const alumniMembers = members.filter((m) => m.role === "alumni" || m.residency === "alumni");

    const filteredAlumni = alumniMembers.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.standoutSkill.toLowerCase().includes(search.toLowerCase())
    );

    const userIsAdmin = isAdmin(profile?.role);

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in space-y-6 relative z-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="border-b border-border/50 pb-5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                    <GraduationCap className="w-4 h-4" />
                    NETWORK DIRECTORY
                </div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase">
                    ALUMNI <span className="gradient-text-cyber">NETWORK</span>
                </h1>
                <p className="text-muted-foreground mt-3 text-sm font-mono uppercase tracking-widest max-w-2xl leading-relaxed">
                    CONNECT WITH PAST OPERATIVES WHO HAVE SECURED POSITIONS IN THE INDUSTRY. THOSE MARKED AS "OPEN TO OUTREACH" ARE AVAILABLE FOR MENTORSHIP AND GUIDANCE.
                </p>
                <div className="text-primary mt-4 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {alumniMembers.length} REGISTERED ALUMNI
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full max-w-md hud-corners bg-card/60 border border-border/40 p-1">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                <input
                    type="text"
                    placeholder="SEARCH BY NAME OR SKILL..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-mono uppercase tracking-wide focus:outline-none placeholder:text-muted-foreground/50 transition-colors"
                />
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-mono text-primary font-bold uppercase tracking-widest animate-pulse">Loading alumni…</span>
                </div>
            )}

            {/* Alumni Grid */}
            {!loading && (
                <div className="flex-1 grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredAlumni.map((alumni, i) => (
                        <div key={alumni.id} className={cn("group bg-card/60 border p-6 transition-all hover:border-primary/50 relative flex flex-col scanlines", i % 2 === 0 ? 'hud-panel' : 'hud-corners', alumni.openToMentorship ? "border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(203,247,2,0.05)]" : "border-border/40")}>

                            {/* Open to Mentorship Badge */}
                            {alumni.openToMentorship && (
                                <div className="absolute top-0 right-0">
                                    <div className="w-12 h-12 bg-gradient-to-bl from-primary/30 to-transparent pointer-events-none z-10 absolute top-0 right-0" />
                                    <span className="absolute top-3 right-3 text-[8px] font-mono font-bold px-2 py-1 bg-primary text-primary-foreground uppercase tracking-widest glow-border whitespace-nowrap z-20 shadow-[0_0_10px_rgba(203,247,2,0.5)] flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-background rounded-full animate-pulse" />
                                        OPEN TO OUTREACH
                                    </span>
                                </div>
                            )}

                            <div className="flex items-start gap-5 mb-5 relative z-10 pt-2">
                                <div className={cn("w-16 h-16 hud-corners flex items-center justify-center font-black text-2xl border shadow-inner shrink-0", alumni.openToMentorship ? "bg-primary/20 border-primary text-primary shadow-[inset_0_0_15px_rgba(203,247,2,0.3)]" : "bg-background border-border/50 text-muted-foreground")}>
                                    {alumni.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h3 className="font-black font-mono tracking-tight uppercase truncate text-lg group-hover:text-primary transition-colors">{alumni.name}</h3>
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                        <Clock className="w-3 h-3" />
                                        JOINED {alumni.joinDate.substring(0, 4)}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-5 p-4 hud-corners bg-background/40 border border-border/40 relative z-10 flex items-start gap-3 flex-1">
                                <Terminal className={cn("w-4 h-4 shrink-0 mt-0.5", alumni.openToMentorship ? "text-primary" : "text-muted-foreground")} />
                                <div>
                                    <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest mb-1.5">PRIMARY SPECIALTY</div>
                                    <div className="font-bold font-mono text-sm uppercase tracking-tight text-foreground/90 leading-tight">
                                        {alumni.standoutSkill !== "—" ? alumni.standoutSkill : "UNSPECIFIED EXPERTISE"}
                                    </div>
                                </div>
                            </div>

                            {/* Contact Methods (Only visible if open to mentorship OR User is Admin) */}
                            {(alumni.openToMentorship || userIsAdmin) && (
                                <div className="mt-auto pt-4 border-t border-border/40 flex flex-col gap-2.5 relative z-10">
                                    {!alumni.openToMentorship && userIsAdmin && (
                                        <span className="text-[8px] font-mono text-warning uppercase tracking-widest mb-1">* VISIBLE TO COMMAND ONLY</span>
                                    )}

                                    {alumni.linkedin ? (
                                        <a href={alumni.linkedin} target="_blank" rel="noopener noreferrer" className={cn("flex items-center justify-between p-2.5 hud-panel-sm border transition-colors group/link", alumni.openToMentorship ? "bg-primary/10 border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary" : "bg-card border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary")}>
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                LINKEDIN PROFILE
                                            </span>
                                            <span className="text-primary group-hover/link:text-current transition-colors">&rarr;</span>
                                        </a>
                                    ) : (
                                        <div className="flex items-center p-2.5 hud-panel-sm bg-background/50 border border-border/50 text-muted-foreground/50">
                                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                NO LINKEDIN PROVIDED
                                            </span>
                                        </div>
                                    )}

                                    <a href={`mailto:${alumni.email}`} className="flex items-center justify-between p-2.5 hud-panel-sm bg-card border border-border/50 hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary group/link">
                                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2 truncate">
                                            <Mail className="w-3.5 h-3.5 shrink-0" />
                                            {alumni.email}
                                        </span>
                                        <span className="text-primary group-hover/link:text-primary transition-colors opacity-0 group-hover/link:opacity-100">&rarr;</span>
                                    </a>
                                </div>
                            )}

                            {!alumni.openToMentorship && !userIsAdmin && (
                                <div className="mt-auto pt-4 border-t border-border/40">
                                    <div className="flex flex-col items-center justify-center p-4 bg-background/50 border border-border/30 hud-panel-sm text-center">
                                        <Shield className="w-5 h-5 text-muted-foreground/40 mb-2" />
                                        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-bold">CONTACT INTEL CLASSIFIED</span>
                                    </div>
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredAlumni.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 hud-panel bg-card/40 border border-border/40 scanlines mt-8">
                    <GraduationCap className="w-16 h-16 text-muted-foreground/30 mb-5 relative z-10" />
                    <p className="text-sm font-mono font-bold text-foreground uppercase tracking-widest relative z-10 text-center mb-2">NO ALUMNI FOUND</p>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10 text-center">Your search parameters yielded no results.</p>
                </div>
            )}
        </div>
    );
}
