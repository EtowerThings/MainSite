"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
    useMembers,
    useEboardTasks,
    useEboardCalendarEvents,
    type EboardTaskItem,
    type EboardCalendarEventItem,
    type EboardTaskPriority,
    type EboardTaskStatus,
} from "@/hooks/useFirestore";
import { canAccessEboardWorkspace } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
    CalendarRange,
    ChevronLeft,
    ChevronRight,
    CheckSquare,
    Loader2,
    Plus,
    Trash2,
    MapPin,
    Users,
    Clock,
    Flag,
    Filter,
} from "lucide-react";
import { serverTimestamp } from "firebase/firestore";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function toYmd(d: Date): string {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseYmd(ymd: string): Date {
    const [y, m, day] = ymd.split("-").map((x) => parseInt(x, 10));
    return new Date(y, m - 1, day);
}

/** Monday-based month grid: 6 rows × 7 cols; each cell { ymd, inMonth, date }. */
function buildMonthGrid(year: number, monthIndex: number): { ymd: string; inMonth: boolean; date: Date }[] {
    const first = new Date(year, monthIndex, 1);
    const startDay = first.getDay(); // 0 Sun
    const mondayOffset = startDay === 0 ? 6 : startDay - 1;
    const gridStart = new Date(year, monthIndex, 1 - mondayOffset);
    const cells: { ymd: string; inMonth: boolean; date: Date }[] = [];
    for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        cells.push({
            ymd: toYmd(d),
            inMonth: d.getMonth() === monthIndex,
            date: d,
        });
    }
    return cells;
}

function priorityLabel(p: EboardTaskPriority): string {
    switch (p) {
        case "urgent":
            return "Urgent";
        case "high":
            return "High";
        case "low":
            return "Low";
        default:
            return "Normal";
    }
}

function priorityClass(p: EboardTaskPriority): string {
    switch (p) {
        case "urgent":
            return "bg-destructive/15 text-destructive border-destructive/40";
        case "high":
            return "bg-chart-4/15 text-chart-4 border-chart-4/40";
        case "low":
            return "bg-muted/40 text-muted-foreground border-border/50";
        default:
            return "bg-primary/10 text-primary border-primary/30";
    }
}

type TaskFilter = "all" | "mine" | "todo" | "in_progress" | "done";

export default function EboardPage() {
    const router = useRouter();
    const { user, profile, loading: authLoading } = useAuth();
    const canAccess = canAccessEboardWorkspace(profile?.role);

    const { data: members } = useMembers(!!user?.uid);
    const {
        data: tasks,
        loading: tasksLoading,
        createTask,
        updateTask,
        deleteTask,
    } = useEboardTasks(!!user?.uid);
    const {
        data: calEvents,
        loading: calLoading,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
    } = useEboardCalendarEvents(!!user?.uid && canAccess);

    const [tab, setTab] = useState<"calendar" | "tasks">("calendar");
    const [monthCursor, setMonthCursor] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const [selectedYmd, setSelectedYmd] = useState<string | null>(() => toYmd(new Date()));
    const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");

    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskDue, setTaskDue] = useState("");
    const [taskPriority, setTaskPriority] = useState<EboardTaskPriority>("normal");
    const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
    const [taskSaving, setTaskSaving] = useState(false);

    const [showEventForm, setShowEventForm] = useState(false);
    const [evTitle, setEvTitle] = useState("");
    const [evDesc, setEvDesc] = useState("");
    const [evStart, setEvStart] = useState("");
    const [evEnd, setEvEnd] = useState("");
    const [evAllDay, setEvAllDay] = useState(true);
    const [evStartTime, setEvStartTime] = useState("09:00");
    const [evEndTime, setEvEndTime] = useState("10:00");
    const [evLocation, setEvLocation] = useState("");
    const [evAttendees, setEvAttendees] = useState<string[]>([]);
    const [evSaving, setEvSaving] = useState(false);

    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!canAccess && tab === "calendar") setTab("tasks");
    }, [canAccess, tab]);

    useEffect(() => {
        if (!canAccess) setTaskFilter("mine");
    }, [canAccess]);

    const assignableMembers = useMemo(
        () =>
            members
                .filter((m) => m.status !== "pending" && m.status !== "rejected" && m.status !== "removed")
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
        [members]
    );

    const year = monthCursor.getFullYear();
    const monthIndex = monthCursor.getMonth();
    const grid = useMemo(() => buildMonthGrid(year, monthIndex), [year, monthIndex]);

    const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const tasksByDue = useMemo(() => {
        const m = new Map<string, EboardTaskItem[]>();
        for (const t of tasks) {
            if (!t.dueDate) continue;
            if (!m.has(t.dueDate)) m.set(t.dueDate, []);
            m.get(t.dueDate)!.push(t);
        }
        return m;
    }, [tasks]);

    const eventsByStart = useMemo(() => {
        const m = new Map<string, EboardCalendarEventItem[]>();
        for (const e of calEvents) {
            if (!e.startDate) continue;
            if (!m.has(e.startDate)) m.set(e.startDate, []);
            m.get(e.startDate)!.push(e);
            if (e.endDate && e.endDate !== e.startDate) {
                const a = parseYmd(e.startDate);
                const b = parseYmd(e.endDate);
                for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
                    const ymd = toYmd(d);
                    if (ymd === e.startDate) continue;
                    if (!m.has(ymd)) m.set(ymd, []);
                    if (!m.get(ymd)!.some((x) => x.id === e.id)) m.get(ymd)!.push(e);
                }
            }
        }
        return m;
    }, [calEvents]);

    const filteredTasks = useMemo(() => {
        let list = tasks.slice();
        const uid = profile?.uid;
        if (taskFilter === "mine" && uid) list = list.filter((t) => t.assigneeUids.includes(uid));
        if (taskFilter === "todo") list = list.filter((t) => t.status === "todo");
        if (taskFilter === "in_progress") list = list.filter((t) => t.status === "in_progress");
        if (taskFilter === "done") list = list.filter((t) => t.status === "done");
        list.sort((a, b) => {
            const da = a.dueDate || "9999-12-31";
            const db = b.dueDate || "9999-12-31";
            if (da !== db) return da.localeCompare(db);
            return a.title.localeCompare(b.title);
        });
        return list;
    }, [tasks, taskFilter, profile?.uid]);

    const nameByUid = useCallback(
        (uid: string) => assignableMembers.find((m) => m.id === uid)?.name ?? uid.slice(0, 6),
        [assignableMembers]
    );

    const prevMonth = () => setMonthCursor(new Date(year, monthIndex - 1, 1));
    const nextMonth = () => setMonthCursor(new Date(year, monthIndex + 1, 1));

    const selectedDayTasks = selectedYmd ? tasksByDue.get(selectedYmd) ?? [] : [];
    const selectedDayEvents = selectedYmd ? eventsByStart.get(selectedYmd) ?? [] : [];

    const resetEventForm = () => {
        setEvTitle("");
        setEvDesc("");
        setEvStart(selectedYmd ?? toYmd(new Date()));
        setEvEnd("");
        setEvAllDay(true);
        setEvStartTime("09:00");
        setEvEndTime("10:00");
        setEvLocation("");
        setEvAttendees([]);
        setEditingEventId(null);
    };

    const openNewEventForDay = (ymd: string) => {
        setSelectedYmd(ymd);
        setShowEventForm(true);
        setEvTitle("");
        setEvDesc("");
        setEvStart(ymd);
        setEvEnd("");
        setEvAllDay(true);
        setEditingEventId(null);
    };

    const handleSaveTask = async () => {
        if (!user?.uid || !taskTitle.trim()) return;
        setTaskSaving(true);
        try {
            await createTask({
                title: taskTitle,
                description: taskDesc,
                assigneeUids: taskAssignees,
                dueDate: taskDue && /^\d{4}-\d{2}-\d{2}$/.test(taskDue) ? taskDue : null,
                priority: taskPriority,
                createdBy: user.uid,
            });
            setTaskTitle("");
            setTaskDesc("");
            setTaskDue("");
            setTaskPriority("normal");
            setTaskAssignees([]);
            setShowTaskForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setTaskSaving(false);
        }
    };

    const handleSaveCalendarEvent = async () => {
        if (!user?.uid || !evTitle.trim() || !evStart || !/^\d{4}-\d{2}-\d{2}$/.test(evStart)) return;
        setEvSaving(true);
        try {
            if (editingEventId) {
                await updateCalendarEvent(editingEventId, {
                    title: evTitle,
                    description: evDesc,
                    startDate: evStart,
                    endDate: evEnd && /^\d{4}-\d{2}-\d{2}$/.test(evEnd) ? evEnd : null,
                    startTime: evStartTime,
                    endTime: evEndTime,
                    allDay: evAllDay,
                    location: evLocation.trim() || null,
                    attendeeUids: evAttendees,
                });
            } else {
                await createCalendarEvent({
                    title: evTitle,
                    description: evDesc,
                    startDate: evStart,
                    endDate: evEnd && /^\d{4}-\d{2}-\d{2}$/.test(evEnd) ? evEnd : null,
                    startTime: evStartTime,
                    endTime: evEndTime,
                    allDay: evAllDay,
                    location: evLocation.trim() || null,
                    attendeeUids: evAttendees,
                    createdBy: user.uid,
                });
            }
            resetEventForm();
            setShowEventForm(false);
        } catch (e) {
            console.error(e);
        } finally {
            setEvSaving(false);
        }
    };

    const startEditEvent = (ev: EboardCalendarEventItem) => {
        setEditingEventId(ev.id);
        setEvTitle(ev.title);
        setEvDesc(ev.description);
        setEvStart(ev.startDate);
        setEvEnd(ev.endDate ?? "");
        setEvAllDay(ev.allDay);
        setEvStartTime(ev.startTime || "09:00");
        setEvEndTime(ev.endTime || "10:00");
        setEvLocation(ev.location ?? "");
        setEvAttendees(ev.attendeeUids ?? []);
        setShowEventForm(true);
    };

    const toggleAssignee = (uid: string, list: string[], setList: (v: string[]) => void) => {
        if (list.includes(uid)) setList(list.filter((x) => x !== uid));
        else setList([...list, uid]);
    };

    if (authLoading || !user || !profile) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const loading = tasksLoading || (canAccess && calLoading);

    return (
        <div className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-16 pt-4 px-4">
            <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary">
                        <CalendarRange className="h-4 w-4" /> E-board workspace
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Command calendar & tasks</h1>
                    <p className="mt-2 max-w-xl text-xs font-mono text-muted-foreground">
                        {canAccess
                            ? "Shared planning for leadership: schedule e-board items, assign work, and track deadlines."
                            : "Tasks assigned to you by e-board appear here. Leadership tools are limited to executives and VPs."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={!canAccess}
                        onClick={() => setTab("calendar")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border transition-colors",
                            tab === "calendar"
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/40",
                            !canAccess && "opacity-40 cursor-not-allowed hover:border-border/50"
                        )}
                    >
                        <CalendarRange className="h-3.5 w-3.5" /> Calendar
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("tasks")}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border transition-colors",
                            tab === "tasks"
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border/50 text-muted-foreground hover:border-primary/40"
                        )}
                    >
                        <CheckSquare className="h-3.5 w-3.5" /> Tasks
                    </button>
                </div>
            </div>

            {tab === "calendar" && canAccess && (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="hud-panel border border-primary/30 bg-card/60 p-4 sm:p-6 scanlines">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={prevMonth}
                                className="rounded-sm border border-border/50 p-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
                                aria-label="Previous month"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">{monthLabel}</h2>
                            <button
                                type="button"
                                onClick={nextMonth}
                                className="rounded-sm border border-border/50 p-2 text-muted-foreground hover:border-primary/50 hover:text-primary"
                                aria-label="Next month"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                        {loading && (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        )}
                        {!loading && (
                            <>
                                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-2">
                                    {WEEKDAYS.map((d) => (
                                        <div key={d} className="py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {grid.map((cell) => {
                                        const evs = eventsByStart.get(cell.ymd) ?? [];
                                        const tks = tasksByDue.get(cell.ymd) ?? [];
                                        const isSel = selectedYmd === cell.ymd;
                                        const isToday = cell.ymd === toYmd(new Date());
                                        return (
                                            <button
                                                key={cell.ymd}
                                                type="button"
                                                onClick={() => setSelectedYmd(cell.ymd)}
                                                className={cn(
                                                    "min-h-[4.25rem] sm:min-h-[5rem] border p-1 text-left transition-colors flex flex-col gap-0.5",
                                                    cell.inMonth ? "bg-background/40" : "bg-background/10 opacity-60",
                                                    isSel && "ring-2 ring-primary border-primary/50",
                                                    isToday && "bg-primary/10"
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-mono font-bold",
                                                        isToday ? "text-primary" : "text-foreground"
                                                    )}
                                                >
                                                    {cell.date.getDate()}
                                                </span>
                                                <div className="flex flex-wrap gap-0.5 mt-auto">
                                                    {evs.length > 0 && (
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                                                            title={`${evs.length} calendar item(s)`}
                                                        />
                                                    )}
                                                    {tks.length > 0 && (
                                                        <span
                                                            className="h-1.5 w-1.5 rounded-full bg-chart-4 shrink-0"
                                                            title={`${tks.length} task(s) due`}
                                                        />
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="hud-panel border border-border/50 bg-card/50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                                    {selectedYmd
                                        ? parseYmd(selectedYmd).toLocaleDateString("en-US", {
                                              weekday: "short",
                                              month: "short",
                                              day: "numeric",
                                          })
                                        : "Pick a day"}
                                </h3>
                                <button
                                    type="button"
                                    disabled={!selectedYmd}
                                    onClick={() => selectedYmd && openNewEventForDay(selectedYmd)}
                                    className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-40"
                                >
                                    <Plus className="h-3 w-3" /> Add entry
                                </button>
                            </div>
                            <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scroll">
                                {selectedDayEvents.length === 0 && selectedDayTasks.length === 0 && (
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                                        Nothing scheduled — add an entry or task with a due date.
                                    </p>
                                )}
                                {selectedDayEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="border border-primary/25 bg-primary/5 p-2 text-[10px] font-mono"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold uppercase tracking-tight text-primary">{ev.title}</p>
                                            <div className="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditEvent(ev)}
                                                    className="text-[9px] uppercase text-muted-foreground hover:text-primary"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm("Delete this calendar entry?")) void deleteCalendarEvent(ev.id);
                                                    }}
                                                    className="text-destructive hover:underline"
                                                    aria-label="Delete"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                        {!ev.allDay && (ev.startTime || ev.endTime) && (
                                            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {ev.startTime}
                                                {ev.endTime ? `–${ev.endTime}` : ""}
                                            </p>
                                        )}
                                        {ev.allDay && <p className="mt-1 text-muted-foreground">All day</p>}
                                        {ev.location && (
                                            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                                                <MapPin className="h-3 w-3" /> {ev.location}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {selectedDayTasks.map((t) => (
                                    <div
                                        key={t.id}
                                        className="border border-chart-4/30 bg-chart-4/5 p-2 text-[10px] font-mono"
                                    >
                                        <p className="font-bold uppercase tracking-tight">{t.title}</p>
                                        <p className="text-muted-foreground mt-0.5">
                                            {t.assigneeUids.map((u) => nameByUid(u)).join(", ") || "Unassigned"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {showEventForm && (
                            <div className="hud-panel border border-border/50 bg-background/40 p-4 space-y-3">
                                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                                    {editingEventId ? "Edit calendar entry" : "New calendar entry"}
                                </h3>
                                <input
                                    value={evTitle}
                                    onChange={(e) => setEvTitle(e.target.value)}
                                    placeholder="Title"
                                    className="w-full border border-border/50 bg-background/60 px-3 py-2 text-xs font-mono uppercase focus:border-primary/50 focus:outline-none"
                                />
                                <textarea
                                    value={evDesc}
                                    onChange={(e) => setEvDesc(e.target.value)}
                                    placeholder="Notes"
                                    rows={2}
                                    className="w-full border border-border/50 bg-background/60 px-3 py-2 text-xs font-mono focus:border-primary/50 focus:outline-none resize-none"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-mono uppercase text-muted-foreground">Start</label>
                                        <input
                                            type="date"
                                            value={evStart}
                                            onChange={(e) => setEvStart(e.target.value)}
                                            className="mt-0.5 w-full border border-border/50 bg-background/60 px-2 py-1.5 text-xs font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-mono uppercase text-muted-foreground">
                                            End (optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={evEnd}
                                            onChange={(e) => setEvEnd(e.target.value)}
                                            className="mt-0.5 w-full border border-border/50 bg-background/60 px-2 py-1.5 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-[10px] font-mono uppercase">
                                    <input
                                        type="checkbox"
                                        checked={evAllDay}
                                        onChange={(e) => setEvAllDay(e.target.checked)}
                                    />
                                    All day
                                </label>
                                {!evAllDay && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="time"
                                            value={evStartTime}
                                            onChange={(e) => setEvStartTime(e.target.value)}
                                            className="border border-border/50 bg-background/60 px-2 py-1.5 text-xs font-mono"
                                        />
                                        <input
                                            type="time"
                                            value={evEndTime}
                                            onChange={(e) => setEvEndTime(e.target.value)}
                                            className="border border-border/50 bg-background/60 px-2 py-1.5 text-xs font-mono"
                                        />
                                    </div>
                                )}
                                <input
                                    value={evLocation}
                                    onChange={(e) => setEvLocation(e.target.value)}
                                    placeholder="Location / link"
                                    className="w-full border border-border/50 bg-background/60 px-3 py-2 text-xs font-mono focus:border-primary/50 focus:outline-none"
                                />
                                <div>
                                    <p className="text-[9px] font-mono uppercase text-muted-foreground mb-1 flex items-center gap-1">
                                        <Users className="h-3 w-3" /> Invitees (optional)
                                    </p>
                                    <div className="max-h-24 overflow-y-auto custom-scroll border border-border/40 p-1 space-y-0.5">
                                        {assignableMembers.slice(0, 40).map((m) => (
                                            <label key={m.id} className="flex items-center gap-2 text-[10px] font-mono">
                                                <input
                                                    type="checkbox"
                                                    checked={evAttendees.includes(m.id)}
                                                    onChange={() => toggleAssignee(m.id, evAttendees, setEvAttendees)}
                                                />
                                                {m.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveCalendarEvent}
                                        disabled={evSaving || !evTitle.trim()}
                                        className="flex-1 border border-primary bg-primary py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
                                    >
                                        {evSaving ? "Saving…" : editingEventId ? "Update" : "Save"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEventForm(false);
                                            resetEventForm();
                                        }}
                                        className="border border-border/50 px-3 py-2 text-[10px] font-mono uppercase text-muted-foreground"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === "tasks" && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        {(
                            [
                                ["all", "All"],
                                ["mine", "Assigned to me"],
                                ["todo", "To do"],
                                ["in_progress", "In progress"],
                                ["done", "Done"],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setTaskFilter(key)}
                                className={cn(
                                    "px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest border",
                                    taskFilter === key
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                        {canAccess && (
                            <button
                                type="button"
                                onClick={() => setShowTaskForm((v) => !v)}
                                className="ml-auto inline-flex items-center gap-1 border border-primary/50 bg-primary/10 px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-primary"
                            >
                                <Plus className="h-3 w-3" /> New task
                            </button>
                        )}
                    </div>

                    {showTaskForm && canAccess && (
                        <div className="hud-panel border border-primary/30 bg-card/50 p-4 sm:p-6 space-y-4">
                            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Create task</h3>
                            <input
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                placeholder="Title *"
                                className="w-full border border-border/50 bg-background/60 px-3 py-2 text-sm font-mono uppercase focus:border-primary/50 focus:outline-none"
                            />
                            <textarea
                                value={taskDesc}
                                onChange={(e) => setTaskDesc(e.target.value)}
                                placeholder="Description"
                                rows={3}
                                className="w-full border border-border/50 bg-background/60 px-3 py-2 text-sm font-mono focus:border-primary/50 focus:outline-none resize-none"
                            />
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-mono uppercase text-muted-foreground">Due date</label>
                                    <input
                                        type="date"
                                        value={taskDue}
                                        onChange={(e) => setTaskDue(e.target.value)}
                                        className="mt-1 w-full border border-border/50 bg-background/60 px-3 py-2 text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                                        <Flag className="h-3 w-3" /> Priority
                                    </label>
                                    <select
                                        value={taskPriority}
                                        onChange={(e) => setTaskPriority(e.target.value as EboardTaskPriority)}
                                        className="mt-1 w-full border border-border/50 bg-background/60 px-3 py-2 text-xs font-mono"
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] font-mono uppercase text-muted-foreground mb-2">Assign to</p>
                                <div className="max-h-32 overflow-y-auto custom-scroll border border-border/40 p-2 grid sm:grid-cols-2 gap-1">
                                    {assignableMembers.map((m) => (
                                        <label key={m.id} className="flex items-center gap-2 text-[10px] font-mono">
                                            <input
                                                type="checkbox"
                                                checked={taskAssignees.includes(m.id)}
                                                onChange={() => toggleAssignee(m.id, taskAssignees, setTaskAssignees)}
                                            />
                                            {m.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSaveTask}
                                disabled={taskSaving || !taskTitle.trim()}
                                className="border border-primary bg-primary px-6 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
                            >
                                {taskSaving ? "Saving…" : "Create task"}
                            </button>
                        </div>
                    )}

                    <div className="space-y-3">
                        {loading && (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        )}
                        {!loading && filteredTasks.length === 0 && (
                            <p className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest py-12">
                                No tasks match this filter.
                            </p>
                        )}
                        {!loading &&
                            filteredTasks.map((t) => (
                                <div
                                    key={t.id}
                                    className="hud-panel border border-border/40 bg-card/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                                >
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={cn("text-[9px] font-mono font-bold uppercase px-2 py-0.5 border", priorityClass(t.priority))}>
                                                {priorityLabel(t.priority)}
                                            </span>
                                            <span className="text-[9px] font-mono uppercase text-muted-foreground border border-border/40 px-2 py-0.5">
                                                {t.status.replace("_", " ")}
                                            </span>
                                            {t.dueDate && (
                                                <span className="text-[9px] font-mono text-primary">Due {t.dueDate}</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold font-mono uppercase tracking-tight">{t.title}</h3>
                                        {t.description && (
                                            <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">{t.description}</p>
                                        )}
                                        <p className="text-[10px] font-mono text-muted-foreground">
                                            Assigned: {t.assigneeUids.map((u) => nameByUid(u)).join(", ") || "—"}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                                        <select
                                            value={t.status}
                                            onChange={(e) => {
                                                const s = e.target.value as EboardTaskStatus;
                                                void updateTask(t.id, {
                                                    status: s,
                                                    completedAt: s === "done" ? serverTimestamp() : null,
                                                });
                                            }}
                                            className="border border-border/50 bg-background/60 px-2 py-1.5 text-[10px] font-mono uppercase"
                                        >
                                            <option value="todo">To do</option>
                                            <option value="in_progress">In progress</option>
                                            <option value="done">Done</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                        {canAccess && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (confirm("Delete this task?")) void deleteTask(t.id);
                                                }}
                                                className="inline-flex items-center gap-1 text-[9px] font-mono uppercase text-destructive hover:underline"
                                            >
                                                <Trash2 className="h-3 w-3" /> Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}
