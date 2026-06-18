"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { isAdmin, isPresident } from "@/lib/roles";
import { getRoleLabel, ALL_ROLES, ADMIN_ROLES, LEADERSHIP_ROLES, isRoot } from "@/lib/roles";
import { ALL_RESIDENCY_OPTIONS, getResidencyLabel } from "@/lib/member-residency";
import type { ResidencyType } from "@/lib/member-residency";
import type { UserRole } from "@/contexts/auth-context";
import {
    useMembers,
    useEvents,
    useProjects,
    useResources,
    countMemberAttendanceOccurrences,
    type MemberItem,
} from "@/hooks/useFirestore";
import { countMemberProjects, countMemberUploads } from "@/lib/member-engagement";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Users,
    Search,
    Star,
    Shield,
    Crown,
    User,
    ExternalLink,
    Users2,
    Loader2,
    Briefcase,
    Terminal,
    X,
    Check,
    UserMinus,
    UserPlus,
    Handshake,
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    president: { label: "PRESIDENT", color: "bg-destructive/10 border-destructive/50 text-destructive", icon: <Crown className="w-3.5 h-3.5" /> },
    "vice-president": { label: "VICE PRES", color: "bg-chart-2/10 border-chart-2/50 text-chart-2", icon: <Shield className="w-3.5 h-3.5" /> },
    "community-manager": { label: "COMM MGR", color: "bg-chart-2/10 border-chart-2/50 text-chart-2", icon: <Shield className="w-3.5 h-3.5" /> },
    marketing: { label: "MARKETING", color: "bg-primary/10 border-primary/50 text-primary", icon: <Star className="w-3.5 h-3.5" /> },
    events: { label: "EVENTS", color: "bg-chart-3/10 border-chart-3/50 text-chart-3", icon: <Star className="w-3.5 h-3.5" /> },
    finance: { label: "FINANCE", color: "bg-chart-1/10 border-chart-1/50 text-chart-1", icon: <Briefcase className="w-3.5 h-3.5" /> },
    recruitment: { label: "RECRUITMENT", color: "bg-chart-4/10 border-chart-4/50 text-chart-4", icon: <UserPlus className="w-3.5 h-3.5" /> },
    outreach: { label: "OUTREACH", color: "bg-primary/10 border-primary/45 text-primary", icon: <Handshake className="w-3.5 h-3.5" /> },
    "vp-events": { label: "VP EVENTS", color: "bg-chart-3/10 border-chart-3/50 text-chart-3", icon: <Star className="w-3.5 h-3.5" /> },
    "vp-marketing": { label: "VP MKTG", color: "bg-primary/10 border-primary/50 text-primary", icon: <Star className="w-3.5 h-3.5" /> },
    "vp-prof-dev": { label: "VP PROF DEV", color: "bg-accent/10 border-accent/50 text-accent-foreground", icon: <Terminal className="w-3.5 h-3.5" /> },
    "vp-finance": { label: "VP FINANCE", color: "bg-chart-1/10 border-chart-1/50 text-chart-1", icon: <Briefcase className="w-3.5 h-3.5" /> },
    "vp-recruitment": { label: "VP RECRUIT", color: "bg-chart-4/10 border-chart-4/50 text-chart-4", icon: <UserPlus className="w-3.5 h-3.5" /> },
    "vp-outreach": { label: "VP OUTREACH", color: "bg-primary/10 border-primary/45 text-primary", icon: <Handshake className="w-3.5 h-3.5" /> },
    member: { label: "MEMBER", color: "bg-background border-border/50 text-muted-foreground", icon: <User className="w-3.5 h-3.5" /> },
    alumni: { label: "ALUMNI", color: "bg-chart-5/10 border-chart-5/50 text-chart-5", icon: <User className="w-3.5 h-3.5" /> },
};

const residencyBadgeClass: Record<ResidencyType, string> = {
    resident: "bg-chart-2/10 border-chart-2/40 text-chart-2",
    associate: "bg-primary/10 border-primary/40 text-primary",
    alumni: "bg-chart-5/10 border-chart-5/40 text-chart-5",
};

export default function MembersPage() {
    const { profile } = useAuth();
    const { data: members, loading } = useMembers();
    const { data: events } = useEvents();
    const { data: allProjects } = useProjects();
    const { data: allResources } = useResources(false);
    const [search, setSearch] = useState("");

    /** Distinct event sessions (including each recurring occurrence) marked present. */
    const getAttendedCount = (memberId: string) => countMemberAttendanceOccurrences(events, memberId);
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
    const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
    const [residencyUpdatingId, setResidencyUpdatingId] = useState<string | null>(null);

    const userIsAdmin = isAdmin(profile?.role);
    const userIsPresident = isPresident(profile?.role);

    const isAlumniMember = (m: MemberItem) => m.role === "alumni" || m.residency === "alumni";
    const isResidentsGroup = (m: MemberItem) =>
        m.residency === "resident" || isAdmin(m.role);

    const filtered = members
        .filter((m) => {
            if (roleFilter === "all") return true;
            if (roleFilter === "residents") return isResidentsGroup(m);
            if (roleFilter === "resident") return m.residency === "resident";
            if (roleFilter === "associate") return m.residency === "associate";
            if (roleFilter === "alumni") return isAlumniMember(m);
            return m.role === roleFilter;
        })
        .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.standoutSkill.toLowerCase().includes(search.toLowerCase()));

    const roleCounts = {
        total: members.length,
        residents: members.filter(isResidentsGroup).length,
        associates: members.filter((m) => m.residency === "associate").length,
        alumni: members.filter(isAlumniMember).length,
    };

    const rosterEngagement = useMemo(() => {
        const m = new Map<string, { projects: number; uploads: number }>();
        for (const member of members) {
            m.set(member.id, {
                projects: countMemberProjects(allProjects, member.id),
                uploads: countMemberUploads(allResources, member.id, member.name),
            });
        }
        return m;
    }, [members, allProjects, allResources]);

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in space-y-6 relative z-10">
            {/* Header */}
            <div className="border-b border-border/50 pb-5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                    <Users2 className="w-3.5 h-3.5" />
                    MEMBER DIRECTORY
                </div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">
                    CLUB <span className="gradient-text-cyber">DIRECTORY</span>
                </h1>
                <div className="text-muted-foreground mt-2 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {roleCounts.total} REGISTERED MEMBER{roleCounts.total !== 1 ? "S" : ""}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "RESIDENTS", value: roleCounts.residents, color: "text-chart-2", border: "border-chart-2/40", bg: "bg-chart-2/5" },
                    { label: "ASSOCIATES", value: roleCounts.associates, color: "text-primary", border: "border-primary/40", bg: "bg-primary/5" },
                    { label: "MEMBERS", value: roleCounts.total, color: "text-chart-4", border: "border-chart-4/40", bg: "bg-chart-4/5" },
                    { label: "ALUMNI", value: roleCounts.alumni, color: "text-chart-5", border: "border-chart-5/40", bg: "bg-chart-5/5" },
                ].map((stat) => (
                    <div key={stat.label} className={cn("hud-corners border p-5 text-center relative scanlines overflow-hidden group", stat.bg, stat.border)}>
                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none" style={{ background: `radial-gradient(circle, var(--${stat.color.split('-')[1]}) 0%, transparent 70%)`, opacity: 0.1 }} />
                        <div className={cn("text-3xl font-black tracking-tighter mb-1", stat.color)}>{stat.value}</div>
                        <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 hud-corners bg-card/60 border border-border/40 p-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                        type="text"
                        placeholder="SEARCH BY NAME OR SKILL..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-mono uppercase tracking-wide focus:outline-none placeholder:text-muted-foreground/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scroll pb-1 sm:pb-0 bg-card/40 border border-border/30 p-2 hud-panel-sm">
                    {["all", "residents", "resident", "associate", "alumni"].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRoleFilter(r)}
                            className={cn(
                                "px-4 py-2 hud-panel-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
                                roleFilter === r
                                    ? "bg-primary text-primary-foreground border-primary glow-border"
                                    : "bg-background/50 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {r === "all" ? "ALL" : r === "residents" ? "RESIDENTS" : r === "resident" ? "RESIDENT" : r === "associate" ? "ASSOCIATES" : "ALUMNI"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-mono text-primary uppercase tracking-widest animate-pulse">LOADING MEMBERS...</span>
                </div>
            )}

            {/* Member Grid */}
            {!loading && (
                <div className="flex-1 grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((member, i) => {
                        const rc = roleConfig[member.role] || roleConfig.member;
                        const isHighCommand = LEADERSHIP_ROLES.includes(member.role as UserRole);
                        const eng = rosterEngagement.get(member.id);

                        return (
                            <div
                                key={member.id}
                                onClick={() => setSelectedMember(member)}
                                className={cn("group bg-card/60 border p-5 transition-all hover:border-primary/50 relative flex flex-col scanlines cursor-pointer", i % 2 === 0 ? 'hud-panel' : 'hud-corners', isHighCommand ? "border-primary/40 bg-primary/5" : "border-border/40")}
                            >
                                {isHighCommand && (
                                    <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-primary/20 to-transparent pointer-events-none z-10" />
                                )}

                                <div className="flex items-start gap-4 mb-4 relative z-10">
                                    {member.photoURL ? (
                                        <img src={member.photoURL} alt="" className={cn("w-14 h-14 hud-corners object-cover border shadow-inner", isHighCommand ? "border-primary shadow-[inset_0_0_10px_rgba(203,247,2,0.2)]" : "border-border/50")} />
                                    ) : (
                                        <div className={cn("w-14 h-14 hud-corners flex items-center justify-center font-black text-xl border shadow-inner", isHighCommand ? "bg-primary/20 border-primary text-primary shadow-[inset_0_0_10px_rgba(203,247,2,0.2)]" : "bg-background border-border/50 text-muted-foreground")}>
                                            {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                            <h3 className="font-bold font-mono tracking-tight uppercase truncate group-hover:text-primary transition-colors">{member.name}</h3>
                                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90 shrink-0">{member.standoutSkill}</span>
                                            {member.linkedin && (
                                                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 hud-panel-sm bg-background border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm", rc.color)}>
                                                {rc.icon} {rc.label}
                                            </span>
                                            <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm", residencyBadgeClass[member.residency])}>
                                                {getResidencyLabel(member.residency).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 mb-4 p-3 hud-corners bg-background/40 border border-border/40 relative z-10">
                                    <p className={cn("text-xs font-mono text-foreground/90 leading-relaxed line-clamp-3", !member.bio && "text-muted-foreground italic")}>
                                        {member.bio || "No bio."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 relative z-10">
                                    <div className="hud-panel-sm bg-background/60 border border-border/40 py-2.5 px-1 text-center group-hover:border-primary/30 transition-colors">
                                        <div className="text-sm font-black text-primary font-mono">{eng?.projects ?? 0}</div>
                                        <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">PROJECTS</div>
                                    </div>
                                    <div className="hud-panel-sm bg-background/60 border border-border/40 py-2.5 px-1 text-center group-hover:border-primary/30 transition-colors">
                                        <div className="text-sm font-black text-chart-2 font-mono">{eng?.uploads ?? 0}</div>
                                        <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">UPLOADS</div>
                                    </div>
                                    <div className="hud-panel-sm bg-background/60 border border-border/40 py-2.5 px-1 text-center group-hover:border-primary/30 transition-colors">
                                        <div className="text-sm font-black text-chart-4 font-mono">{getAttendedCount(member.id)}</div>
                                        <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">EVENTS ATTENDED</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 hud-panel bg-card/40 border border-border/40 scanlines">
                    <Users className="w-16 h-16 text-muted-foreground/30 mb-4 relative z-10" />
                    <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10 text-center">NO MEMBERS MATCHING YOUR SEARCH.</p>
                </div>
            )}

            {/* Member Dossier Modal */}
            {selectedMember && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-none" />

                    <div className="relative w-full max-w-2xl bg-card border border-primary/50 hud-panel scanlines shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-full overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-primary/30 bg-primary/5">
                            <div className="flex items-center gap-2 text-primary font-mono tracking-widest text-xs uppercase font-bold">
                                <Terminal className="w-4 h-4" />
                                Member profile
                            </div>
                            <button
                                onClick={() => setSelectedMember(null)}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors hud-panel-sm"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 sm:p-8 overflow-y-auto custom-scroll flex-1">
                            <div className="flex flex-col sm:flex-row gap-6 mb-8">
                                <div className="shrink-0 flex justify-center">
                                    {selectedMember.photoURL ? (
                                        <img src={selectedMember.photoURL} alt="" className="w-32 h-32 sm:w-40 sm:h-40 hud-corners object-cover border border-primary shadow-[0_0_15px_rgba(203,247,2,0.2)]" />
                                    ) : (
                                        <div className="w-32 h-32 sm:w-40 sm:h-40 hud-corners bg-background/80 flex items-center justify-center font-black text-5xl border border-primary text-primary shadow-[0_0_15px_rgba(203,247,2,0.2)]">
                                            {selectedMember.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black uppercase tracking-tight mb-2 text-center sm:text-left">{selectedMember.name}</h2>

                                    <div className="flex flex-wrap items-center gap-2 mb-4 justify-center sm:justify-start">
                                        {userIsAdmin ? (
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">CLUB ROLE</label>
                                                    <select
                                                        value={selectedMember.role}
                                                        onChange={async (e) => {
                                                            const newRole = e.target.value;
                                                            if (!selectedMember?.id) return;
                                                            setRoleUpdatingId(selectedMember.id);
                                                            try {
                                                                await updateDoc(doc(db, "users", selectedMember.id), { role: newRole, updatedAt: serverTimestamp() });
                                                                setSelectedMember((prev) => (prev ? { ...prev, role: newRole } : null));
                                                            } catch (err) {
                                                                console.error("Role update error:", err);
                                                            } finally {
                                                                setRoleUpdatingId(null);
                                                            }
                                                        }}
                                                        disabled={roleUpdatingId === selectedMember.id || residencyUpdatingId === selectedMember.id}
                                                        className={cn("text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 border hud-panel-sm bg-background cursor-pointer", roleConfig[selectedMember.role]?.color || roleConfig.member.color)}
                                                    >
                                                        {ALL_ROLES.map((r) => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest">RESIDENCY</label>
                                                    <select
                                                        value={selectedMember.residency}
                                                        onChange={async (e) => {
                                                            const next = e.target.value as ResidencyType;
                                                            if (!selectedMember?.id) return;
                                                            setResidencyUpdatingId(selectedMember.id);
                                                            try {
                                                                await updateDoc(doc(db, "users", selectedMember.id), { residency: next, updatedAt: serverTimestamp() });
                                                                setSelectedMember((prev) => (prev ? { ...prev, residency: next } : null));
                                                            } catch (err) {
                                                                console.error("Residency update error:", err);
                                                            } finally {
                                                                setResidencyUpdatingId(null);
                                                            }
                                                        }}
                                                        disabled={residencyUpdatingId === selectedMember.id || roleUpdatingId === selectedMember.id}
                                                        className={cn("text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 border hud-panel-sm bg-background cursor-pointer", residencyBadgeClass[selectedMember.residency])}
                                                    >
                                                        {ALL_RESIDENCY_OPTIONS.map((r) => (
                                                            <option key={r.value} value={r.value}>{r.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 border hud-panel-sm", roleConfig[selectedMember.role]?.color || roleConfig.member.color)}>
                                                    {roleConfig[selectedMember.role]?.icon || roleConfig.member.icon}{" "}
                                                    {getRoleLabel(selectedMember.role, profile?.role)}
                                                </span>
                                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-widest px-3 py-1.5 border hud-panel-sm", residencyBadgeClass[selectedMember.residency])}>
                                                    {getResidencyLabel(selectedMember.residency).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {selectedMember.role === "alumni" && selectedMember.openToMentorship && (
                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1.5 border border-chart-2/50 bg-chart-2/10 text-chart-2 hud-panel-sm">
                                                <Users className="w-3 h-3" /> OPEN TO OUTREACH
                                            </span>
                                        )}
                                    </div>

                                    {selectedMember.bio && (
                                        <div className="bg-background/50 border border-border/40 p-4 hud-panel-sm relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary/50" />
                                            <p className="text-sm italic text-foreground/80 font-mono leading-relaxed">
                                                "{selectedMember.bio}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-2 border-b border-border/30 pb-1">PRIMARY SPECIALTY</div>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary text-primary hud-corners font-bold font-mono tracking-widest uppercase text-sm glow-border">
                                            <Star className="w-4 h-4 fill-primary" />
                                            {selectedMember.standoutSkill}
                                        </div>
                                    </div>

                                    {selectedMember.skills && selectedMember.skills.length > 0 && (
                                        <div>
                                            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/30 pb-1 flex items-center gap-2">
                                                <Terminal className="w-3 h-3 text-primary" /> ACQUIRED SKILLS
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedMember.skills.map((skill: string) => (
                                                    <span key={skill} className={cn("px-2 py-1 flex items-center gap-1.5 hud-panel-sm text-[10px] font-mono tracking-widest uppercase border", skill === selectedMember.standoutSkill ? "bg-primary/5 border-primary/50 text-primary font-bold" : "bg-card border-border/50 text-muted-foreground")}>
                                                        {skill === selectedMember.standoutSkill && <Check className="w-3 h-3" />}
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/30 pb-1 flex items-center gap-2">
                                        <Briefcase className="w-3 h-3 text-primary" /> ENGAGEMENT METRICS
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="hud-panel-sm bg-background/60 border border-border/40 p-3 text-center">
                                            <div className="text-xl font-black text-primary font-mono">
                                                {countMemberProjects(allProjects, selectedMember.id)}
                                            </div>
                                            <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">PROJECTS</div>
                                        </div>
                                        <div className="hud-panel-sm bg-background/60 border border-border/40 p-3 text-center">
                                            <div className="text-xl font-black text-chart-2 font-mono">
                                                {countMemberUploads(allResources, selectedMember.id, selectedMember.name)}
                                            </div>
                                            <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">UPLOADS</div>
                                        </div>
                                        <div className="hud-panel-sm bg-background/60 border border-border/40 p-3 text-center col-span-2">
                                            <div className="text-xl font-black text-chart-4 font-mono">{getAttendedCount(selectedMember.id)}</div>
                                            <div className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest mt-1">EVENTS ATTENDED</div>
                                        </div>
                                    </div>

                                    {selectedMember.linkedin && (
                                        <a href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer" className="mt-4 flex flex-col items-center justify-center p-3 hud-panel-sm bg-background border border-border/50 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors text-xs font-bold font-mono uppercase tracking-widest text-muted-foreground text-center gap-1">
                                            <ExternalLink className="w-4 h-4" /> VISIT PROFESSIONAL NETWORK
                                        </a>
                                    )}

                                    {userIsPresident &&
                                        selectedMember.id !== profile?.uid &&
                                        (isRoot(profile?.role) || selectedMember.role !== "president") &&
                                        (isRoot(profile?.role) || selectedMember.role !== "root") && (
                                        <div className="mt-6 pt-4 border-t border-border/40">
                                            {removeConfirm !== selectedMember.id ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setRemoveConfirm(selectedMember.id)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 hud-panel-sm border border-destructive/50 bg-destructive/10 text-destructive text-xs font-mono font-bold uppercase tracking-widest hover:bg-destructive/20 transition-colors"
                                                >
                                                    <UserMinus className="w-4 h-4" /> REMOVE MEMBER
                                                </button>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest text-center">Remove {selectedMember.name} from the directory? They will lose dashboard access.</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                if (!selectedMember?.id) return;
                                                                setRemovingId(selectedMember.id);
                                                                try {
                                                                    await updateDoc(doc(db, "users", selectedMember.id), { status: "removed", updatedAt: serverTimestamp() });
                                                                    setSelectedMember(null);
                                                                    setRemoveConfirm(null);
                                                                } catch (err) {
                                                                    console.error("Remove member error:", err);
                                                                } finally {
                                                                    setRemovingId(null);
                                                                }
                                                            }}
                                                            disabled={removingId === selectedMember.id}
                                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 hud-panel-sm bg-destructive text-destructive-foreground text-[10px] font-mono font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50"
                                                        >
                                                            {removingId === selectedMember.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                                                            {removingId === selectedMember.id ? "REMOVING..." : "CONFIRM REMOVE"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRemoveConfirm(null)}
                                                            disabled={removingId === selectedMember.id}
                                                            className="px-4 py-2.5 hud-panel-sm border border-border/50 text-muted-foreground text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-accent hover:text-foreground disabled:opacity-50"
                                                        >
                                                            CANCEL
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
