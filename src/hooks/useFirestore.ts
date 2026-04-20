"use client";

import { useState, useEffect } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    doc,
    where,
    limit,
    getDocs,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    type QueryConstraint,
    type DocumentData,
    Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
    ORG_SETTINGS_CLUB_DOC_ID,
    normalizeYearTwoDigit,
    parseOrgSettingsRaw,
    type OrgSettingsData,
} from "@/lib/org-fiscal";
import { parseClubRole, parseResidency, type ResidencyType } from "@/lib/member-residency";

// ──────────────────────────────────────
// Generic real-time collection hook
// ──────────────────────────────────────
function useCollection<T extends { id: string }>(
    collectionName: string,
    constraints: QueryConstraint[] = [],
    transform?: (doc: DocumentData, id: string) => T,
    enabled: boolean = true
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const q = query(collection(db, collectionName), ...constraints);
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const items = snapshot.docs.map((d) => {
                    const raw = d.data();
                    if (transform) return transform(raw, d.id);
                    return { id: d.id, ...raw } as T;
                });
                setData(items);
                setLoading(false);
            },
            (err) => {
                console.error(`Firestore error (${collectionName}):`, err);
                setError(err.message);
                setLoading(false);
            }
        );
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionName, enabled]);

    return { data, loading, error };
}

// Helper to convert Firestore Timestamps to readable strings
function formatTimestamp(ts: unknown): string {
    if (!ts) return "";
    if (ts instanceof Timestamp) {
        return ts.toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
    if (typeof ts === "string") return ts;
    return "";
}

function timeAgo(ts: unknown): string {
    if (!ts) return "";
    let date: Date;
    if (ts instanceof Timestamp) {
        date = ts.toDate();
    } else if (typeof ts === "string") {
        return ts;
    } else {
        return "";
    }
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatTimestamp(ts);
}

// ──────────────────────────────────────
// Activity Feed
// ──────────────────────────────────────
export interface FeedItem {
    id: string;
    type: string;
    actorId: string;
    actorName: string;
    description: string;
    targetId: string | null;
    targetName: string | null;
    pinned: boolean;
    pinnedBy: string | null;
    createdAt: string;
    _createdAt: unknown; // raw timestamp for sorting
}

export function useFeed(enabled: boolean = true) {
    const result = useCollection<FeedItem>(
        "activityFeed",
        [orderBy("createdAt", "desc"), limit(50)],
        (raw, id) => ({
            id,
            type: raw.type || "milestone_update",
            actorId: raw.actorId || "",
            actorName: raw.actorName || "Unknown",
            description: raw.description || "",
            targetId: raw.targetId || null,
            targetName: raw.targetName || null,
            pinned: raw.pinned || false,
            pinnedBy: raw.pinnedBy || null,
            createdAt: timeAgo(raw.createdAt),
            _createdAt: raw.createdAt,
        }),
        enabled
    );

    const togglePin = async (itemId: string, currentlyPinned: boolean, userId: string) => {
        await updateDoc(doc(db, "activityFeed", itemId), {
            pinned: !currentlyPinned,
            pinnedBy: !currentlyPinned ? userId : null,
        });
    };

    return { ...result, togglePin };
}

// ──────────────────────────────────────
// Events
// ──────────────────────────────────────
/** Stored on one document: event repeats weekly, `count` = number of occurrences (including the first). */
export type EventRecurrence = { interval: "weekly"; count: number };

function rawDateToYyyyMmDd(raw: unknown): string {
    if (!raw) return "";
    if (raw instanceof Timestamp) {
        const d = raw.toDate();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    if (typeof raw === "string") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
    }
    return "";
}

function parseAttendanceByDate(raw: unknown): Record<string, string[]> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (Array.isArray(v)) out[k] = v.filter((x): x is string => typeof x === "string");
    }
    return out;
}

/** Non-alumni present for this occurrence date (`YYYY-MM-DD`). */
export function getAttendanceIdsForOccurrence(event: EventItem, occurrenceYmd: string): string[] {
    const v = event.attendanceByDate?.[occurrenceYmd];
    if (v !== undefined) return v;
    return [];
}

/** Count distinct occurrence sessions a member was marked present (admin). */
export function countMemberAttendanceOccurrences(events: EventItem[], memberId: string): number {
    let n = 0;
    for (const e of events) {
        const map = e.attendanceByDate || {};
        const keys = Object.keys(map);
        if (keys.length > 0) {
            for (const k of keys) {
                if (map[k]?.includes(memberId)) n++;
            }
        } else if ((e.attendance ?? []).includes(memberId)) {
            n++;
        }
    }
    return n;
}

export interface EventItem {
    id: string;
    title: string;
    description: string;
    date: string;
    /** Display string (e.g. "14:00 – 15:00"); derived from startTime/endTime when reading. */
    time: string;
    /** Stored start time "HH:mm" from input. */
    startTime: string;
    /** Stored end time "HH:mm" from input. */
    endTime: string;
    location: string;
    type: string;
    status: string;
    attendees: string[];
    /** Legacy flat list; prefer attendanceByDate. */
    attendance: string[];
    /** Per-occurrence attendance (keys = `YYYY-MM-DD`). */
    attendanceByDate: Record<string, string[]>;
    maxAttendees: number | null;
    tags: string[];
    featured: boolean;
    createdBy: string;
    /** Set by admin / VP Events for housing host bonus (+4) and host no-show (−3). */
    housingHostUid: string | null;
    createdAt: string;
    /** When set, UI expands to one row per weekly occurrence (single Firestore doc). */
    recurrence: EventRecurrence | null;
}

export function useEvents(enabled: boolean = true) {
    const result = useCollection<EventItem>(
        "events",
        [orderBy("createdAt", "desc")],
        (raw, id) => {
            const start = (raw.startTime && String(raw.startTime).trim()) || "";
            const end = (raw.endTime && String(raw.endTime).trim()) || "";
            const timeDisplay = start && end ? `${start} – ${end}` : start || raw.time || "";
            return {
                id,
                title: raw.title || "",
                description: raw.description || "",
                date: formatTimestamp(raw.date) || formatTimestamp(raw.createdAt),
                time: timeDisplay,
                startTime: start,
                endTime: end,
                location: raw.location || "",
            type: raw.type || "meeting",
            status: raw.status || "upcoming",
            attendees: raw.attendees || [],
            attendance: raw.attendance || [],
            attendanceByDate: (() => {
                let by = parseAttendanceByDate(raw.attendanceByDate);
                const legacy: string[] = Array.isArray(raw.attendance) ? raw.attendance : [];
                if (Object.keys(by).length === 0 && legacy.length > 0) {
                    const anchor = rawDateToYyyyMmDd(raw.date);
                    if (anchor) by = { [anchor]: legacy };
                }
                return by;
            })(),
            maxAttendees: raw.maxAttendees || null,
            tags: raw.tags || [],
            featured: raw.featured || false,
            createdBy: raw.createdBy || "",
            housingHostUid:
                typeof raw.housingHostUid === "string" && raw.housingHostUid.trim()
                    ? raw.housingHostUid.trim()
                    : null,
            createdAt: formatTimestamp(raw.createdAt),
            recurrence:
                raw.recurrence?.interval === "weekly" && typeof raw.recurrence?.count === "number"
                    ? { interval: "weekly", count: Math.max(1, Number(raw.recurrence.count)) }
                    : null,
            };
        },
        enabled
    );

    const createEvent = async (
        event: Omit<EventItem, "id" | "createdAt" | "attendees" | "attendance" | "attendanceByDate" | "housingHostUid"> & {
            startTime?: string;
            endTime?: string;
            housingHostUid?: string | null;
        }
    ) => {
        const startTime = (event as { startTime?: string }).startTime ?? "";
        const endTime = (event as { endTime?: string }).endTime ?? "";
        const rec = event.recurrence;
        const recurrencePayload =
            rec?.interval === "weekly" && rec.count >= 2 ? { interval: "weekly" as const, count: rec.count } : null;
        await addDoc(collection(db, "events"), {
            title: event.title,
            description: event.description ?? "",
            date: event.date,
            time: event.time ?? "",
            startTime: startTime || null,
            endTime: endTime || null,
            location: event.location ?? "",
            type: event.type,
            status: event.status,
            maxAttendees: event.maxAttendees,
            tags: event.tags ?? [],
            featured: event.featured ?? false,
            createdBy: event.createdBy ?? "",
            housingHostUid:
                event.housingHostUid && String(event.housingHostUid).trim()
                    ? String(event.housingHostUid).trim()
                    : null,
            attendees: [],
            attendance: [],
            attendanceByDate: {},
            recurrence: recurrencePayload,
            createdAt: serverTimestamp(),
        });
    };

    const rsvp = async (eventId: string, userId: string) => {
        await updateDoc(doc(db, "events", eventId), {
            attendees: arrayUnion(userId),
        });
    };

    const cancelRsvp = async (eventId: string, userId: string) => {
        await updateDoc(doc(db, "events", eventId), {
            attendees: arrayRemove(userId),
        });
    };

    /** Set admin-recorded attendance (non-alumni) for one occurrence date. */
    const setEventOccurrenceAttendance = async (eventId: string, occurrenceYmd: string, attendanceIds: string[]) => {
        const key = `attendanceByDate.${occurrenceYmd}`;
        await updateDoc(doc(db, "events", eventId), {
            [key]: attendanceIds,
        });
    };

    /** Update event fields (for admin/events role). */
    const updateEvent = async (
        eventId: string,
        updates: Partial<
            Pick<
                EventItem,
                | "title"
                | "description"
                | "date"
                | "time"
                | "location"
                | "type"
                | "status"
                | "maxAttendees"
                | "tags"
                | "featured"
                | "recurrence"
                | "housingHostUid"
            >
        > & {
            startTime?: string;
            endTime?: string;
        }
    ) => {
        const payload: Record<string, unknown> = {};
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        if (updates.date !== undefined) payload.date = updates.date;
        if (updates.time !== undefined) payload.time = updates.time;
        const start = (updates as { startTime?: string }).startTime;
        const end = (updates as { endTime?: string }).endTime;
        if (start !== undefined) payload.startTime = start || null;
        if (end !== undefined) payload.endTime = end || null;
        if (updates.location !== undefined) payload.location = updates.location;
        if (updates.type !== undefined) payload.type = updates.type;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.maxAttendees !== undefined) payload.maxAttendees = updates.maxAttendees;
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.featured !== undefined) payload.featured = updates.featured;
        if (updates.housingHostUid !== undefined) {
            const h = updates.housingHostUid;
            payload.housingHostUid = h && String(h).trim() ? String(h).trim() : null;
        }
        if (updates.recurrence !== undefined) {
            payload.recurrence =
                updates.recurrence && updates.recurrence.interval === "weekly" && updates.recurrence.count >= 2
                    ? { interval: "weekly", count: updates.recurrence.count }
                    : null;
        }
        await updateDoc(doc(db, "events", eventId), payload);
    };

    /** Delete event (admin/events role). */
    const deleteEvent = async (eventId: string) => {
        await deleteDoc(doc(db, "events", eventId));
    };

    return { ...result, createEvent, updateEvent, deleteEvent, rsvp, cancelRsvp, setEventOccurrenceAttendance };
}

// ──────────────────────────────────────
// Members (reads from `users` collection)
// ──────────────────────────────────────
export interface MemberItem {
    id: string;
    name: string;
    email: string;
    role: string;
    residency: ResidencyType;
    status: string;
    photoURL: string | null;
    standoutSkill: string;
    projects: number;
    uploads: number;
    attendance: string;
    joinDate: string;
    linkedin: string | null;
    bio: string | null;
    skills: string[];
    openToMentorship: boolean;
    /** `YYYY-MM-DD` from onboarding, or null. */
    birthday: string | null;
}

export function useMembers(enabled: boolean = true) {
    const result = useCollection<MemberItem>(
        "users",
        [orderBy("createdAt", "desc")],
        (raw, id) => {
            const rec = raw as Record<string, unknown>;
            return {
            id,
            name: raw.displayName || "Unknown",
            email: raw.email || "",
            role: parseClubRole(rec),
            residency: parseResidency(rec),
            status: raw.status || (raw.onboarded ? "approved" : "pending"),
            photoURL: raw.photoURL || null,
            standoutSkill: raw.standoutSkill || "—",
            projects:
                raw.engagementMetrics?.projectsCompleted ??
                (Array.isArray(raw.projects) ? raw.projects.length : 0),
            uploads: raw.engagementMetrics?.uploadsCount ?? 0,
            attendance: raw.engagementMetrics?.attendanceRate
                ? `${raw.engagementMetrics.attendanceRate}%`
                : "—",
            joinDate: formatTimestamp(raw.joinDate) || formatTimestamp(raw.createdAt),
            linkedin: raw.linkedin || raw.alumni?.linkedinUrl || null,
            bio: raw.bio || null,
            skills: raw.skills || [],
            openToMentorship: raw.openToMentorship || false,
            birthday: (() => {
                const b = raw.birthday;
                if (typeof b === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.trim())) return b.trim();
                if (b instanceof Timestamp) return rawDateToYyyyMmDd(b);
                return null;
            })(),
        };
        },
        enabled
    );
    return { ...result, data: result.data.filter((m) => m.status !== "removed") };
}

// ──────────────────────────────────────
// Resources
// ──────────────────────────────────────
export interface ResourceItem {
    id: string;
    title: string;
    description: string;
    type: string;
    tier: string;
    phase: string;
    topics: string[];
    views: number;
    uploadedBy: string;
    /** When set (client uploads), preferred for attributing resources to a user. */
    uploadedById: string | null;
    date: string;
    fileUrl: string | null;
    approved: boolean;
}

export function useResources(onlyApproved = true, enabled = true) {
    const result = useCollection<ResourceItem>(
        "resources",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            title: raw.title || "",
            description: raw.description || "",
            type: raw.type || "guide",
            tier: raw.tier || "community",
            phase: raw.phase || "beginner",
            topics: raw.topics || [],
            views: raw.views || 0,
            uploadedBy: raw.uploadedBy || "",
            uploadedById: typeof raw.uploadedById === "string" ? raw.uploadedById : null,
            date: formatTimestamp(raw.createdAt),
            fileUrl: raw.fileUrl || null,
            approved: raw.approved ?? false,
        }),
        enabled
    );

    // Filter client-side to avoid composite index requirement
    const filteredData = onlyApproved ? result.data.filter((r) => r.approved) : result.data;

    const createResource = async (resource: Partial<ResourceItem> & { uploadedById: string }) => {
        await addDoc(collection(db, "resources"), {
            ...resource,
            approved: false,
            views: 0,
            createdAt: serverTimestamp(),
        });
    };

    const approveResource = async (resourceId: string) => {
        await updateDoc(doc(db, "resources", resourceId), { approved: true });
    };

    const rejectResource = async (resourceId: string) => {
        await deleteDoc(doc(db, "resources", resourceId));
    };

    return { ...result, data: filteredData, createResource, approveResource, rejectResource };
}

// ──────────────────────────────────────
// Projects
// ──────────────────────────────────────
export interface ProjectTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface ProjectItem {
    id: string;
    name: string;
    description: string;
    status: string;
    teamMembers: { uid: string; role: string; name?: string }[];
    githubUrl: string | null;
    liveUrl: string | null;
    coverImage: string | null;
    gallery: string[];
    content: string;
    tasks: ProjectTask[];
    updatedAt: string;
    createdAt: string;
    clientVisible: boolean;
}

export function useProjects(enabled: boolean = true) {
    const result = useCollection<ProjectItem>(
        "projects",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            name: raw.name || "",
            description: raw.description || "",
            status: raw.status || "ideation",
            teamMembers: raw.teamMembers || [],
            githubUrl: raw.githubUrl || null,
            liveUrl: raw.liveUrl || null,
            coverImage: raw.coverImage || null,
            gallery: raw.gallery || [],
            content: raw.content || "",
            tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
            updatedAt: timeAgo(raw.updatedAt) || timeAgo(raw.createdAt),
            createdAt: formatTimestamp(raw.createdAt),
            clientVisible: raw.clientVisible ?? true,
        }),
        enabled
    );

    const createProject = async (project: Partial<ProjectItem>) => {
        const { tasks, ...rest } = project;
        await addDoc(collection(db, "projects"), {
            ...rest,
            tasks: tasks || [],
            status: project.status || "published",
            clientVisible: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    };

    const updateProject = async (projectId: string, updates: Partial<ProjectItem>) => {
        await updateDoc(doc(db, "projects", projectId), {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    };

    const addProjectTask = async (projectId: string, title: string) => {
        const project = result.data.find((p) => p.id === projectId);
        const currentTasks = project?.tasks || [];
        const newTask: ProjectTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            title: title.trim(),
            completed: false,
        };
        await updateDoc(doc(db, "projects", projectId), {
            tasks: [...currentTasks, newTask],
            updatedAt: serverTimestamp(),
        });
    };

    const updateProjectTask = async (projectId: string, taskId: string, updates: Partial<ProjectTask>) => {
        const project = result.data.find((p) => p.id === projectId);
        const tasks = (project?.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
        );
        await updateDoc(doc(db, "projects", projectId), {
            tasks,
            updatedAt: serverTimestamp(),
        });
    };

    const removeProjectTask = async (projectId: string, taskId: string) => {
        const project = result.data.find((p) => p.id === projectId);
        const tasks = (project?.tasks || []).filter((t) => t.id !== taskId);
        await updateDoc(doc(db, "projects", projectId), {
            tasks,
            updatedAt: serverTimestamp(),
        });
    };

    return { ...result, createProject, updateProject, addProjectTask, updateProjectTask, removeProjectTask };
}

// ──────────────────────────────────────
// Inquiries (Admin)
// ──────────────────────────────────────
export interface InquiryItem {
    id: string;
    question: string;
    category: string;
    status: string;
    date: string;
    askedBy: string;
    reply: string | null;
    repliedBy: string | null;
}

export function useInquiries(enabled: boolean = true) {
    const result = useCollection<InquiryItem>(
        "inquiries",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            question: raw.question || "",
            category: raw.category || "general",
            status: raw.status || "pending",
            date: formatTimestamp(raw.createdAt),
            askedBy: raw.askedBy || "Anonymous",
            reply: raw.reply || null,
            repliedBy: raw.repliedBy || null,
        }),
        enabled
    );

    const replyToInquiry = async (inquiryId: string, reply: string, repliedBy: string) => {
        await updateDoc(doc(db, "inquiries", inquiryId), {
            reply,
            repliedBy,
            status: "answered",
        });
    };

    const publishToFaq = async (inquiryId: string, question: string, answer: string) => {
        await addDoc(collection(db, "faq"), {
            question,
            answer,
            sourceInquiryId: inquiryId,
            createdAt: serverTimestamp(),
        });
        await updateDoc(doc(db, "inquiries", inquiryId), {
            status: "published",
        });
    };

    return { ...result, replyToInquiry, publishToFaq };
}

// ──────────────────────────────────────
// FAQ (Public)
// ──────────────────────────────────────
export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    createdAt: string;
}

export function useFAQ(enabled: boolean = true) {
    return useCollection<FAQItem>(
        "faq",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            question: raw.question || "",
            answer: raw.answer || "",
            createdAt: formatTimestamp(raw.createdAt),
        }),
        enabled
    );
}

// ──────────────────────────────────────
// Action Items (Upcoming Deadlines)
// ──────────────────────────────────────
export interface ActionItem {
    id: string;
    title: string;
    description: string;
    deadline: string;
    type: "form" | "external";
    link: string | null;
    completedBy: string[];
    createdAt: string;
    createdBy: string;
}

export function useActionItems(enabled: boolean = true) {
    const result = useCollection<ActionItem>(
        "actionItems",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            title: raw.title || "",
            description: raw.description || "",
            deadline: raw.deadline || "",
            type: raw.type || "external",
            link: raw.link || null,
            completedBy: raw.completedBy || [],
            createdAt: formatTimestamp(raw.createdAt),
            createdBy: raw.createdBy || "",
        }),
        enabled
    );

    const completeActionItem = async (itemId: string, userId: string, currentlyCompleted: boolean) => {
        const itemRef = doc(db, "actionItems", itemId);
        await updateDoc(itemRef, {
            completedBy: currentlyCompleted ? arrayRemove(userId) : arrayUnion(userId)
        });
    };

    return { ...result, completeActionItem };
}

// ──────────────────────────────────────
// Startups (Alumni Gallery)
// ──────────────────────────────────────
export interface StartupItem {
    id: string;
    name: string;
    description: string;
    founders: string;
    foundedYear: string;
    website: string | null;
    createdAt: string;
}

export function useStartups(enabled: boolean = true) {
    return useCollection<StartupItem>(
        "startups",
        [orderBy("createdAt", "desc")],
        (raw, id) => ({
            id,
            name: raw.name || "Unknown Startup",
            description: raw.description || "",
            founders: raw.founders || "",
            foundedYear: raw.foundedYear || "",
            website: raw.website || null,
            createdAt: formatTimestamp(raw.createdAt),
        }),
        enabled
    );
}

// ──────────────────────────────────────
// Budgets (line items; import CSV / edit in app)
// ──────────────────────────────────────
export interface BudgetLineRow {
    item: string;
    price: number;
    quantity: number;
    notes: string;
    link: string;
}

export interface BudgetItem {
    id: string;
    title: string;
    fiscalYear: string;
    /** Expected headcount for cost-per-attendee. */
    expectedAttendees: number;
    rows: BudgetLineRow[];
    createdBy: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
}

function numField(v: unknown): number {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const n = parseFloat(String(v ?? "").replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function intField(v: unknown, fallback: number): number {
    if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
    const n = parseInt(String(v ?? "").replace(/[,]/g, ""), 10);
    return Number.isFinite(n) ? Math.max(0, n) : fallback;
}

function parseBudgetLineRows(raw: unknown): BudgetLineRow[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((row: DocumentData) => {
        const hasNew = row.item !== undefined || row.price !== undefined || row.quantity !== undefined;
        if (hasNew) {
            return {
                item: String(row.item ?? ""),
                price: numField(row.price),
                quantity: Math.max(0, intField(row.quantity, 1)),
                notes: String(row.notes ?? ""),
                link: String(row.link ?? ""),
            };
        }
        const cat = String(row.category ?? "");
        const line = String(row.lineItem ?? row.line_item ?? "");
        const item = [cat, line].filter(Boolean).join(" — ") || line;
        const budgeted = numField(row.budgeted);
        return {
            item,
            price: budgeted,
            quantity: 1,
            notes: String(row.notes ?? ""),
            link: "",
        };
    });
}

export function useBudgets(enabled: boolean = true) {
    const result = useCollection<BudgetItem>(
        "budgets",
        [orderBy("updatedAt", "desc")],
        (raw, id) => ({
            id,
            title: raw.title || "Untitled budget",
            fiscalYear: String(raw.fiscalYear ?? ""),
            expectedAttendees: intField(raw.expectedAttendees, 0),
            rows: parseBudgetLineRows(raw.rows),
            createdBy: raw.createdBy || "",
            createdByName: raw.createdByName || "",
            createdAt: formatTimestamp(raw.createdAt),
            updatedAt: formatTimestamp(raw.updatedAt),
        }),
        enabled
    );

    const createBudget = async (payload: {
        title: string;
        fiscalYear: string;
        expectedAttendees: number;
        rows: BudgetLineRow[];
        uid: string;
        displayName: string;
    }) => {
        await addDoc(collection(db, "budgets"), {
            title: payload.title.trim() || "Untitled budget",
            fiscalYear: payload.fiscalYear.trim(),
            expectedAttendees: Math.max(0, Math.floor(payload.expectedAttendees) || 0),
            rows: payload.rows.map((r) => ({
                item: r.item,
                price: r.price,
                quantity: r.quantity,
                notes: r.notes,
                link: r.link,
            })),
            createdBy: payload.uid,
            createdByName: payload.displayName,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    };

    const updateBudget = async (
        budgetId: string,
        updates: Partial<Pick<BudgetItem, "title" | "fiscalYear" | "expectedAttendees" | "rows">>
    ) => {
        const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.fiscalYear !== undefined) payload.fiscalYear = updates.fiscalYear;
        if (updates.expectedAttendees !== undefined) {
            payload.expectedAttendees = Math.max(0, Math.floor(updates.expectedAttendees) || 0);
        }
        if (updates.rows !== undefined) {
            payload.rows = updates.rows.map((r) => ({
                item: r.item,
                price: r.price,
                quantity: r.quantity,
                notes: r.notes,
                link: r.link,
            }));
        }
        await updateDoc(doc(db, "budgets", budgetId), payload);
    };

    const deleteBudget = async (budgetId: string) => {
        await deleteDoc(doc(db, "budgets", budgetId));
    };

    return { ...result, createBudget, updateBudget, deleteBudget };
}

// ──────────────────────────────────────
// Org-wide settings (club fiscal label, etc.)
// ──────────────────────────────────────
export interface OrgSettingsDoc extends OrgSettingsData {
    id: string;
}

export function useOrgSettings(enabled: boolean = true) {
    const [data, setData] = useState<OrgSettingsDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            setData(null);
            return;
        }
        setLoading(true);
        const ref = doc(db, "orgSettings", ORG_SETTINGS_CLUB_DOC_ID);
        const unsubscribe = onSnapshot(
            ref,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setData(null);
                } else {
                    const parsed = parseOrgSettingsRaw(snapshot.data() as Record<string, unknown>);
                    setData({ id: snapshot.id, ...parsed });
                }
                setLoading(false);
            },
            (err: { code?: string; message?: string }) => {
                const denied = err.code === "permission-denied";
                if (denied) {
                    setData(null);
                    setError(
                        "Org settings read was denied. Publish the orgSettings rules from this repo’s firestore.rules (firebase deploy --only firestore:rules), or paste the match /orgSettings block in Firebase Console → Firestore → Rules."
                    );
                    console.warn(
                        "[orgSettings] permission-denied — budgets/events use the default fiscal label until rules allow read on orgSettings/club."
                    );
                } else {
                    console.error("Firestore error (orgSettings):", err);
                    setError(err.message ?? "Unknown error");
                }
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [enabled]);

    const saveOrgSettings = async (payload: OrgSettingsData) => {
        await setDoc(
            doc(db, "orgSettings", ORG_SETTINGS_CLUB_DOC_ID),
            {
                fiscalTerm: payload.fiscalTerm,
                fiscalYearTwoDigit: normalizeYearTwoDigit(payload.fiscalYearTwoDigit),
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );
    };

    return { data, loading, error, saveOrgSettings };
}

// ──────────────────────────────────────
// Dashboard Stats (aggregated counts)
// ──────────────────────────────────────
export function useDashboardStats() {
    const [stats, setStats] = useState({
        totalProjects: 0,
        totalMembers: 0,
        totalResources: 0,
        activeProjects: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchCounts(signedIn: boolean) {
            try {
                let projectsSnap = await getDocs(collection(db, "projects"));
                let usersSnapSize = 0;
                let resourcesApproved = 0;

                if (signedIn) {
                    const [usersSnap, resourcesSnap] = await Promise.all([
                        getDocs(collection(db, "users")),
                        getDocs(collection(db, "resources")),
                    ]);
                    usersSnapSize = usersSnap.size;
                    resourcesApproved = resourcesSnap.docs.filter(
                        (d) => d.data().approved === true
                    ).length;
                }

                if (!cancelled) {
                    const activeCount = projectsSnap.docs.filter(
                        (d) => d.data().status !== "complete"
                    ).length;
                    setStats({
                        totalProjects: projectsSnap.size,
                        totalMembers: usersSnapSize,
                        totalResources: resourcesApproved,
                        activeProjects: activeCount,
                    });
                    setLoading(false);
                }
            } catch (err) {
                console.error("Dashboard stats error:", err);
                if (!cancelled) setLoading(false);
            }
        }

        const unsub = onAuthStateChanged(auth, (user) => {
            if (!cancelled) {
                setLoading(true);
                void fetchCounts(!!user);
            }
        });

        return () => {
            cancelled = true;
            unsub();
        };
    }, []);

    return { stats, loading };
}
