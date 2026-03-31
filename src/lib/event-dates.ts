/** Parse event date string (YYYY-MM-DD or display strings) to a Date (local noon for ISO dates). */
export function parseEventDate(dateStr: string): Date | null {
    if (!dateStr || typeof dateStr !== "string") return null;
    const t = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        const d = new Date(t + "T12:00:00");
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
}

export function startOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseHhmmOnDay(dayStart: Date, hhmm: string): number | null {
    const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const x = new Date(dayStart);
    x.setHours(h, min, 0, 0);
    return x.getTime();
}

export type EventLike = {
    date: string;
    time?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
};

/** Milliseconds for start of the event in local time (start of local day if no time). */
export function getEventStartMs(event: EventLike): number | null {
    const d = parseEventDate(event.date);
    if (!d) return null;
    const dayStart = startOfLocalDay(d);
    const st = (event.startTime && event.startTime.trim()) || "";
    if (st) {
        const t = parseHhmmOnDay(dayStart, st);
        if (t != null) return t;
    }
    if (event.time?.trim()) {
        const parts = event.time.split(/\s*[–\-—]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
        const first = parts[0];
        if (first) {
            const normalized = first.replace(/^(\d):/, "0$1:");
            const t = parseHhmmOnDay(dayStart, normalized);
            if (t != null) return t;
        }
    }
    return dayStart.getTime();
}

/**
 * True if the event should appear in "upcoming" / has not occurred yet:
 * calendar day in the future, or today before parsed start time, or today with no time (all-day).
 */
export function eventNotOccurredYet(event: EventLike): boolean {
    if (event.status === "past") return false;
    const d = parseEventDate(event.date);
    if (!d) return false;
    const now = Date.now();
    const todayStart = startOfLocalDay(new Date());
    const eventDay = startOfLocalDay(d);

    if (eventDay.getTime() < todayStart.getTime()) return false;

    if (eventDay.getTime() > todayStart.getTime()) return true;

    const st = (event.startTime && event.startTime.trim()) || "";
    let startMs: number | null = null;
    if (st) startMs = parseHhmmOnDay(eventDay, st);
    if (startMs == null && event.time?.trim()) {
        const parts = event.time.split(/\s*[–\-—]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
        const first = parts[0];
        if (first) {
            const normalized = first.replace(/^(\d):/, "0$1:");
            startMs = parseHhmmOnDay(eventDay, normalized);
        }
    }

    if (startMs != null) return startMs > now;
    return now <= endOfLocalDay(eventDay).getTime();
}

/** True if the event is in the past (ended or calendar day before today). */
export function eventHasOccurred(event: EventLike): boolean {
    return !eventNotOccurredYet(event);
}

function formatHhmmAmPm(hhmm: string): string {
    const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return hhmm.trim();
    const h = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    const d = new Date();
    d.setHours(h, min, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: min === 0 ? undefined : "2-digit" });
}

/**
 * Single-line local time for small UI (dashboard previews). Uses start/end or parses `time`.
 * Returns "" for all-day / no time.
 */
export function formatEventTimePreview(event: EventLike): string {
    const st = event.startTime?.trim();
    const en = event.endTime?.trim();
    if (st && en) return `${formatHhmmAmPm(st)} – ${formatHhmmAmPm(en)}`;
    if (st) return formatHhmmAmPm(st);
    const t = event.time?.trim();
    if (t) {
        const parts = t.split(/\s*[–\-—]\s*|\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
        if (parts.length === 2) return `${formatHhmmAmPm(parts[0])} – ${formatHhmmAmPm(parts[1])}`;
        if (parts.length === 1) return formatHhmmAmPm(parts[0]);
    }
    return "";
}
