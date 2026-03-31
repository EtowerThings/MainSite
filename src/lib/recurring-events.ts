import type { EventItem } from "@/hooks/useFirestore";
import { parseEventDate, eventNotOccurredYet, eventHasOccurred, getEventStartMs } from "@/lib/event-dates";

/** One row per calendar occurrence (single doc → many rows if weekly recurrence). */
export type EventOccurrenceRow = EventItem & {
    occurrenceDate: string;
    instanceKey: string;
};

function toYyyyMmDd(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
}

export function expandEventOccurrences(event: EventItem): EventOccurrenceRow[] {
    const anchor = parseEventDate(event.date);
    if (!anchor) {
        return [{ ...event, occurrenceDate: event.date, instanceKey: event.id }];
    }
    const rec = event.recurrence;
    if (!rec || rec.interval !== "weekly" || rec.count < 2) {
        return [{ ...event, occurrenceDate: toYyyyMmDd(anchor), instanceKey: event.id }];
    }
    const out: EventOccurrenceRow[] = [];
    for (let i = 0; i < rec.count; i++) {
        const d = new Date(anchor);
        d.setDate(d.getDate() + i * 7);
        out.push({
            ...event,
            occurrenceDate: toYyyyMmDd(d),
            instanceKey: `${event.id}_${i}`,
        });
    }
    return out;
}

export function expandAllEventOccurrences(events: EventItem[]): EventOccurrenceRow[] {
    return events.flatMap(expandEventOccurrences);
}

/** For date-based rules (upcoming/past/sort), evaluate this specific occurrence day. */
export function occurrenceEventLike(row: EventOccurrenceRow): EventItem {
    return { ...row, date: row.occurrenceDate };
}

export function eventSeriesHasUpcoming(event: EventItem): boolean {
    return expandEventOccurrences(event).some((o) => eventNotOccurredYet(occurrenceEventLike(o)));
}

export function eventSeriesFullyPast(event: EventItem): boolean {
    const rows = expandEventOccurrences(event);
    return rows.length > 0 && rows.every((o) => eventHasOccurred(occurrenceEventLike(o)));
}

export function getNextOccurrenceRow(event: EventItem): EventOccurrenceRow | null {
    const rows = expandEventOccurrences(event);
    const upcoming = rows.filter((o) => eventNotOccurredYet(occurrenceEventLike(o)));
    if (upcoming.length === 0) return null;
    return [...upcoming].sort(
        (a, b) =>
            (getEventStartMs(occurrenceEventLike(a)) ?? 0) - (getEventStartMs(occurrenceEventLike(b)) ?? 0)
    )[0];
}

export function getLastOccurrenceRow(event: EventItem): EventOccurrenceRow {
    const rows = expandEventOccurrences(event);
    return rows[rows.length - 1];
}

/** Date row on the events page (one card per series). */
export function getListDisplayOccurrence(event: EventItem, tab: "all" | "upcoming" | "past"): EventOccurrenceRow {
    if (tab === "past") return getLastOccurrenceRow(event);
    const next = getNextOccurrenceRow(event);
    if (tab === "upcoming") return next ?? getLastOccurrenceRow(event);
    return next ?? getLastOccurrenceRow(event);
}

export function sortKeyUpcomingSeries(event: EventItem): number {
    const next = getNextOccurrenceRow(event);
    return next ? (getEventStartMs(occurrenceEventLike(next)) ?? Infinity) : Infinity;
}

export function sortKeyPastSeries(event: EventItem): number {
    const last = getLastOccurrenceRow(event);
    return getEventStartMs(occurrenceEventLike(last)) ?? -Infinity;
}

export function sortKeyAllSeries(event: EventItem): number {
    const next = getNextOccurrenceRow(event);
    if (next) return getEventStartMs(occurrenceEventLike(next)) ?? Infinity;
    return getEventStartMs(event) ?? Infinity;
}
