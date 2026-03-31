"use client";

import { useState, useMemo, Fragment } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
    useInquiries,
    useResources,
    useProjects,
    useMembers,
    useActionItems,
    useStartups,
    useEvents,
    getAttendanceIdsForOccurrence,
} from "@/hooks/useFirestore";
import { expandAllEventOccurrences, occurrenceEventLike, type EventOccurrenceRow } from "@/lib/recurring-events";
import { getEventStartMs, parseEventDate } from "@/lib/event-dates";
import { isAdmin } from "@/lib/roles";
import { getRoleLabel, ALL_ROLES } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    MessageSquare,
    Users,
    Send,
    ThumbsUp,
    ThumbsDown,
    Shield,
    FileText,
    BookOpen,
    Loader2,
    Megaphone,
    UserPlus,
    Plus,
    Check,
    X,
    CheckSquare,
    Target,
    Rocket,
    Download,
    List,
    ClipboardCheck,
    Search,
    CalendarDays,
} from "lucide-react";

function formatOccurrenceDisplay(isoYmd: string): string {
    const d = new Date(isoYmd + "T12:00:00");
    if (isNaN(d.getTime())) return isoYmd;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function localTodayYmd(): string {
    const n = new Date();
    const m = String(n.getMonth() + 1).padStart(2, "0");
    const day = String(n.getDate()).padStart(2, "0");
    return `${n.getFullYear()}-${m}-${day}`;
}

function calendarYmdForOccurrence(row: EventOccurrenceRow): string {
    const raw = row.occurrenceDate?.trim() ?? "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const p = parseEventDate(raw);
    if (p) {
        return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
    }
    const ms = getEventStartMs(occurrenceEventLike(row));
    if (ms == null) return "";
    const x = new Date(ms);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

type AttendanceTableItem =
    | { kind: "section"; label: string; sub?: string }
    | { kind: "row"; row: EventOccurrenceRow; isToday: boolean; isPast: boolean };

type AdminTab =
    | "announcements"
    | "actionItems"
    | "startups"
    | "applications"
    | "inquiries"
    | "pitches"
    | "resources"
    | "profiles"
    | "eventAttendance"
    | "skillsExport";

export default function AdminPage() {
    const { profile, user } = useAuth();
    const userIsAdmin = isAdmin(profile?.role);
    const { data: inquiries, loading: inquiriesLoading, replyToInquiry, publishToFaq } = useInquiries(userIsAdmin);
    const { data: resources, loading: resourcesLoading, approveResource, rejectResource } = useResources(false, userIsAdmin);
    const { data: projects, loading: projectsLoading } = useProjects(userIsAdmin);
    const { data: members, loading: membersLoading } = useMembers(userIsAdmin);
    const { data: actionItems, loading: actionItemsLoading } = useActionItems(userIsAdmin);
    const { data: startups, loading: startupsLoading } = useStartups(userIsAdmin);
    const { data: events, loading: eventsLoading, setEventOccurrenceAttendance } = useEvents(userIsAdmin);

    const [activeTab, setActiveTab] = useState<AdminTab>("announcements");
    const [replyText, setReplyText] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    // Announcement state
    const [announcementTitle, setAnnouncementTitle] = useState("");
    const [announcementBody, setAnnouncementBody] = useState("");
    const [announcementSending, setAnnouncementSending] = useState(false);

    // Action Items state
    const [actionTitle, setActionTitle] = useState("");
    const [actionDesc, setActionDesc] = useState("");
    const [actionDeadline, setActionDeadline] = useState("");
    const [actionType, setActionType] = useState<"external" | "form">("external");
    const [actionLink, setActionLink] = useState("");
    const [actionSending, setActionSending] = useState(false);

    // Startups state
    const [startupName, setStartupName] = useState("");
    const [startupDesc, setStartupDesc] = useState("");
    const [startupFounders, setStartupFounders] = useState("");
    const [startupYear, setStartupYear] = useState("");
    const [startupWebsite, setStartupWebsite] = useState("");
    const [startupSending, setStartupSending] = useState(false);

    // Applications state
    const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

    const [attendanceRowExpandKey, setAttendanceRowExpandKey] = useState<string | null>(null);
    const [attendanceTableSearch, setAttendanceTableSearch] = useState("");
    const [attendanceSaving, setAttendanceSaving] = useState(false);

    const loading =
        inquiriesLoading ||
        resourcesLoading ||
        projectsLoading ||
        membersLoading ||
        actionItemsLoading ||
        startupsLoading ||
        eventsLoading;

    const pendingInquiries = inquiries.filter((i) => i.status === "pending");
    const pendingResources = resources.filter((r) => !r.approved);
    const pendingPitches = projects.filter((p) => p.status === "ideation");
    const pendingApplications = members.filter((m) => m.status === "pending");
    const approvedMembers = members.filter((m) => m.status !== "pending" && m.status !== "rejected");

    // Skill → people map for batch export (each skill lists all people who have it)
    const skillToPeople = useMemo(() => {
        const map = new Map<string, { people: { id: string; name: string; role: string }[]; displayName: string }>();
        for (const member of approvedMembers) {
            const skills = [...(member.skills || [])];
            if (member.standoutSkill && member.standoutSkill !== "—" && !skills.includes(member.standoutSkill)) {
                skills.push(member.standoutSkill);
            }
            for (const skill of skills) {
                const trimmed = skill?.trim();
                if (!trimmed) continue;
                const key = trimmed.toLowerCase();
                const existing = map.get(key);
                const person = { id: member.id, name: member.name, role: member.role };
                if (existing) {
                    if (!existing.people.some((p) => p.id === member.id)) existing.people.push(person);
                } else {
                    map.set(key, { people: [person], displayName: trimmed });
                }
            }
        }
        return map;
    }, [approvedMembers]);

    const attendanceTableItems = useMemo((): AttendanceTableItem[] => {
        const rows = expandAllEventOccurrences(events);
        const todayYmd = localTodayYmd();
        const upcoming: EventOccurrenceRow[] = [];
        const todayRows: EventOccurrenceRow[] = [];
        const past: EventOccurrenceRow[] = [];

        for (const row of rows) {
            const ymd = calendarYmdForOccurrence(row);
            if (!ymd) {
                upcoming.push(row);
                continue;
            }
            if (ymd > todayYmd) upcoming.push(row);
            else if (ymd === todayYmd) todayRows.push(row);
            else past.push(row);
        }

        const byStartAsc = (a: EventOccurrenceRow, b: EventOccurrenceRow) =>
            (getEventStartMs(occurrenceEventLike(a)) ?? 0) - (getEventStartMs(occurrenceEventLike(b)) ?? 0);
        const byStartDesc = (a: EventOccurrenceRow, b: EventOccurrenceRow) => byStartAsc(b, a);
        upcoming.sort(byStartAsc);
        todayRows.sort(byStartAsc);
        past.sort(byStartDesc);

        const items: AttendanceTableItem[] = [];
        const todayLabel = formatOccurrenceDisplay(todayYmd);

        if (upcoming.length > 0) {
            items.push({ kind: "section", label: "Upcoming" });
            for (const row of upcoming) {
                items.push({ kind: "row", row, isToday: false, isPast: false });
            }
        }
        if (todayRows.length > 0) {
            items.push({ kind: "section", label: "Today", sub: todayLabel });
            for (const row of todayRows) {
                items.push({ kind: "row", row, isToday: true, isPast: false });
            }
        }
        if (past.length > 0) {
            items.push({ kind: "section", label: "Past" });
            for (const row of past) {
                items.push({ kind: "row", row, isToday: false, isPast: true });
            }
        }

        return items;
    }, [events]);

    const nonAlumniAttendanceMembers = useMemo(
        () => approvedMembers.filter((m) => m.role !== "alumni"),
        [approvedMembers]
    );

    const attendanceTableFilteredMembers = useMemo(() => {
        if (!attendanceTableSearch.trim()) return nonAlumniAttendanceMembers;
        const q = attendanceTableSearch.toLowerCase().trim();
        return nonAlumniAttendanceMembers.filter(
            (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        );
    }, [nonAlumniAttendanceMembers, attendanceTableSearch]);

    const toggleOccurrenceAttendance = async (eventId: string, occurrenceYmd: string, userId: string) => {
        const ev = events.find((e) => e.id === eventId);
        if (!ev || attendanceSaving) return;
        const cur = getAttendanceIdsForOccurrence(ev, occurrenceYmd);
        const next = cur.includes(userId) ? cur.filter((id) => id !== userId) : [...cur, userId];
        setAttendanceSaving(true);
        try {
            await setEventOccurrenceAttendance(eventId, occurrenceYmd, next);
        } finally {
            setAttendanceSaving(false);
        }
    };

    const skillsExportEntries = useMemo(() => {
        return Array.from(skillToPeople.entries())
            .map(([_, v]) => ({ skill: v.displayName, people: v.people }))
            .sort((a, b) => a.skill.localeCompare(b.skill, undefined, { sensitivity: "base" }));
    }, [skillToPeople]);

    const downloadSkillsCsv = () => {
        const header = "Skill,Name,Role\n";
        const rows = skillsExportEntries.flatMap((e) =>
            e.people.map((p) => `"${e.skill.replace(/"/g, '""')}","${p.name.replace(/"/g, '""')}","${p.role}"`)
        );
        const csv = header + rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `skills-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const downloadSkillsJson = () => {
        const obj: Record<string, string[]> = {};
        for (const e of skillsExportEntries) {
            obj[e.skill] = e.people.map((p) => p.name);
        }
        const json = JSON.stringify(obj, null, 2);
        const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `skills-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    if (!userIsAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in relative z-10 hud-panel bg-card/40 border border-destructive/40 scanlines p-8 text-center max-w-lg mx-auto mt-20">
                <Shield className="w-16 h-16 text-destructive mb-6" />
                <h1 className="text-2xl font-black uppercase tracking-tighter text-destructive mb-2">ACCESS DENIED</h1>
                <p className="text-sm font-mono text-muted-foreground mb-4">You do not have the required clearance level to access the Command Center.</p>
                <div className="text-[10px] font-mono text-destructive/80 uppercase tracking-widest border border-destructive/20 bg-destructive/5 px-4 py-2">
                    ERROR CODE: 403_FORBIDDEN
                </div>
            </div>
        );
    }

    const tabs: { key: AdminTab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: "announcements", label: "BROADCASTS", icon: <Megaphone className="w-4 h-4" /> },
        { key: "actionItems", label: "DEADLINES", icon: <CheckSquare className="w-4 h-4" /> },
        { key: "startups", label: "STARTUPS", icon: <Rocket className="w-4 h-4" /> },
        { key: "applications", label: "APPLICATIONS", icon: <UserPlus className="w-4 h-4" />, count: pendingApplications.length },
        { key: "inquiries", label: "COMMUNICATIONS", icon: <MessageSquare className="w-4 h-4" />, count: pendingInquiries.length },
        { key: "pitches", label: "PROPOSALS", icon: <FileText className="w-4 h-4" />, count: pendingPitches.length },
        { key: "resources", label: "DATA LOGS", icon: <BookOpen className="w-4 h-4" />, count: pendingResources.length },
        { key: "profiles", label: "ROSTER", icon: <Users className="w-4 h-4" />, count: approvedMembers.length },
        { key: "eventAttendance", label: "ATTENDANCE", icon: <ClipboardCheck className="w-4 h-4" /> },
        { key: "skillsExport", label: "SKILLS EXPORT", icon: <List className="w-4 h-4" /> },
    ];

    const handleReply = async (inquiryId: string) => {
        if (!replyText.trim()) return;
        await replyToInquiry(inquiryId, replyText, profile?.displayName || "HIGH COMMAND");
        setReplyText("");
        setReplyingTo(null);
    };

    const handlePublishFaq = async (inquiryId: string, question: string, reply: string) => {
        await publishToFaq(inquiryId, question, reply);
    };

    // ── Announcements ──
    const handleCreateAnnouncement = async () => {
        if (!announcementTitle.trim() || !announcementBody.trim()) return;
        setAnnouncementSending(true);
        try {
            await addDoc(collection(db, "activityFeed"), {
                type: "announcement",
                actorId: user?.uid || "",
                actorName: profile?.displayName || "HIGH COMMAND",
                description: announcementBody,
                targetId: null,
                targetName: announcementTitle,
                pinned: true,
                pinnedBy: user?.uid || "",
                createdAt: serverTimestamp(),
            });
            await addDoc(collection(db, "announcements"), {
                title: announcementTitle,
                body: announcementBody,
                createdBy: user?.uid || "",
                createdByName: profile?.displayName || "HIGH COMMAND",
                createdAt: serverTimestamp(),
            });
            setAnnouncementTitle("");
            setAnnouncementBody("");
        } catch (err) {
            console.error("Announcement error:", err);
        } finally {
            setAnnouncementSending(false);
        }
    };

    // ── Action Items ──
    const handleCreateActionItem = async () => {
        if (!actionTitle.trim() || !actionDesc.trim() || !actionDeadline) return;
        setActionSending(true);
        try {
            const res = await fetch("/api/action-items", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-user-uid": user?.uid || ""
                },
                body: JSON.stringify({
                    title: actionTitle,
                    description: actionDesc,
                    deadline: actionDeadline,
                    type: actionType,
                    link: actionType === "form" ? actionLink : null,
                })
            });
            if (res.ok) {
                setActionTitle("");
                setActionDesc("");
                setActionDeadline("");
                setActionType("external");
                setActionLink("");
            } else {
                console.error("Failed to create action item");
            }
        } catch (err) {
            console.error("Action item error:", err);
        } finally {
            setActionSending(false);
        }
    };

    // ── Startup Generation ──
    const handleCreateStartup = async () => {
        if (!startupName.trim() || !startupDesc.trim() || !startupFounders.trim() || !startupYear.trim()) return;
        setStartupSending(true);
        try {
            await addDoc(collection(db, "startups"), {
                name: startupName.trim(),
                description: startupDesc.trim(),
                founders: startupFounders.trim(),
                foundedYear: startupYear.trim(),
                website: startupWebsite.trim() || null,
                createdAt: serverTimestamp(),
            });

            // Announce to feed
            await addDoc(collection(db, "activityFeed"), {
                type: "milestone_update",
                actorId: profile?.uid || "admin",
                actorName: "System",
                targetId: "startups",
                targetName: startupName,
                description: `Added "${startupName}" to the Alumni Startups Gallery.`,
                pinned: false,
                pinnedBy: null,
                createdAt: serverTimestamp(),
            });

            setStartupName("");
            setStartupDesc("");
            setStartupFounders("");
            setStartupYear("");
            setStartupWebsite("");
        } catch (err) {
            console.error("Startup creation error:", err);
        } finally {
            setStartupSending(false);
        }
    };

    // ── Application Handling ──
    const handleAuthorize = async (id: string) => {
        const assignedRole = selectedRoles[id] || "resident";
        await updateDoc(doc(db, "users", id), { role: assignedRole, status: "approved", updatedAt: serverTimestamp() });
    };

    const handleReject = async (id: string) => {
        await updateDoc(doc(db, "users", id), { status: "rejected" });
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in space-y-6 relative z-10 max-w-5xl mx-auto">
            {/* Header */}
            <div className="border-b border-border/50 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        CODE ADMIN
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase relative group inline-block">
                        CODE <span className="gradient-text-cyber">OPERATIONS</span>
                        <div className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </h1>
                </div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/70 bg-primary/5 px-3 py-1.5 border border-primary/20 flex items-center gap-2 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(203,247,2,0.1)_50%,transparent_75%)] bg-[length:4px_4px]" />
                    CLEARANCE: HIGH COMMAND
                </div>
            </div>

            {/* Tabs (Frequency Switcher) */}
            <div className="flex gap-2 w-full overflow-x-auto custom-scroll pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2.5 px-5 py-3 hud-panel-sm text-[10px] font-mono font-bold uppercase tracking-widest whitespace-nowrap transition-all border shrink-0",
                            activeTab === tab.key
                                ? "bg-primary text-primary-foreground border-primary glow-border shadow-[0_0_15px_rgba(203,247,2,0.3)]"
                                : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className={cn(
                                "text-[9px] px-1.5 py-0.5 border",
                                activeTab === tab.key
                                    ? "bg-background/20 border-background/40 text-primary-foreground"
                                    : "bg-primary/10 border-primary/30 text-primary animate-pulse"
                            )}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 flex-1">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest animate-pulse">DECRYPTING COMM SECRETS...</span>
                </div>
            )}

            {!loading && (
                <div className="flex-1 space-y-6">
                    {/* ── Announcements Tab ── */}
                    {activeTab === "announcements" && (
                        <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
                            <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                                <Megaphone className="w-5 h-5" /> TRANSMIT GLOBAL BROADCAST
                            </h3>
                            <div className="space-y-5 relative z-10">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">TRANSMISSION HEADER</label>
                                    <input type="text" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="e.g. ALL UNITS STANDBY..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">PAYLOAD</label>
                                    <textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="Enter briefing details..." rows={4} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                </div>
                                <div className="pt-2 flex items-center justify-between">
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-relaxed max-w-sm border-l-2 border-primary/30 pl-3">
                                        BROADCASTS ARE AUTO-PINNED TO THE GLOBAL TELEMETRY FEED FOR MAXIMUM VISIBILITY.
                                    </p>
                                    <button
                                        onClick={handleCreateAnnouncement}
                                        disabled={announcementSending || !announcementTitle.trim() || !announcementBody.trim()}
                                        className="hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-3"
                                    >
                                        {announcementSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        {announcementSending ? "TRANSMITTING..." : "EXECUTE BROADCAST"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Action Items Tab ── */}
                    {activeTab === "actionItems" && (
                        <div className="space-y-6">
                            <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
                                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                                    <Target className="w-5 h-5" /> CREATE ACTION ITEM (DEADLINE)
                                </h3>

                                <div className="space-y-5 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">DIRECTIVE OBJECTIVE</label>
                                        <input type="text" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} placeholder="e.g. SUBMIT RESUME FOR SHF..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">DEADLINE TIMEFRAME</label>
                                        <input type="datetime-local" value={actionDeadline} onChange={(e) => setActionDeadline(e.target.value)} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">DELIVERY FORMAT</label>
                                        <select value={actionType} onChange={(e) => setActionType(e.target.value as "external" | "form")} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none appearance-none">
                                            <option value="external">EXTERNAL TASK (CHECKBOX)</option>
                                            <option value="form">LINKED DIRECTIVE (FORM)</option>
                                        </select>
                                    </div>

                                    {actionType === "form" && (
                                        <div className="space-y-1.5 col-span-1 md:col-span-2">
                                            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">TARGET URL</label>
                                            <input type="url" value={actionLink} onChange={(e) => setActionLink(e.target.value)} placeholder="https://forms.gle/..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                        </div>
                                    )}

                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">ADDITIONAL BRIEFING</label>
                                        <textarea value={actionDesc} onChange={(e) => setActionDesc(e.target.value)} placeholder="Provide further context or instructions..." rows={3} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 pt-2 flex items-center justify-end">
                                        <button
                                            onClick={handleCreateActionItem}
                                            disabled={actionSending || !actionTitle.trim() || !actionDesc.trim() || !actionDeadline || (actionType === "form" && !actionLink)}
                                            className="hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {actionSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {actionSending ? "INITIALIZING..." : "PUBLISH DIRECTIVE"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Startups Tab ── */}
                    {activeTab === "startups" && (
                        <div className="space-y-6">
                            <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
                                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                                    <Rocket className="w-5 h-5" /> INITIALIZE ALUMNI STARTUP
                                </h3>

                                <div className="space-y-5 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY DESIGNATION</label>
                                        <input type="text" value={startupName} onChange={(e) => setStartupName(e.target.value)} placeholder="e.g. OpenAI..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">YEAR ESTABLISHED</label>
                                        <input type="text" value={startupYear} onChange={(e) => setStartupYear(e.target.value)} placeholder="e.g. 2024..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">FOUNDING OPERATIVES</label>
                                        <input type="text" value={startupFounders} onChange={(e) => setStartupFounders(e.target.value)} placeholder="e.g. Alice & Bob..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-1">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">EXTERNAL DOMAIN</label>
                                        <input type="url" value={startupWebsite} onChange={(e) => setStartupWebsite(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                    </div>

                                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">MISSION SYNOPSIS</label>
                                        <textarea value={startupDesc} onChange={(e) => setStartupDesc(e.target.value)} placeholder="Describe the startup's purpose..." rows={3} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 pt-2 flex items-center justify-between">
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-relaxed max-w-sm border-l-2 border-primary/30 pl-3">
                                            NEW STARTUP DATA WILL BE PUBLISHED IMMEDIATELY TO THE PUBLIC STARTUP GALLERY.
                                        </p>
                                        <button
                                            onClick={handleCreateStartup}
                                            disabled={startupSending || !startupName.trim() || !startupDesc.trim()}
                                            className="hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-3"
                                        >
                                            {startupSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            {startupSending ? "INITIALIZING..." : "PUBLISH STARTUP"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Existing Startups List Admin View */}
                            <div className="hud-panel bg-card/40 border border-border/40 p-6 sm:p-8 scanlines relative mt-6">
                                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-tight relative z-10 text-muted-foreground">
                                    <Rocket className="w-4 h-4" /> EXTANT STARTUPS
                                    <span className="ml-auto text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5">{startups.length} REGISTERED</span>
                                </h3>
                                {startups.length === 0 ? (
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10">NO DATA LOGS REQUIRE REVIEW.</p>
                                ) : (
                                    <div className="space-y-3 relative z-10">
                                        {startups.map(startup => (
                                            <div key={startup.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors">
                                                <div>
                                                    <p className="font-bold font-mono tracking-tight uppercase text-sm">
                                                        {startup.name}
                                                        <span className="text-muted-foreground ml-2">[{startup.foundedYear}]</span>
                                                    </p>
                                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                                                        FOUNDERS: <span className="text-foreground">{startup.founders}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Applications Tab ── */}
                    {activeTab === "applications" && (
                        <div className="space-y-4">
                            {pendingApplications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                                    <UserPlus className="w-12 h-12 text-muted-foreground/30 mb-4 relative z-10" />
                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10">NO PENDING APPLICATIONS.</p>
                                </div>
                            ) : pendingApplications.map((app, i) => (
                                <div key={app.id} className={cn("group p-5 transition-all relative flex flex-col scanlines", i % 2 === 0 ? 'hud-panel' : 'hud-corners', "bg-warning/5 border border-warning/30 hover:border-warning/50")}>
                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                        <div>
                                            <h3 className="font-bold text-base uppercase tracking-tight truncate pr-4">{app.name}</h3>
                                            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2 mt-1">
                                                <span>{app.email}</span>
                                                <div className="w-1 h-1 bg-border rotate-45" />
                                                <span>SPEC: {app.standoutSkill}</span>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm whitespace-nowrap bg-warning/20 border-warning text-warning animate-pulse">
                                            AWAITING CLEARANCE
                                        </span>
                                    </div>

                                    {app.bio && (
                                        <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4 line-clamp-2 relative z-10">
                                            <span className="text-primary/50 mr-2">&gt;</span>{app.bio}
                                        </p>
                                    )}

                                    <div className="flex flex-col sm:flex-row gap-3 relative z-10 mt-2 sm:items-center">
                                        <div className="w-full sm:w-auto relative group shrink-0">
                                            <label className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest block mb-1">ASSIGN CLEARANCE</label>
                                            <select
                                                value={selectedRoles[app.id] || "resident"}
                                                onChange={(e) => setSelectedRoles({ ...selectedRoles, [app.id]: e.target.value })}
                                                className="w-full sm:w-48 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-2 hud-panel-sm bg-background border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none"
                                            >
                                                {ALL_ROLES.map((r) => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex gap-2 flex-1 sm:mt-4">
                                            <button onClick={() => handleAuthorize(app.id)} className="flex-1 py-2 hud-panel-sm bg-success/10 border border-success/30 text-success text-xs font-mono font-bold uppercase tracking-widest hover:bg-success hover:text-success-foreground transition-all flex items-center justify-center gap-2 h-9">
                                                <Check className="w-3.5 h-3.5" /> AUTHORIZE
                                            </button>
                                            <button onClick={() => handleReject(app.id)} className="flex-1 py-2 hud-panel-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono font-bold uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2 h-9">
                                                <X className="w-3.5 h-3.5" /> REJECT
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Inquiries Tab ── */}
                    {activeTab === "inquiries" && (
                        <div className="space-y-4">
                            {inquiries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4 relative z-10" />
                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10">NO COMMS WAITING IN QUEUE.</p>
                                </div>
                            ) : inquiries.map((inquiry, i) => (
                                <div key={inquiry.id} className={cn("group p-5 transition-all relative flex flex-col scanlines", i % 2 === 0 ? 'hud-panel' : 'hud-corners', inquiry.status === "pending" ? "bg-warning/5 border border-warning/30" : "bg-card/60 border border-border/40")}>
                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                        <h3 className="font-bold text-base leading-tight pr-4">{inquiry.question}</h3>
                                        <span className={cn("text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm whitespace-nowrap", inquiry.status === "pending" ? "bg-warning/20 border-warning text-warning animate-pulse" : inquiry.status === "answered" ? "bg-success/10 border-success/30 text-success" : "bg-primary/10 border-primary/30 text-primary")}>
                                            {inquiry.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 relative z-10 bg-background/50 p-2 border border-border/40">
                                        <span className="text-foreground shrink-0">{inquiry.askedBy}</span>
                                        <div className="w-1 h-1 bg-border rotate-45" />
                                        <span className="shrink-0">{inquiry.category}</span>
                                        <div className="w-1 h-1 bg-border rotate-45 hidden sm:block" />
                                        <span className="shrink-0">{inquiry.date}</span>
                                    </div>

                                    {inquiry.reply && (
                                        <div className="bg-background border border-border/50 p-4 mb-4 relative z-10">
                                            <div className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <div className="w-1 h-1 bg-primary rotate-45" /> RESPONSE COMPILED BY: {inquiry.repliedBy}
                                            </div>
                                            <p className="text-sm font-mono text-muted-foreground leading-relaxed"><span className="text-primary/50 mr-2">&gt;</span>{inquiry.reply}</p>
                                        </div>
                                    )}

                                    <div className="relative z-10 mt-auto">
                                        {inquiry.status === "pending" && (
                                            replyingTo === inquiry.id ? (
                                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/40">
                                                    <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="INITIALIZE RESPONSE..." className="flex-1 px-4 py-2.5 hud-panel-sm bg-background border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleReply(inquiry.id)} className="flex-1 sm:flex-none px-6 py-2.5 hud-panel-sm bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border">TRANSMIT</button>
                                                        <button onClick={() => setReplyingTo(null)} className="flex-1 sm:flex-none px-6 py-2.5 hud-panel-sm border border-border/50 text-muted-foreground text-xs font-bold uppercase tracking-widest hover:text-foreground hover:bg-accent transition-colors">CANCEL</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => setReplyingTo(inquiry.id)} className="w-full py-2.5 hud-panel-sm border border-warning/50 text-warning text-xs font-bold font-mono uppercase tracking-widest hover:bg-warning/10 transition-colors mt-2">REPLY TO INQUIRY</button>
                                            )
                                        )}
                                        {inquiry.status === "answered" && inquiry.reply && (
                                            <button onClick={() => handlePublishFaq(inquiry.id, inquiry.question, inquiry.reply!)} className="w-full py-2.5 hud-panel-sm border border-success/50 text-success text-xs font-bold font-mono uppercase tracking-widest hover:bg-success/10 transition-colors mt-2">PUSH TO PUBLIC GLOBAL FAQ</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Pitches Tab ── */}
                    {activeTab === "pitches" && (
                        <div className="space-y-4">
                            {projects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                                    <FileText className="w-12 h-12 text-muted-foreground/30 mb-4 relative z-10" />
                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10">NO OUTSTANDING PROPOSALS.</p>
                                </div>
                            ) : projects.map((project, i) => (
                                <div key={project.id} className={cn("group p-5 transition-all relative flex flex-col scanlines", i % 2 === 0 ? 'hud-corners' : 'hud-panel', "bg-card/60 border border-border/40 hover:border-primary/40")}>
                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                        <h3 className="font-bold text-lg uppercase tracking-tight">{project.name}</h3>
                                        <span className={cn("text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm whitespace-nowrap", project.status === "ideation" ? "bg-warning/20 border-warning text-warning animate-pulse" : "bg-success/10 border-success/30 text-success")}>
                                            {project.status === "ideation" ? "PRE-AWAITING CLEARANCE" : project.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-mono text-muted-foreground leading-relaxed mb-4 relative z-10"><span className="text-primary/50 mr-2">&gt;</span>{project.description}</p>
                                    <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10 bg-background/50 p-2.5 border border-border/40">
                                        <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-primary/70" /> {project.teamMembers.length} UNITS</span>
                                        <div className="w-px h-3 bg-border" />
                                        <span>LAST SYNC: {project.updatedAt}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Resources Tab ── */}
                    {activeTab === "resources" && (
                        <div className="space-y-4">
                            {resources.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-4 relative z-10" />
                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10">NO DATA LOGS REQUIRE REVIEW.</p>
                                </div>
                            ) : resources.map((resource, i) => (
                                <div key={resource.id} className={cn("group p-5 transition-all relative flex flex-col scanlines", i % 2 === 0 ? 'hud-panel' : 'hud-corners', "bg-card/60 border border-border/40 hover:border-primary/40")}>
                                    <div className="flex items-start justify-between mb-3 relative z-10">
                                        <h3 className="font-bold text-base uppercase tracking-tight pr-4">{resource.title}</h3>
                                        <span className={cn("text-[9px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm whitespace-nowrap", resource.approved ? "bg-success/10 border-success/30 text-success" : "bg-warning/20 border-warning text-warning animate-pulse")}>
                                            {resource.approved ? "VERIFIED" : "AWAITING CLEARANCE"}
                                        </span>
                                    </div>
                                    <p className="text-xs font-mono text-muted-foreground leading-relaxed mb-4 line-clamp-2 relative z-10"><span className="text-primary/50 mr-2">&gt;</span>{resource.description}</p>

                                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 relative z-10 bg-background/50 p-2 border border-border/40">
                                        <span className="text-foreground shrink-0">SOURCE: {resource.uploadedBy}</span>
                                        <div className="w-1 h-1 bg-border rotate-45 hidden sm:block" />
                                        <span className="shrink-0">SYNC: {resource.date}</span>
                                        <div className="w-1 h-1 bg-border rotate-45 hidden sm:block" />
                                        <span className="shrink-0 border border-border/50 px-1.5 bg-card">TYPE: {resource.type}</span>
                                    </div>

                                    {!resource.approved && (
                                        <div className="flex gap-3 relative z-10 mt-2">
                                            <button onClick={() => approveResource(resource.id)} className="flex-1 py-2.5 hud-panel-sm bg-success/10 border border-success/30 text-success text-xs font-mono font-bold uppercase tracking-widest hover:bg-success hover:text-success-foreground transition-all flex items-center justify-center gap-2">
                                                <ThumbsUp className="w-3.5 h-3.5" /> AUTHORIZE
                                            </button>
                                            <button onClick={() => rejectResource(resource.id)} className="flex-1 py-2.5 hud-panel-sm bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono font-bold uppercase tracking-widest hover:bg-destructive hover:text-destructive-foreground transition-all flex items-center justify-center gap-2">
                                                <ThumbsDown className="w-3.5 h-3.5" /> PURGE
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Members Tab ── */}
                    {activeTab === "profiles" && (
                        <div className="space-y-4">
                            {approvedMembers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                                    <Users className="w-12 h-12 text-muted-foreground/30 mb-4 relative z-10" />
                                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10">DB EMPTY.</p>
                                </div>
                            ) : approvedMembers.map((member, i) => (
                                <div key={member.id} className={cn("group p-4 transition-all relative flex flex-col sm:flex-row items-center gap-4 scanlines", i % 2 === 0 ? 'hud-panel-sm' : 'hud-corners', "bg-card/60 border border-border/40 hover:border-primary/40")}>
                                    <div className="w-12 h-12 hud-corners bg-background flex items-center justify-center font-black text-lg border border-border/50 text-muted-foreground shrink-0 relative z-10">
                                        {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0 text-center sm:text-left relative z-10 w-full">
                                        <p className="font-bold font-mono tracking-tight uppercase truncate">{member.name}</p>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                                            <span className="truncate">{member.email}</span>
                                            <div className="w-1 h-1 bg-border rotate-45 hidden sm:block" />
                                            <span className="text-primary/80">{getRoleLabel(member.role)}</span>
                                            <div className="w-1 h-1 bg-border rotate-45 hidden sm:block" />
                                            <span className="truncate">SPEC: {member.standoutSkill}</span>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto relative z-10 mt-3 sm:mt-0 space-y-1.5">
                                        <div className="text-[8px] font-mono font-bold text-muted-foreground uppercase tracking-widest text-center sm:text-left ml-1">ASSIGN CLEARANCE</div>
                                        <select
                                            value={member.role}
                                            onChange={async (e) => {
                                                const newRole = e.target.value;
                                                try {
                                                    await updateDoc(doc(db, "users", member.id), { role: newRole, updatedAt: serverTimestamp() });
                                                } catch (err) {
                                                    console.error("Role update error:", err);
                                                }
                                            }}
                                            className="w-full sm:w-40 text-[10px] font-mono font-bold uppercase tracking-widest px-3 py-2 hud-panel-sm bg-background/80 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-colors cursor-pointer appearance-none"
                                        >
                                            {ALL_ROLES.map((r) => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Event attendance (all occurrences) ── */}
                    {activeTab === "eventAttendance" && (
                        <div className="space-y-4">
                            <div className="hud-panel bg-card/60 border border-primary/40 p-6 scanlines relative">
                                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                                <h3 className="font-bold text-lg mb-2 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                                    <CalendarDays className="w-5 h-5" /> SESSION ATTENDANCE MATRIX
                                </h3>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 relative z-10">
                                    Upcoming first, then today (highlighted), then past sessions (newest past first). One row per calendar date; weekly series show as separate rows.
                                </p>
                                {attendanceTableItems.length === 0 ? (
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10 py-8 text-center">
                                        No events in database.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto custom-scroll relative z-10 -mx-2 px-2">
                                        <table className="w-full text-left border-collapse min-w-[640px]">
                                            <thead>
                                                <tr className="border-b border-border/50 text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                                    <th className="py-2 pr-3">Date</th>
                                                    <th className="py-2 pr-3">Time</th>
                                                    <th className="py-2 pr-3">Title</th>
                                                    <th className="py-2 pr-3">Type</th>
                                                    <th className="py-2 pr-3 text-right">Present</th>
                                                    <th className="py-2 pr-0 w-24 text-right">Roster</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {attendanceTableItems.map((item, itemIdx) => {
                                                    if (item.kind === "section") {
                                                        const isTodayHeading = item.label === "Today";
                                                        return (
                                                            <tr
                                                                key={`section-${item.label}-${item.sub ?? ""}-${itemIdx}`}
                                                                className="bg-transparent"
                                                            >
                                                                <td
                                                                    colSpan={6}
                                                                    className={cn(
                                                                        "py-3 pb-2 text-[9px] font-mono font-bold uppercase tracking-widest border-t border-border/35",
                                                                        itemIdx === 0 ? "pt-1 border-t-0" : "",
                                                                        isTodayHeading ? "text-primary" : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <span className="inline-flex items-center gap-2">
                                                                        {isTodayHeading && (
                                                                            <span
                                                                                className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))] shrink-0"
                                                                                aria-hidden
                                                                            />
                                                                        )}
                                                                        {item.label}
                                                                    </span>
                                                                    {item.sub ? (
                                                                        <span className="ml-2 font-normal normal-case text-muted-foreground tracking-tight">
                                                                            — {item.sub}
                                                                        </span>
                                                                    ) : null}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    const { row, isToday, isPast } = item;
                                                    const present = getAttendanceIdsForOccurrence(row, row.occurrenceDate);
                                                    const expanded = attendanceRowExpandKey === row.instanceKey;
                                                    return (
                                                        <Fragment key={row.instanceKey}>
                                                            <tr
                                                                className={cn(
                                                                    "border-b border-border/30 text-[10px] font-mono uppercase tracking-tight transition-colors",
                                                                    isToday &&
                                                                        "bg-primary/[0.14] border-l-[3px] border-l-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]",
                                                                    isPast && !isToday && "bg-background/[0.15] text-muted-foreground",
                                                                    !isToday &&
                                                                        !isPast &&
                                                                        "bg-background/30"
                                                                )}
                                                            >
                                                                <td
                                                                    className={cn(
                                                                        "py-2.5 pr-3 whitespace-nowrap",
                                                                        isToday ? "text-primary font-semibold" : "text-primary/90"
                                                                    )}
                                                                >
                                                                    {formatOccurrenceDisplay(
                                                                        /^\d{4}-\d{2}-\d{2}$/.test(row.occurrenceDate?.trim() ?? "")
                                                                            ? row.occurrenceDate
                                                                            : calendarYmdForOccurrence(row)
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                                                                    {row.time || "—"}
                                                                </td>
                                                                <td className="py-2.5 pr-3 max-w-[200px] truncate" title={row.title}>
                                                                    {row.title}
                                                                </td>
                                                                <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                                                                    {row.type.replace("_", " ")}
                                                                </td>
                                                                <td className="py-2.5 pr-3 text-right tabular-nums">{present.length}</td>
                                                                <td className="py-2.5 pl-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setAttendanceRowExpandKey((k) =>
                                                                                k === row.instanceKey ? null : row.instanceKey
                                                                            )
                                                                        }
                                                                        className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary hover:underline border border-primary/30 px-2 py-1 hud-panel-sm"
                                                                    >
                                                                        {expanded ? "Hide" : "Mark"}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {expanded && (
                                                                <tr
                                                                    className={cn(
                                                                        "border-b border-border/40",
                                                                        isToday ? "bg-primary/10" : "bg-background/20"
                                                                    )}
                                                                >
                                                                    <td colSpan={6} className="py-3 px-1">
                                                                        <div className="relative mb-3 max-w-md">
                                                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                                            <input
                                                                                type="text"
                                                                                value={attendanceTableSearch}
                                                                                onChange={(e) =>
                                                                                    setAttendanceTableSearch(e.target.value)
                                                                                }
                                                                                placeholder="Search non-alumni..."
                                                                                className="w-full pl-8 pr-3 py-2 hud-panel-sm bg-background/50 border border-border/50 focus:border-primary/50 text-xs font-mono focus:outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {attendanceTableFilteredMembers.length === 0 ? (
                                                                                <span className="text-[9px] font-mono text-muted-foreground uppercase">
                                                                                    {attendanceTableSearch.trim()
                                                                                        ? "No matches."
                                                                                        : "No non-alumni on roster."}
                                                                                </span>
                                                                            ) : (
                                                                                attendanceTableFilteredMembers.map((mem) => {
                                                                                    const isPresent = present.includes(mem.id);
                                                                                    return (
                                                                                        <button
                                                                                            key={mem.id}
                                                                                            type="button"
                                                                                            disabled={attendanceSaving}
                                                                                            onClick={() =>
                                                                                                toggleOccurrenceAttendance(
                                                                                                    row.id,
                                                                                                    row.occurrenceDate,
                                                                                                    mem.id
                                                                                                )
                                                                                            }
                                                                                            className={cn(
                                                                                                "px-2.5 py-1 hud-panel-sm text-[10px] font-mono transition-all border uppercase",
                                                                                                isPresent
                                                                                                    ? "bg-primary/10 text-primary border-primary"
                                                                                                    : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:border-border"
                                                                                            )}
                                                                                        >
                                                                                            {mem.name}
                                                                                        </button>
                                                                                    );
                                                                                })
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Skills Export Tab ── */}
                    {activeTab === "skillsExport" && (
                        <div className="space-y-6">
                            <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
                                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                                    <List className="w-5 h-5" /> BATCH EXPORT: SKILLS BY PERSONNEL
                                </h3>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6 relative z-10">
                                    Each skill lists all roster members who have it. Export as CSV (skill, name, role) or JSON (skill → array of names).
                                </p>
                                <div className="flex flex-wrap gap-3 relative z-10 mb-6">
                                    <button
                                        onClick={downloadSkillsCsv}
                                        disabled={skillsExportEntries.length === 0}
                                        className="hud-panel bg-primary text-primary-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> DOWNLOAD CSV
                                    </button>
                                    <button
                                        onClick={downloadSkillsJson}
                                        disabled={skillsExportEntries.length === 0}
                                        className="hud-panel bg-card border border-primary/50 text-primary px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest hover:bg-primary/10 transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> DOWNLOAD JSON
                                    </button>
                                </div>
                                {skillsExportEntries.length === 0 ? (
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10">No skills recorded on roster yet.</p>
                                ) : (
                                    <div className="space-y-4 relative z-10 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                                        {skillsExportEntries.map((entry) => (
                                            <div key={entry.skill} className="hud-panel-sm bg-background/50 border border-border/40 p-4">
                                                <div className="text-xs font-mono font-bold uppercase tracking-widest text-primary border-b border-primary/20 pb-2 mb-2 flex items-center justify-between">
                                                    <span>{entry.skill}</span>
                                                    <span className="text-[10px] text-muted-foreground font-normal">{entry.people.length} {entry.people.length === 1 ? "person" : "people"}</span>
                                                </div>
                                                <ul className="flex flex-wrap gap-2">
                                                    {entry.people.map((p) => (
                                                        <li key={p.id} className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2 py-1 hud-panel-sm border border-border/40 bg-card/60">
                                                            {p.name}
                                                            <span className="text-muted-foreground/70 ml-1">({getRoleLabel(p.role)})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
