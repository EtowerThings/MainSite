"use client";

import { useAuth } from "@/contexts/auth-context";
import {
    User,
    Mail,
    Calendar,
    Trophy,
    FolderKanban,
    BookOpen,
    Star,
    Edit3,
    MessageCircle,
    Palette,
    Terminal,
    Target,
    Shield,
    X,
    Plus,
    Loader2,
    Search,
    Check,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SKILL_CATEGORIES } from "@/lib/skills";
import { getRoleLabel } from "@/lib/roles";
import { getResidencyLabel } from "@/lib/member-residency";
import { useProjects, useResources, useEvents, countMemberAttendanceOccurrences } from "@/hooks/useFirestore";
import { countMemberProjects, countMemberUploads, countMemberPitchProposals } from "@/lib/member-engagement";

export default function ProfilePage() {
    const { profile, refreshProfile } = useAuth();
    const { data: allProjects } = useProjects();
    const { data: allResources } = useResources(false);
    const { data: events } = useEvents();
    const [standoutSkill, setStandoutSkill] = useState(profile?.standoutSkill || "");
    const [skills, setSkills] = useState<string[]>(profile?.skills || []);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [skillSearch, setSkillSearch] = useState("");
    const [linkedin, setLinkedin] = useState(profile?.linkedin || "");
    const [openToMentorship, setOpenToMentorship] = useState(profile?.openToMentorship || false);

    const isAlumni = profile?.role === "alumni" || profile?.residency === "alumni";

    useEffect(() => {
        if (profile) {
            setStandoutSkill(profile.standoutSkill || "");
            setSkills(profile.skills || []);
            setLinkedin(profile.linkedin || "");
            setOpenToMentorship(profile.openToMentorship || false);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "users", profile.uid), {
                standoutSkill,
                skills,
                ...(isAlumni ? { linkedin, openToMentorship } : {}),
            });
            await refreshProfile();
            setEditing(false);
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setSaving(false);
        }
    };

    const toggleSkill = (skill: string) => {
        if (skills.includes(skill)) {
            setSkills(skills.filter(s => s !== skill));
            if (standoutSkill === skill) {
                setStandoutSkill("");
            }
        } else {
            setSkills([...skills, skill]);
        }
    };

    const filteredSkillCategories = Object.entries(SKILL_CATEGORIES).reduce(
        (acc, [category, catSkills]) => {
            const filtered = skillSearch
                ? catSkills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase()))
                : catSkills;
            if (filtered.length > 0) acc[category] = filtered;
            return acc;
        },
        {} as Record<string, string[]>
    );

    const uid = profile?.uid ?? null;
    const engagementCounts = useMemo(() => {
        if (!uid) {
            return { projects: 0, uploads: 0, pitches: 0, sessions: 0 };
        }
        return {
            projects: countMemberProjects(allProjects, uid),
            uploads: countMemberUploads(allResources, uid, profile?.displayName),
            pitches: countMemberPitchProposals(allProjects, uid),
            sessions: countMemberAttendanceOccurrences(events, uid),
        };
    }, [uid, profile?.displayName, allProjects, allResources, events]);

    const engagementMetrics = [
        {
            label: "Events attended",
            value: String(engagementCounts.sessions),
            icon: <Calendar className="w-4 h-4" />,
            color: "text-chart-1",
            border: "border-chart-1/40",
            bg: "bg-chart-1/5",
        },
        {
            label: "Team projects",
            value: String(engagementCounts.projects),
            icon: <FolderKanban className="w-4 h-4" />,
            color: "text-primary",
            border: "border-primary/40",
            bg: "bg-primary/5",
        },
        {
            label: "Resources shared",
            value: String(engagementCounts.uploads),
            icon: <BookOpen className="w-4 h-4" />,
            color: "text-chart-2",
            border: "border-chart-2/40",
            bg: "bg-chart-2/5",
        },
        {
            label: "Pitches in review",
            value: String(engagementCounts.pitches),
            icon: <Target className="w-4 h-4" />,
            color: "text-chart-5",
            border: "border-chart-5/40",
            bg: "bg-chart-5/5",
        },
    ];

    const projectHistory = (profile?.uid && allProjects
        ? allProjects.filter((p) => p.teamMembers?.some((m: { uid: string }) => m.uid === profile.uid))
        : []
    ).map((p) => {
        const status = p.status?.toLowerCase();
        const statusLabel =
            status === "complete"
                ? "Completed"
                : status === "active" || status === "published"
                  ? "In progress"
                  : "Draft / proposal";
        return {
            name: p.name,
            role: p.teamMembers?.find((m: { uid: string }) => m.uid === profile?.uid)?.role?.toUpperCase() ?? "MEMBER",
            status: statusLabel,
        };
    });

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in space-y-6 relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <div className="border-b border-border/50 pb-5">
                <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                    <User className="w-3.5 h-3.5" />
                    Your account
                </div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase relative group inline-block">
                    Your <span className="gradient-text-cyber">profile</span>
                </h1>
            </div>

            {/* Profile Card */}
            <div className="hud-panel bg-card/60 border border-primary/40 overflow-hidden relative scanlines shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />

                <div className="h-28 sm:h-36 bg-gradient-to-r from-background via-card to-background relative border-b border-border/50">
                    <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10" />
                    <div className="absolute -bottom-10 sm:-bottom-12 left-6 sm:left-8 z-10">
                        {profile?.photoURL ? (
                            <img src={profile.photoURL} alt="" className="w-20 h-20 sm:w-24 sm:h-24 hud-corners object-cover bg-background border border-primary text-primary shadow-[0_0_15px_rgba(203,247,2,0.3)]" />
                        ) : (
                            <div className="w-20 h-20 sm:w-24 sm:h-24 hud-corners bg-background/80 backdrop-blur-md border border-primary text-primary flex items-center justify-center text-3xl sm:text-4xl font-black shadow-[0_0_15px_rgba(203,247,2,0.3)]">
                                {profile?.displayName?.[0]?.toUpperCase() || "U"}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-14 sm:pt-16 px-6 sm:px-8 pb-8 relative z-10">
                    <h2 className="text-2xl font-black uppercase tracking-tight">{profile?.displayName || "Member"}</h2>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 uppercase tracking-widest bg-background/50 border border-border/50 px-3 py-1">
                            <Mail className="w-3.5 h-3.5" />
                            {profile?.email}
                        </span>
                        <span className="text-[10px] items-center gap-1.5 font-mono font-bold px-3 py-1 border hud-panel-sm bg-primary border-primary text-primary-foreground uppercase tracking-widest shadow-[0_0_10px_rgba(203,247,2,0.3)]">
                            <Shield className="w-3 h-3 inline mr-1" />
                            {getRoleLabel(profile?.role ?? "member")}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-3 py-1 border hud-panel-sm border-border/60 text-muted-foreground uppercase tracking-widest">
                            {getResidencyLabel(profile?.residency ?? "resident")}
                        </span>
                        {profile?.graduationYear && (
                            <span className="text-[10px] font-mono font-bold px-3 py-1 border hud-panel-sm border-border/60 text-muted-foreground uppercase tracking-widest">
                                Class of {profile.graduationYear}
                            </span>
                        )}
                    </div>

                    {/* Acquired Skills */}
                    <div className="mt-8 p-5 hud-panel-sm bg-background/40 border border-border/40 relative group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />

                        <div className="flex items-center justify-between mb-4 pl-2 border-b border-border/40 pb-3">
                            <h3 className="text-sm font-bold text-muted-foreground tracking-tight flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-primary" />
                                Skills & strengths
                            </h3>
                            {editing ? (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                        setEditing(false);
                                        setSkills(profile?.skills || []);
                                        setStandoutSkill(profile?.standoutSkill || "");
                                        if (isAlumni) {
                                            setLinkedin(profile?.linkedin || "");
                                            setOpenToMentorship(profile?.openToMentorship || false);
                                        }
                                    }} className="text-[10px] font-mono font-bold px-3 py-1 hud-panel-sm border border-border text-muted-foreground hover:bg-accent transition-all flex items-center gap-1.5 uppercase">
                                        CANCEL
                                    </button>
                                    <button onClick={handleSave} disabled={saving} className="text-[10px] font-mono font-bold px-3 py-1 hud-panel-sm bg-primary text-primary-foreground border border-primary hover:brightness-110 transition-all flex items-center gap-1.5 uppercase glow-border">
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save changes"}
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => setEditing(true)} className="text-[10px] font-mono font-bold px-3 py-1 hud-panel-sm bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-1.5 uppercase">
                                    <Edit3 className="w-3 h-3" />
                                    Edit profile
                                </button>
                            )}
                        </div>

                        <div className="pl-2 space-y-4">
                            {editing && (
                                <div className="space-y-4 mb-6 p-3 bg-background/50 border border-border/40 hud-panel-sm">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                                        <input
                                            type="text"
                                            value={skillSearch}
                                            onChange={(e) => setSkillSearch(e.target.value)}
                                            placeholder="Search skills…"
                                            className="w-full pl-10 pr-4 py-2 hud-panel-sm bg-card border border-border/50 focus:border-primary/50 text-xs font-mono uppercase transition-colors focus:outline-none"
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scroll pr-2 space-y-4">
                                        {Object.entries(filteredSkillCategories).map(([category, catSkills]) => (
                                            <div key={category}>
                                                <div className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border/30 pb-1">
                                                    {category}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {catSkills.map((skill) => (
                                                        <button
                                                            key={skill}
                                                            onClick={() => toggleSkill(skill)}
                                                            className={cn(
                                                                "px-2 py-1 flex items-center gap-1.5 hud-panel-sm text-[10px] font-mono font-bold tracking-widest uppercase transition-all border",
                                                                skills.includes(skill)
                                                                    ? "bg-primary/10 text-primary border-primary glow-border"
                                                                    : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:border-border"
                                                            )}
                                                        >
                                                            {skills.includes(skill) && <Check className="w-3 h-3" />}
                                                            {skill}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(filteredSkillCategories).length === 0 && (
                                            <div className="text-center py-4 text-xs font-mono text-muted-foreground uppercase">
                                                NO SKILLS FOUND MATCHING "{skillSearch}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {skills.length === 0 ? (
                                <p className="text-xs font-mono text-muted-foreground italic">No skills added yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill) => (
                                        <div
                                            key={skill}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 border text-xs font-mono font-bold uppercase tracking-widest transition-all",
                                                standoutSkill === skill
                                                    ? "bg-primary/10 border-primary text-primary glow-border hud-corners"
                                                    : "bg-background/80 border-border/50 text-foreground hud-panel-sm",
                                                editing && standoutSkill !== skill && "cursor-pointer hover:border-primary/50"
                                            )}
                                            onClick={() => editing && setStandoutSkill(skill)}
                                            title={editing ? (standoutSkill === skill ? "Primary Specialty" : "Click to set as Primary Specialty") : (standoutSkill === skill ? "Primary Specialty" : "")}
                                        >
                                            {standoutSkill === skill && <Star className="w-3.5 h-3.5 fill-primary text-primary" />}
                                            {skill}
                                            {editing && (
                                                <button onClick={(e) => { e.stopPropagation(); toggleSkill(skill); }} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {editing && skills.length > 0 && (
                                <p className="text-[10px] font-mono text-muted-foreground uppercase mt-2">
                                    * Click a skill token to designate it as your <span className="text-primary font-bold">PRIMARY SPECIALTY</span>.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Alumni Settings */}
            {isAlumni && (
                <div className="hud-panel bg-card/60 border border-primary/40 overflow-hidden relative scanlines shadow-lg p-6 sm:p-8">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none" />

                    <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-3 relative z-10 border-b border-primary/40 pb-4 text-primary">
                        <Terminal className="w-5 h-5 text-primary" />
                        Alumni settings
                    </h2>

                    <div className="space-y-6 relative z-10 max-w-2xl">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                                LINKEDIN URL
                                {editing && <span className="text-[8px] bg-warning/10 text-warning px-1 border border-warning/20">EDITING</span>}
                            </label>
                            {editing ? (
                                <input
                                    type="url"
                                    value={linkedin}
                                    onChange={(e) => setLinkedin(e.target.value)}
                                    placeholder="https://linkedin.com/in/..."
                                    className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none"
                                />
                            ) : (
                                <p className="w-full px-4 py-3 hud-panel-sm bg-background/40 border border-border/50 text-sm font-mono transition-colors overflow-hidden text-ellipsis">
                                    {linkedin || <span className="text-muted-foreground/50 italic">NOT PROVIDED</span>}
                                </p>
                            )}
                        </div>

                        <label className="flex items-start justify-between p-4 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors cursor-pointer group">
                            <div className="pr-4">
                                <p className={cn("text-sm font-bold font-mono uppercase tracking-tight transition-colors", openToMentorship ? "text-primary" : "text-foreground group-hover:text-primary")}>
                                    OPEN TO MENTORSHIP
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                                    Allow active members to contact you for networking and guidance
                                </p>
                            </div>
                            <div
                                className={cn("w-12 h-6 border hud-panel-sm relative transition-all mt-1 flex-shrink-0",
                                    editing ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                                    openToMentorship ? "bg-primary/20 border-primary" : "bg-card border-border/50"
                                )}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (editing) setOpenToMentorship(!openToMentorship);
                                }}
                            >
                                <div className={cn("absolute top-0.5 w-4 h-4 transition-all",
                                    openToMentorship ? "right-0.5 bg-primary glow-border shadow-[0_0_8px_rgba(203,247,2,1)]" : "left-0.5 bg-muted-foreground/40"
                                )} />
                            </div>
                        </label>

                        {!editing && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-2 uppercase">
                                * In the skills section above, click Edit profile to change these settings.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Engagement Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {engagementMetrics.map((metric) => (
                    <div key={metric.label} className={cn("hud-corners bg-card/60 p-5 text-center relative scanlines overflow-hidden group border", metric.border, metric.bg)}>
                        <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none" style={{ background: `radial-gradient(circle, var(--${metric.color.split('-')[1]}) 0%, transparent 70%)`, opacity: 0.1 }} />
                        <div className={cn("w-10 h-10 hud-corners flex items-center justify-center mx-auto mb-3 border relative z-10", metric.border, "bg-background/80")}>
                            {metric.icon}
                        </div>
                        <div className={cn("text-3xl font-black tracking-tighter mb-1 relative z-10", metric.color.split(' ')[0])}>{metric.value}</div>
                        <div className="text-[10px] font-mono font-semibold text-muted-foreground tracking-tight relative z-10 text-center leading-snug px-1">
                            {metric.label}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Project History */}
                <div className="lg:col-span-2 hud-panel-alt bg-card/60 border border-border/40 p-6 sm:p-8 scanlines relative">
                    <div className="absolute top-0 right-0 w-1 h-32 bg-gradient-to-b from-primary/50 to-transparent" />

                    <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-3 relative z-10 border-b border-border/40 pb-4">
                        <FolderKanban className="w-5 h-5 text-primary" />
                        Your projects
                    </h2>

                    <div className="space-y-4 relative z-10">
                        {projectHistory.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4 text-center border border-border/40 hud-panel-sm px-3">
                                When you join a project team, it will show up here.
                            </p>
                        ) : (
                        projectHistory.map((project, i) => (
                            <div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors group gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 hud-corners bg-card flex items-center justify-center text-muted-foreground group-hover:text-primary border border-border/50 text-sm font-black transition-colors">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold font-mono tracking-tight uppercase group-hover:text-primary transition-colors">{project.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                                            Your role: <span className="text-foreground">{project.role}</span>
                                        </p>
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-[9px] font-mono font-bold px-3 py-1 border hud-panel-sm uppercase tracking-widest self-start sm:self-auto",
                                    project.status === "Completed" ? "bg-success/10 border-success/30 text-success" :
                                        project.status === "In progress" ? "bg-primary/10 border-primary/30 text-primary glow-border" :
                                            "bg-warning/10 border-warning/30 text-warning"
                                )}>
                                    {project.status}
                                </span>
                            </div>
                        ))
                        )}
                    </div>
                </div>

                {/* Notification Preferences */}
                <div className="hud-corners bg-card/60 border border-border/40 p-6 sm:p-8 scanlines relative h-fit">
                    <h2 className="text-lg font-bold tracking-tight mb-6 flex items-center gap-3 relative z-10 border-b border-border/40 pb-4">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        Notifications
                    </h2>

                    <div className="space-y-4 relative z-10">
                        <label className="flex items-start justify-between p-4 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors cursor-pointer group">
                            <div className="pr-4">
                                <p className="text-sm font-bold font-mono uppercase tracking-tight group-hover:text-primary transition-colors">Email from the club</p>
                                <p className="text-[10px] font-mono text-muted-foreground mt-1 leading-relaxed">General updates and announcements (placeholder)</p>
                            </div>
                            <div className="w-12 h-6 border border-primary hud-panel-sm bg-primary/20 relative cursor-pointer shrink-0 mt-1">
                                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-primary transition-all glow-border shadow-[0_0_8px_rgba(203,247,2,1)]" />
                            </div>
                        </label>

                        <label className="flex items-start justify-between p-4 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors cursor-pointer group">
                            <div className="pr-4">
                                <p className="text-sm font-bold font-mono uppercase tracking-tight group-hover:text-primary transition-colors">WhatsApp alerts</p>
                                <p className="text-[10px] font-mono text-muted-foreground mt-1 leading-relaxed">Time-sensitive reminders on WhatsApp (placeholder)</p>
                            </div>
                            <div className="w-12 h-6 border border-border/50 hud-panel-sm bg-card relative cursor-pointer shrink-0 mt-1">
                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-muted-foreground/40 transition-all" />
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
