"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEvents, useMembers, useOrgSettings, getAttendanceIdsForOccurrence, type EventRecurrence } from "@/hooks/useFirestore";
import { fiscalLabelFromOrgSettings } from "@/lib/org-fiscal";
import {
    CalendarDays,
    Clock,
    MapPin,
    Users,
    Plus,
    Star,
    Loader2,
    X,
    Hash,
    Globe,
    Sparkles,
    Search,
    ClipboardCheck,
    Pencil,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canEditEvents } from "@/lib/roles";
import { EventTimeSchedule, addMinutesToHHMM } from "@/components/event-time-schedule";
import {
    eventSeriesHasUpcoming,
    eventSeriesFullyPast,
    getListDisplayOccurrence,
    getNextOccurrenceRow,
    sortKeyUpcomingSeries,
    sortKeyPastSeries,
    sortKeyAllSeries,
} from "@/lib/recurring-events";

function formatOccurrenceDisplay(isoYmd: string): string {
    const d = new Date(isoYmd + "T12:00:00");
    if (isNaN(d.getTime())) return isoYmd;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type HousingHostPickerMember = { id: string; name: string };

function HousingHostsPicker({
    value,
    onChange,
    members,
    disabled,
}: {
    value: string[];
    onChange: (uids: string[]) => void;
    members: HousingHostPickerMember[];
    disabled?: boolean;
}) {
    const remove = (uid: string) => onChange(value.filter((x) => x !== uid));
    const add = (uid: string) => {
        if (!uid || value.includes(uid)) return;
        onChange([...value, uid]);
    };
    const available = members.filter((m) => !value.includes(m.id));
    return (
        <div className="space-y-2">
            {value.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                    {value.map((id) => {
                        const m = members.find((x) => x.id === id);
                        return (
                            <li
                                key={id}
                                className="flex items-center gap-1.5 rounded border border-border/50 bg-background/60 px-2 py-1 text-[10px] font-mono text-foreground"
                            >
                                <span className="max-w-[160px] truncate">{m?.name ?? id}</span>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => remove(id)}
                                    className="shrink-0 p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                    aria-label={`Remove ${m?.name ?? "host"}`}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">No hosts assigned</p>
            )}
            <select
                key={value.join(",")}
                value=""
                disabled={disabled || available.length === 0}
                onChange={(e) => {
                    const uid = e.target.value;
                    if (uid) add(uid);
                }}
                className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none disabled:opacity-50"
            >
                <option value="">{available.length === 0 ? "All eligible members are hosts" : "Add host…"}</option>
                {available.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </select>
        </div>
    );
}

const typeColors: Record<string, string> = {
    workshop: "bg-chart-1/10 border-chart-1/30 text-chart-1",
    meeting: "bg-primary/10 border-primary/30 text-primary",
    social: "bg-chart-3/10 border-chart-3/30 text-chart-3",
    hackathon: "bg-chart-5/10 border-chart-5/30 text-chart-5",
    presentation: "bg-chart-2/10 border-chart-2/30 text-chart-2",
    info_session: "bg-chart-4/10 border-chart-4/30 text-chart-4",
    networking: "bg-accent border-accent/30 text-accent-foreground",
};

const defaultEvent = {
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    type: "meeting",
    tags: "",
    maxAttendees: "",
    featured: false,
    virtualLink: "",
    isVirtual: false,
    isRecurring: false,
    recurrenceWeeks: 4,
    /** Housing host uids (set by admin / VP Events). */
    housingHostUids: [] as string[],
};

export default function EventsPage() {
    const { profile, user } = useAuth();
    const { data: events, loading, createEvent, updateEvent, deleteEvent, rsvp, cancelRsvp, setEventOccurrenceAttendance } = useEvents();
    const { data: orgSettings } = useOrgSettings(!!user?.uid);
    const clubFiscalLabel = fiscalLabelFromOrgSettings(
        orgSettings
            ? { fiscalTerm: orgSettings.fiscalTerm, fiscalYearTwoDigit: orgSettings.fiscalYearTwoDigit }
            : null
    );
    const { data: members, loading: membersLoading } = useMembers();
    const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
    const [typeFilter, setTypeFilter] = useState<string>("all");
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newEvent, setNewEvent] = useState(defaultEvent);
    /** `${eventId}:${occurrenceYmd}` so recurring series attendance is per session. */
    const [attendancePanelKey, setAttendancePanelKey] = useState<string | null>(null);
    const [attendanceSearch, setAttendanceSearch] = useState("");
    const [attendanceSaving, setAttendanceSaving] = useState(false);
    const [editingEvent, setEditingEvent] = useState<typeof events[0] | null>(null);
    const [editForm, setEditForm] = useState(defaultEvent);
    const [editStatus, setEditStatus] = useState<string>("upcoming");
    const [editSaving, setEditSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const userCanEditEvents = canEditEvents(profile?.role);

    const openEdit = (event: typeof events[0]) => {
        // Prefer stored startTime/endTime (HH:mm); fall back to parsing event.time for legacy events
        let startTime = (event as { startTime?: string }).startTime?.trim() || "";
        let endTime = (event as { endTime?: string }).endTime?.trim() || "";
        if (!startTime && event.time?.trim()) {
            const parts = event.time.split(/\s*[–\-—]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
            startTime = parts[0] || "";
            endTime = parts[1] || "";
            const to24 = (t: string) => {
                const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
                if (!match) return t;
                let h = parseInt(match[1], 10);
                const m = match[2];
                const ampm = (match[3] || "").toUpperCase();
                if (ampm === "PM" && h < 12) h += 12;
                if (ampm === "AM" && h === 12) h = 0;
                return `${String(h).padStart(2, "0")}:${m}`;
            };
            if (startTime && !/^\d{2}:/.test(startTime) && /^\d{1,2}:\d{2}$/.test(startTime)) startTime = startTime.replace(/^(\d):/, "0$1:");
            if (endTime && !/^\d{2}:/.test(endTime) && /^\d{1,2}:\d{2}$/.test(endTime)) endTime = endTime.replace(/^(\d):/, "0$1:");
            startTime = to24(startTime);
            endTime = endTime ? to24(endTime) : "";
        }
        if (startTime && !endTime) {
            endTime = addMinutesToHHMM(startTime, 60);
        }
        const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(event.date)
            ? event.date
            : event.date
                ? (() => {
                    const d = new Date(event.date);
                    if (!isNaN(d.getTime())) {
                        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
                        return `${y}-${m}-${day}`;
                    }
                    return "";
                })()
                : "";
        const isVirtual = event.location?.toLowerCase().startsWith("virtual:");
        const rec = event.recurrence;
        setEditForm({
            title: event.title,
            description: event.description,
            date: dateStr,
            startTime,
            endTime,
            location: isVirtual ? "" : (event.location || ""),
            type: event.type,
            tags: (event.tags || []).join(", "),
            maxAttendees: event.maxAttendees != null ? String(event.maxAttendees) : "",
            featured: event.featured,
            virtualLink: isVirtual ? (event.location || "").replace(/^virtual:\s*/i, "") : "",
            isVirtual: !!isVirtual,
            isRecurring: !!(rec && rec.interval === "weekly" && rec.count > 1),
            recurrenceWeeks: rec?.count ?? 4,
            housingHostUids: [...(event.housingHostUids ?? [])],
        });
        setEditStatus(event.status || "upcoming");
        setEditingEvent(events.find((e) => e.id === event.id) ?? event);
    };

    const nonAlumniMembers = useMemo(() => members.filter((m) => m.role !== "alumni"), [members]);
    const hostPickerMembers = useMemo(
        () =>
            [...members]
                .filter((m) => m.status !== "pending" && m.status !== "rejected")
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
        [members]
    );
    const attendanceFilteredMembers = useMemo(() => {
        if (!attendanceSearch.trim()) return nonAlumniMembers;
        const q = attendanceSearch.toLowerCase().trim();
        return nonAlumniMembers.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }, [nonAlumniMembers, attendanceSearch]);

    const filtered = useMemo(() => {
        let list = events.filter((e) => typeFilter === "all" || e.type === typeFilter);
        if (filter === "upcoming") {
            list = list.filter((e) => eventSeriesHasUpcoming(e));
        } else if (filter === "past") {
            list = list.filter((e) => eventSeriesFullyPast(e));
        }
        if (filter === "upcoming") {
            return [...list].sort((a, b) => {
                const ma = sortKeyUpcomingSeries(a);
                const mb = sortKeyUpcomingSeries(b);
                if (ma !== mb) return ma - mb;
                return a.title.localeCompare(b.title);
            });
        }
        if (filter === "past") {
            return [...list].sort((a, b) => {
                const ma = sortKeyPastSeries(a);
                const mb = sortKeyPastSeries(b);
                if (ma !== mb) return mb - ma;
                return a.title.localeCompare(b.title);
            });
        }
        return [...list].sort((a, b) => {
            const ma = sortKeyAllSeries(a);
            const mb = sortKeyAllSeries(b);
            if (ma !== mb) return ma - mb;
            return a.title.localeCompare(b.title);
        });
    }, [events, filter, typeFilter]);

    const featured = useMemo(() => events.find((e) => e.featured && eventSeriesHasUpcoming(e)) ?? null, [events]);

    const featuredNextOccurrence = useMemo(
        () => (featured ? getNextOccurrenceRow(featured) : null),
        [featured]
    );

    const handleCreate = async () => {
        if (!newEvent.title.trim() || !newEvent.date) return;
        setCreating(true);
        try {
            const startTime = newEvent.startTime?.trim() || "";
            const endTime = newEvent.endTime?.trim() || "";

            const locationStr = newEvent.isVirtual && newEvent.virtualLink
                ? `Virtual: ${newEvent.virtualLink}`
                : newEvent.location;

            const baseDate = new Date(newEvent.date);
            baseDate.setMinutes(baseDate.getMinutes() + baseDate.getTimezoneOffset());
            const year0 = baseDate.getFullYear();
            const month0 = String(baseDate.getMonth() + 1).padStart(2, "0");
            const day0 = String(baseDate.getDate()).padStart(2, "0");
            const formattedDate = `${year0}-${month0}-${day0}`;

            const recurrence: EventRecurrence | null =
                newEvent.isRecurring && newEvent.recurrenceWeeks >= 2
                    ? { interval: "weekly", count: newEvent.recurrenceWeeks }
                    : null;

                await createEvent({
                    title: newEvent.title,
                    description: newEvent.description,
                    date: formattedDate,
                time: startTime && endTime ? `${startTime} – ${endTime}` : startTime || "",
                startTime,
                endTime,
                    location: locationStr,
                    type: newEvent.type,
                    status: "upcoming",
                    maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : null,
                    tags: newEvent.tags.split(",").map((t) => t.trim()).filter(Boolean),
                    featured: newEvent.featured,
                    createdBy: profile?.uid || "",
                    housingHostUids: newEvent.housingHostUids,
                recurrence,
                });

            setNewEvent(defaultEvent);
            setShowCreate(false);
        } catch (err) {
            console.error("Create event error:", err);
        } finally {
            setCreating(false);
        }
    };

    const handleRsvp = async (eventId: string) => {
        if (!profile?.uid) return;
        const event = events.find((e) => e.id === eventId);
        if (!event) return;
        if (event.attendees.includes(profile.uid)) {
            await cancelRsvp(eventId, profile.uid);
        } else {
            await rsvp(eventId, profile.uid);
        }
    };

    const toggleAttendance = async (eventId: string, occurrenceYmd: string, userId: string) => {
        const event = events.find((e) => e.id === eventId);
        if (!event || attendanceSaving) return;
        const cur = getAttendanceIdsForOccurrence(event, occurrenceYmd);
        const next = cur.includes(userId) ? cur.filter((id) => id !== userId) : [...cur, userId];
        setAttendanceSaving(true);
        try {
            await setEventOccurrenceAttendance(eventId, occurrenceYmd, next);
        } finally {
            setAttendanceSaving(false);
        }
    };

    const update = (field: string, value: string | boolean | number) =>
        setNewEvent((prev) => ({ ...prev, [field]: value }));

    const updateEditForm = (field: string, value: string | boolean | number) =>
        setEditForm((prev) => ({ ...prev, [field]: value }));

    const handleEdit = async () => {
        if (!editingEvent || !editForm.title.trim() || !editForm.date) return;
        setEditSaving(true);
        try {
            const startTime = editForm.startTime?.trim() || "";
            const endTime = editForm.endTime?.trim() || "";
            const locationStr = editForm.isVirtual && editForm.virtualLink
                ? `Virtual: ${editForm.virtualLink}`
                : editForm.location;
            const recurrence: EventRecurrence | null =
                editForm.isRecurring && editForm.recurrenceWeeks >= 2
                    ? { interval: "weekly", count: editForm.recurrenceWeeks }
                    : null;

            await updateEvent(editingEvent.id, {
                title: editForm.title,
                description: editForm.description,
                date: editForm.date,
                time: startTime && endTime ? `${startTime} – ${endTime}` : startTime || "",
                startTime,
                endTime,
                location: locationStr,
                type: editForm.type,
                status: editStatus,
                maxAttendees: editForm.maxAttendees ? parseInt(editForm.maxAttendees) : null,
                tags: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
                featured: editForm.featured,
                recurrence,
                housingHostUids: editForm.housingHostUids,
            });
            setEditingEvent(null);
        } catch (err) {
            console.error("Edit event error:", err);
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        const series = events.find((e) => e.id === eventId);
        const msg =
            series?.recurrence && series.recurrence.count > 1
                ? "Delete this entire recurring series? All future occurrences will be removed. This cannot be undone."
                : "Delete this event? This cannot be undone.";
        if (!confirm(msg)) return;
        setDeletingId(eventId);
        try {
            await deleteEvent(eventId);
            setEditingEvent(null);
        } catch (err) {
            console.error("Delete event error:", err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in space-y-6 relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-border/50">
                <div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        EVENTS
                        <span className="text-muted-foreground">·</span>
                        <span className="text-primary tabular-nums font-bold">FISCAL {clubFiscalLabel}</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">
                        OPERATIONAL <span className="gradient-text-cyber">CALENDAR</span>
                    </h1>
                </div>
                {userCanEditEvents && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="hud-panel-sm bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border-strong flex items-center gap-2 group"
                    >
                        <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" /> CREATE EVENT
                    </button>
                )}
            </div>

            {/* Featured Event */}
            {featured && filter !== "past" && (
                <div className="hud-panel-alt bg-card/60 border border-primary/40 p-6 sm:p-8 relative scanlines animate-border-pulse group">
                    <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />

                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono font-bold uppercase tracking-widest glow-border">
                        <Star className="w-3 h-3 fill-primary animate-pulse" /> FEATURED EVENT
                    </div>

                    <div className="relative z-10 lg:w-3/4">
                        <span className={cn("inline-block text-[10px] font-mono font-bold px-3 py-1 mb-4 uppercase tracking-widest border border-border/50", typeColors[featured.type] || typeColors.meeting)}>
                            TYPE: {featured.type.replace("_", " ")}
                        </span>

                        <h2 className="text-2xl font-black mb-3 uppercase tracking-tight">{featured.title}</h2>
                        <p className="text-sm font-mono text-muted-foreground mb-6 leading-relaxed">
                            <span className="text-primary mr-2">&gt;</span>{featured.description}
                        </p>

                        <div className="flex flex-wrap gap-5 mb-8 border-l-2 border-primary/30 pl-4 py-1">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3 text-primary/70" /> T-MINUS D-DAY</span>
                                <span className="text-xs font-bold font-mono tracking-wide">
                                    {featuredNextOccurrence ? formatOccurrenceDisplay(featuredNextOccurrence.occurrenceDate) : formatOccurrenceDisplay(featured.date)}
                                </span>
                                {featured.recurrence && featured.recurrence.count > 1 && (
                                    <span className="text-[9px] font-mono text-primary/90 uppercase tracking-widest">Weekly</span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-3 h-3 text-warning/70" /> CHRONO SYNC</span>
                                <span className="text-xs font-bold font-mono tracking-wide">{featured.time}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3 text-chart-2/70" /> VECTORING</span>
                                <span className="text-xs font-bold font-mono tracking-wide">{featured.location}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3 h-3 text-chart-4/70" /> CAPACITY</span>
                                <span className="text-xs font-bold font-mono tracking-wide">
                                    {featured.attendees.length}{featured.maxAttendees && `/${featured.maxAttendees}`} UNITS
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleRsvp(featured.id)}
                            className={cn(
                                "hud-panel bg-primary text-primary-foreground px-8 py-3 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border shadow-[0_0_15px_rgba(203,247,2,0.3)]",
                                profile?.uid && featured.attendees.includes(profile.uid) && "bg-background text-primary border border-primary hover:bg-primary/10"
                            )}
                        >
                            {profile?.uid && featured.attendees.includes(profile.uid) ? "CANCEL RSVP" : "CONFIRM RSVP"}
                        </button>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-card/40 border border-border/50 p-1">
                    {(["all", "upcoming", "past"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-2 text-[10px] font-mono font-bold transition-all uppercase tracking-widest",
                                filter === f
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="h-6 w-px bg-border/50 mx-1 hidden sm:block" />
                <div className="flex gap-2 overflow-x-auto pb-1 custom-scroll">
                    {["all", "workshop", "meeting", "social", "hackathon", "presentation", "info_session", "networking"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={cn(
                                "px-3 py-1.5 hud-panel-sm text-[10px] font-mono font-bold transition-all uppercase tracking-widest border whitespace-nowrap",
                                typeFilter === t
                                    ? "bg-primary/10 border-primary/50 text-primary"
                                    : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            {t.replace("_", " ")}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-mono text-primary uppercase tracking-widest animate-pulse">QUERYING CALENDAR...</span>
                </div>
            )}

            {/* Event Cards */}
            {!loading && (
                <div className="flex-1 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((event, i) => {
                        const isAttending = profile?.uid ? event.attendees.includes(profile.uid) : false;
                        const isFull = event.maxAttendees ? event.attendees.length >= event.maxAttendees : false;
                        const displayOcc = getListDisplayOccurrence(event, filter);
                        const attendanceKey = `${event.id}:${displayOcc.occurrenceDate}`;
                        const showExpired = eventSeriesFullyPast(event);
                        const showRsvp = eventSeriesHasUpcoming(event);
                        return (
                            <div key={event.id} className={cn("group bg-card/60 border border-border/40 p-5 transition-all hover:border-primary/50 scanlines relative flex flex-col", i % 2 === 0 ? 'hud-panel' : 'hud-corners', showExpired && "opacity-60 saturate-50")}>
                                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                                    <span className={cn("text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 border hud-panel-sm", typeColors[event.type] || typeColors.meeting)}>
                                        {event.type.replace("_", " ")}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {showExpired && <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">EXPIRED</span>}
                                        {userCanEditEvents && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); openEdit(event); }}
                                                className="p-1.5 hud-panel-sm border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
                                                title="Edit event"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg mb-2 uppercase tracking-tight group-hover:text-primary transition-colors relative z-10 line-clamp-1">{event.title}</h3>
                                {event.recurrence && event.recurrence.count > 1 && (
                                    <p className="text-[9px] font-mono text-primary uppercase tracking-widest mb-2 relative z-10">Weekly</p>
                                )}
                                <p className="text-xs font-mono text-muted-foreground mb-5 line-clamp-2 leading-relaxed flex-1 relative z-10">{event.description}</p>

                                <div className="space-y-2.5 mb-5 relative z-10 bg-background/50 p-3 border border-border/40">
                                    <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                        <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-primary/70" />
                                        <span className="truncate">{formatOccurrenceDisplay(displayOcc.occurrenceDate)}</span>
                                    </div>
                                    {event.time && (
                                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-warning/70" />
                                            <span className="truncate">{event.time}</span>
                                        </div>
                                    )}
                                    {event.location && (
                                        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-chart-2/70" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                        <Users className="w-3.5 h-3.5 border border-border/50 p-0.5" />
                                        {event.attendees.length}{event.maxAttendees && `/${event.maxAttendees}`}
                                        {isFull && <span className="text-destructive font-bold ml-1 animate-pulse">CAPACITY</span>}
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap justify-end">
                                        {event.tags.slice(0, 2).map((tag) => (
                                            <span key={tag} className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border border-border/50 bg-background">{tag}</span>
                                        ))}
                                    </div>
                                </div>

                                {showRsvp && (
                                    <button
                                        onClick={() => handleRsvp(event.id)}
                                        disabled={isFull && !isAttending}
                                        className={cn(
                                            "w-full py-2.5 hud-panel-sm text-xs font-mono font-bold uppercase tracking-widest transition-all glow-border relative z-10 border",
                                            isAttending
                                                ? "bg-background border-primary/50 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
                                                : isFull
                                                    ? "bg-muted border-muted-foreground/30 text-muted-foreground cursor-not-allowed"
                                                    : "bg-primary border-primary text-primary-foreground hover:brightness-110"
                                        )}
                                    >
                                        {isAttending ? "CANCEL RSVP" : isFull ? "FULL" : "RSVP"}
                                    </button>
                                )}

                                {/* Admin / Events role: take non-alumni attendance */}
                                {userCanEditEvents && (
                                    <div className="mt-4 pt-4 border-t border-border/40 relative z-10">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAttendancePanelKey((prev) => (prev === attendanceKey ? null : attendanceKey));
                                                setAttendanceSearch("");
                                            }}
                                            className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <ClipboardCheck className="w-3.5 h-3.5" />
                                            ATTENDANCE ({getAttendanceIdsForOccurrence(event, displayOcc.occurrenceDate).length})
                                            {attendancePanelKey === attendanceKey ? " ▼" : " ▶"}
                                        </button>
                                        {attendancePanelKey === attendanceKey && (
                                            <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                    <input
                                                        type="text"
                                                        value={attendanceSearch}
                                                        onChange={(e) => setAttendanceSearch(e.target.value)}
                                                        placeholder="Search non-alumni..."
                                                        className="w-full pl-8 pr-3 py-2 hud-panel-sm bg-background/50 border border-border/50 focus:border-primary/50 text-xs font-mono focus:outline-none"
                                                    />
                                                </div>
                                                <div className="max-h-[24vh] overflow-y-auto pr-1 custom-scroll">
                                                    {membersLoading ? (
                                                        <div className="flex items-center justify-center py-4 gap-2">
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                                            <span className="text-[9px] font-mono uppercase">Loading...</span>
                                                        </div>
                                                    ) : attendanceFilteredMembers.length === 0 ? (
                                                        <p className="text-[9px] font-mono text-muted-foreground uppercase py-2 text-center">
                                                            {attendanceSearch.trim() ? "No matches." : "No non-alumni members."}
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {attendanceFilteredMembers.map((mem) => {
                                                                const present = getAttendanceIdsForOccurrence(event, displayOcc.occurrenceDate).includes(mem.id);
                                                                return (
                                                                    <button
                                                                        key={mem.id}
                                                                        type="button"
                                                                        onClick={() => toggleAttendance(event.id, displayOcc.occurrenceDate, mem.id)}
                                                                        disabled={attendanceSaving}
                                                                        className={cn(
                                                                            "px-2.5 py-1 hud-panel-sm text-[10px] font-mono transition-all border",
                                                                            present
                                                                                ? "bg-primary/10 text-primary border-primary"
                                                                                : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:border-border"
                                                                        )}
                                                                    >
                                                                        {mem.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && filtered.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 hud-panel bg-card/40 border border-border/40 scanlines">
                    <CalendarDays className="w-16 h-16 text-muted-foreground/30 mb-4 relative z-10" />
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest relative z-10">
                        {userCanEditEvents ? "NO EVENTS FOUND. CREATE ONE TO GET STARTED." : "NO EVENTS CURRENTLY SCHEDULED."}
                    </p>
                </div>
            )}

            {/* ── Create Event Modal ── */}
            {showCreate && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
                    <div className="hud-panel bg-card border border-primary/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto scanlines noise relative glow-border animate-fade-in custom-scroll" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20" />

                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur-md z-30">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-mono text-primary uppercase tracking-widest">ADMIN / EVENTS</span>
                                </div>
                                <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
                                    <CalendarDays className="w-5 h-5 text-primary" /> NEW EVENT DETAILS
                                </h3>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-2 hud-panel-sm border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors bg-background/50"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="p-6 space-y-5 relative z-10">
                            <div className="p-4 hud-corners bg-background/40 border border-border/50 space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">EVENT TITLE <span className="text-primary">*</span></label>
                                    <input type="text" value={newEvent.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. ALL HANDS MEETING" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">MISSION BRIEF / DESC</label>
                                    <textarea rows={3} value={newEvent.description} onChange={(e) => update("description", e.target.value)} placeholder="Enter operational details..." className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                                        <CalendarDays className="w-3.5 h-3.5" /> DEPLOYMENT DATE <span className="text-primary">*</span>
                                    </label>
                                    <input type="date" value={newEvent.date} onChange={(e) => update("date", e.target.value)} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none uppercase" />
                                </div>
                            </div>

                            <EventTimeSchedule
                                label="Schedule"
                                startTime={newEvent.startTime}
                                endTime={newEvent.endTime}
                                onChange={({ startTime, endTime }) =>
                                    setNewEvent((prev) => ({ ...prev, startTime, endTime }))
                                }
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Event Type & Max Attendees */}
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">CLASSIFICATION</label>
                                    <select value={newEvent.type} onChange={(e) => update("type", e.target.value)} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none">
                                        <option value="meeting">MEETING</option>
                                        <option value="workshop">WORKSHOP</option>
                                        <option value="social">SOCIAL</option>
                                        <option value="hackathon">HACKATHON</option>
                                        <option value="presentation">PRESENTATION</option>
                                        <option value="info_session">INFO SESSION</option>
                                        <option value="networking">NETWORKING</option>
                                    </select>
                                </div>
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> MAX CAPACITY</label>
                                    <input type="number" min="1" value={newEvent.maxAttendees} onChange={(e) => update("maxAttendees", e.target.value)} placeholder="N/A (UNLIMITED)" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                </div>
                            </div>

                            {userCanEditEvents && (
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> EVENT HOSTS (HOUSING)
                                    </label>
                                    <HousingHostsPicker
                                        value={newEvent.housingHostUids}
                                        onChange={(uids) => setNewEvent((p) => ({ ...p, housingHostUids: uids }))}
                                        members={hostPickerMembers}
                                        disabled={membersLoading}
                                    />
                                    <p className="text-[9px] font-mono text-muted-foreground mt-2 leading-relaxed">
                                        Each listed host gets +4 for this event; −3 on a saved roll if that host is absent.
                                    </p>
                                </div>
                            )}

                            {/* Location / Virtual Toggle */}
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> VECTOR / LOC</label>
                                    <button
                                        type="button"
                                        onClick={() => update("isVirtual", !newEvent.isVirtual)}
                                        className={cn("flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 hud-panel-sm uppercase tracking-widest transition-all border", newEvent.isVirtual ? "bg-primary/10 border-primary/50 text-primary" : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground")}
                                    >
                                        <Globe className="w-3 h-3" /> {newEvent.isVirtual ? "REMOTE UPLINK" : "PHYSICAL"}
                                    </button>
                                </div>
                                {newEvent.isVirtual ? (
                                    <input type="url" value={newEvent.virtualLink} onChange={(e) => update("virtualLink", e.target.value)} placeholder="https://zoom.us/..." className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                ) : (
                                    <input type="text" value={newEvent.location} onChange={(e) => update("location", e.target.value)} placeholder="e.g. OLIN 102" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="p-4 hud-corners bg-background/40 border border-border/50">
                            <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Hash className="w-3.5 h-3.5" /> TAGS <span className="opacity-50">(CSV)</span>
                            </label>
                            <input type="text" value={newEvent.tags} onChange={(e) => update("tags", e.target.value)} placeholder="e.g. REACT, FRONTEND" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                            {newEvent.tags && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {newEvent.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                                        <span key={tag} className="text-[9px] font-mono px-2 py-0.5 border border-primary/30 bg-primary/10 text-primary uppercase">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recurrence & Featured Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Recurring Toggle */}
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest">RECURRING EVENT</p>
                                            <p className="text-[9px] font-mono text-muted-foreground uppercase">One record — repeats weekly.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => update("isRecurring", !newEvent.isRecurring)}
                                        className={cn("w-10 h-5 border transition-all relative hud-panel-sm", newEvent.isRecurring ? "bg-primary/20 border-primary" : "bg-background/50 border-border/50")}
                                    >
                                        <span className={cn("absolute top-[1px] w-4 h-4 bg-primary transition-all", newEvent.isRecurring ? "left-[18px] glow-border shadow-[0_0_8px_rgba(203,247,2,1)]" : "left-0.5 bg-muted-foreground")} />
                                    </button>
                                </div>

                                <div className={cn("transition-all duration-300 overflow-hidden", newEvent.isRecurring ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0")}>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                        <span>RECURRENCE RANGE (WEEKS)</span>
                                        <span className="text-primary">{newEvent.recurrenceWeeks} WKS</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="16"
                                        value={newEvent.recurrenceWeeks}
                                        onChange={(e) => update("recurrenceWeeks", parseInt(e.target.value))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            </div>

                            {/* Featured Toggle */}
                            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-4 hud-panel-sm relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(203,247,2,0.2) 0%, transparent 70%)' }} />
                                <div className="flex items-center gap-3 relative z-10 w-full justify-between">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                                        <div>
                                            <p className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest leading-tight">FEATURED EVENT</p>
                                            <p className="text-[9px] font-mono text-muted-foreground uppercase leading-tight mt-0.5 whitespace-nowrap">Pin to global dashboard feed.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => update("featured", !newEvent.featured)}
                                        className={cn("w-10 h-5 border transition-all relative hud-panel-sm shrink-0", newEvent.featured ? "bg-primary/20 border-primary" : "bg-background/50 border-border/50")}
                                    >
                                        <span className={cn("absolute top-[1px] w-4 h-4 bg-primary transition-all", newEvent.featured ? "left-[18px] glow-border shadow-[0_0_8px_rgba(203,247,2,1)]" : "left-0.5 bg-muted-foreground")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 pt-2 flex gap-3 relative z-10">
                            <button onClick={() => setShowCreate(false)} className="flex-[1] py-3 hud-panel-sm border border-border/50 text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest hover:bg-accent hover:text-foreground transition-all">CANCEL</button>
                            <button
                                onClick={handleCreate}
                                disabled={creating || !newEvent.title.trim() || !newEvent.date}
                                className="flex-[2] py-3 hud-panel bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {creating ? "INITIALIZING..." : "EXECUTE DEPLOYMENT"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Event Modal ── */}
            {editingEvent && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingEvent(null)}>
                    <div className="hud-panel bg-card border border-primary/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto scanlines noise relative glow-border animate-fade-in custom-scroll" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20" />
                        <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50 sticky top-0 bg-card/95 backdrop-blur-md z-30">
                            <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-primary" /> EDIT EVENT
                            </h3>
                            <button onClick={() => setEditingEvent(null)} className="p-2 hud-panel-sm border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors bg-background/50"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-5 relative z-10">
                            <div className="p-4 hud-corners bg-background/40 border border-border/50 space-y-4">
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">EVENT TITLE <span className="text-primary">*</span></label>
                                    <input type="text" value={editForm.title} onChange={(e) => updateEditForm("title", e.target.value)} placeholder="e.g. ALL HANDS MEETING" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">DESCRIPTION</label>
                                    <textarea rows={3} value={editForm.description} onChange={(e) => updateEditForm("description", e.target.value)} placeholder="Enter details..." className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                </div>
                            </div>
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">DATE <span className="text-primary">*</span></label>
                                <input type="date" value={editForm.date} onChange={(e) => updateEditForm("date", e.target.value)} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none" />
                            </div>
                            <EventTimeSchedule
                                label="Schedule"
                                startTime={editForm.startTime}
                                endTime={editForm.endTime}
                                onChange={({ startTime, endTime }) =>
                                    setEditForm((prev) => ({ ...prev, startTime, endTime }))
                                }
                            />
                            <div className="flex items-center gap-2 px-3 py-2 hud-panel-sm bg-background/40 border border-border/40 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                <Clock className="w-4 h-4 text-primary shrink-0" />
                                <span>Previously saved:</span>
                                <span className="text-foreground font-bold normal-case tracking-normal">{editingEvent.time || "—"}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">TYPE</label>
                                    <select value={editForm.type} onChange={(e) => updateEditForm("type", e.target.value)} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none">
                                        <option value="meeting">MEETING</option>
                                        <option value="workshop">WORKSHOP</option>
                                        <option value="social">SOCIAL</option>
                                        <option value="hackathon">HACKATHON</option>
                                        <option value="presentation">PRESENTATION</option>
                                        <option value="info_session">INFO SESSION</option>
                                        <option value="networking">NETWORKING</option>
                                    </select>
                                </div>
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">STATUS</label>
                                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none">
                                        <option value="upcoming">UPCOMING</option>
                                        <option value="ongoing">ONGOING</option>
                                        <option value="past">PAST</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">MAX CAPACITY</label>
                                <input type="number" min="1" value={editForm.maxAttendees} onChange={(e) => updateEditForm("maxAttendees", e.target.value)} placeholder="Unlimited" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none" />
                            </div>
                            {userCanEditEvents && (
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> EVENT HOSTS (HOUSING)
                                    </label>
                                    <HousingHostsPicker
                                        value={editForm.housingHostUids}
                                        onChange={(uids) => setEditForm((p) => ({ ...p, housingHostUids: uids }))}
                                        members={hostPickerMembers}
                                        disabled={membersLoading}
                                    />
                                    <p className="text-[9px] font-mono text-muted-foreground mt-2 leading-relaxed">
                                        +4 per listed host; −3 on a saved roll if that host is absent.
                                    </p>
                                </div>
                            )}
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">LOCATION</label>
                                    <button type="button" onClick={() => updateEditForm("isVirtual", !editForm.isVirtual)} className={cn("flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 hud-panel-sm uppercase tracking-widest border", editForm.isVirtual ? "bg-primary/10 border-primary/50 text-primary" : "bg-card/40 border-border/40 text-muted-foreground")}>
                                        <Globe className="w-3 h-3" /> {editForm.isVirtual ? "VIRTUAL" : "PHYSICAL"}
                                    </button>
                                </div>
                                {editForm.isVirtual ? (
                                    <input type="url" value={editForm.virtualLink} onChange={(e) => updateEditForm("virtualLink", e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none" />
                                ) : (
                                    <input type="text" value={editForm.location} onChange={(e) => updateEditForm("location", e.target.value)} placeholder="e.g. OLIN 102" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none" />
                                )}
                            </div>
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                                    <div className="flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest">RECURRING EVENT</p>
                                            <p className="text-[9px] font-mono text-muted-foreground uppercase">One record — repeats weekly.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => updateEditForm("isRecurring", !editForm.isRecurring)}
                                        className={cn("w-10 h-5 border transition-all relative hud-panel-sm", editForm.isRecurring ? "bg-primary/20 border-primary" : "bg-background/50 border-border/50")}
                                    >
                                        <span className={cn("absolute top-[1px] w-4 h-4 bg-primary transition-all", editForm.isRecurring ? "left-[18px] glow-border shadow-[0_0_8px_rgba(203,247,2,1)]" : "left-0.5 bg-muted-foreground")} />
                                    </button>
                                </div>
                                <div className={cn("transition-all duration-300 overflow-hidden", editForm.isRecurring ? "max-h-20 opacity-100 mt-2" : "max-h-0 opacity-0")}>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                        <span>SESSIONS (WEEKS)</span>
                                        <span className="text-primary">{editForm.recurrenceWeeks}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="16"
                                        value={editForm.recurrenceWeeks}
                                        onChange={(e) => updateEditForm("recurrenceWeeks", parseInt(e.target.value, 10))}
                                        className="w-full accent-primary"
                                    />
                                </div>
                            </div>
                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">TAGS (CSV)</label>
                                <input type="text" value={editForm.tags} onChange={(e) => updateEditForm("tags", e.target.value)} placeholder="e.g. REACT, FRONTEND" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none" />
                            </div>
                            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-4 hud-panel-sm">
                                <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest">FEATURED EVENT</span>
                                <button type="button" onClick={() => updateEditForm("featured", !editForm.featured)} className={cn("w-10 h-5 border transition-all relative hud-panel-sm", editForm.featured ? "bg-primary/20 border-primary" : "bg-background/50 border-border/50")}>
                                    <span className={cn("absolute top-[1px] w-4 h-4 bg-primary transition-all", editForm.featured ? "left-[18px]" : "left-0.5 bg-muted-foreground")} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 pt-2 flex flex-wrap gap-3 relative z-10 items-center justify-between">
                            <button
                                type="button"
                                onClick={() => editingEvent && handleDeleteEvent(editingEvent.id)}
                                disabled={editSaving || deletingId === editingEvent?.id}
                                className="flex items-center gap-2 py-3 px-4 hud-panel-sm border border-destructive/50 text-destructive text-xs font-mono font-bold uppercase tracking-widest hover:bg-destructive/10 transition-all disabled:opacity-50"
                            >
                                {deletingId === editingEvent?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {deletingId === editingEvent?.id ? "DELETING..." : "DELETE EVENT"}
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setEditingEvent(null)} className="py-3 px-5 hud-panel-sm border border-border/50 text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest hover:bg-accent hover:text-foreground transition-all">CANCEL</button>
                                <button onClick={handleEdit} disabled={editSaving || !editForm.title.trim() || !editForm.date} className="py-3 px-5 hud-panel bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2">
                                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {editSaving ? "SAVING..." : "SAVE CHANGES"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
