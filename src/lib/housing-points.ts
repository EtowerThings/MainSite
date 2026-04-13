import { getAttendanceIdsForOccurrence, type EventItem, type MemberItem } from "@/hooks/useFirestore";
import { expandEventOccurrences, occurrenceEventLike } from "@/lib/recurring-events";
import { eventHasOccurred } from "@/lib/event-dates";

const EXECUTIVE_ROLES = new Set(["president", "vice-president", "community-manager"]);
const OFFICER_ROLES = new Set([
    "marketing",
    "events",
    "finance",
    "vp-events",
    "vp-marketing",
    "vp-prof-dev",
    "vp-finance",
]);

export type HousingPointsBreakdown = {
    memberId: string;
    name: string;
    email: string;
    role: string;
    /** Sum of +1 present / −1 absent / −3 host absent on past rolls. */
    attendanceSessionPoints: number;
    /** +4 per event this member created (host). */
    hostEventBonus: number;
    /** Executive +3 or Officer +2 from current role (not stacked). */
    leadershipBonus: number;
    /** Residents only: +2 per estimated semester since join. */
    residencyBonus: number;
    total: number;
};

function rollWasTakenForOccurrence(event: EventItem, occurrenceYmd: string): boolean {
    return (
        Object.prototype.hasOwnProperty.call(event.attendanceByDate ?? {}, occurrenceYmd) ||
        (Object.keys(event.attendanceByDate ?? {}).length === 0 &&
            (event.attendance?.length ?? 0) > 0 &&
            occurrenceYmd === legacyAnchorYmd(event))
    );
}

function legacyAnchorYmd(event: EventItem): string {
    const raw = event.date?.trim() ?? "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return "";
}

function isApprovedNonAlumni(m: MemberItem): boolean {
    return m.status !== "pending" && m.status !== "rejected" && m.role !== "alumni";
}

/** Semesters since join (minimum 1) for residency bonus: +2 points each. */
export function estimateResidencySemesters(joinDateLabel: string): number {
    if (!joinDateLabel?.trim() || joinDateLabel === "—") return 1;
    const d = new Date(joinDateLabel);
    if (isNaN(d.getTime())) return 1;
    const months = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    return Math.max(1, Math.ceil(months / 6));
}

function leadershipPointsForRole(role: string): number {
    if (EXECUTIVE_ROLES.has(role)) return 3;
    if (OFFICER_ROLES.has(role)) return 2;
    return 0;
}

/** Official host for housing scoring (set by admin / VP Events on the event). */
export function getEventHousingHostUid(event: EventItem): string {
    return (event.housingHostUid || "").trim();
}

/**
 * Housing points for roster planning (admin-only UI).
 *
 * Attendance: for each past occurrence where a roll was saved, each approved non-alumni member
 * gets +1 if marked present, −1 if absent, or −3 if they created the event and were absent (host no-show).
 *
 * Host bonus: +4 per event where `housingHostUid` is this member’s uid (assigned by admin / VP Events).
 *
 * Role: Executive +3 or Officer +2 (whichever applies to current role).
 *
 * Residency: all members except associates and alumni get +2 × estimated semesters since join (non-associates treated as residents for housing).
 */
export function computeHousingPointsBreakdowns(
    members: MemberItem[],
    events: EventItem[]
): HousingPointsBreakdown[] {
    const byId = new Map<string, HousingPointsBreakdown>();

    for (const m of members) {
        if (m.status === "pending" || m.status === "rejected") continue;
        byId.set(m.id, {
            memberId: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            attendanceSessionPoints: 0,
            hostEventBonus: 0,
            leadershipBonus: leadershipPointsForRole(m.role),
            residencyBonus:
                m.role !== "associate" && m.role !== "alumni"
                    ? estimateResidencySemesters(m.joinDate) * 2
                    : 0,
            total: 0,
        });
    }

    const eligibleIds = new Set(members.filter(isApprovedNonAlumni).map((m) => m.id));

    for (const event of events) {
        const hostId = getEventHousingHostUid(event);
        if (hostId && byId.has(hostId)) {
            const row = byId.get(hostId)!;
            row.hostEventBonus += 4;
        }

        const rows = expandEventOccurrences(event);
        for (const row of rows) {
            const ymd = row.occurrenceDate;
            if (!ymd) continue;
            if (!eventHasOccurred(occurrenceEventLike(row))) continue;
            if (!rollWasTakenForOccurrence(event, ymd)) continue;

            const presentIds = new Set(getAttendanceIdsForOccurrence(event, ymd));

            for (const uid of eligibleIds) {
                const rec = byId.get(uid);
                if (!rec) continue;

                const present = presentIds.has(uid);
                if (present) {
                    rec.attendanceSessionPoints += 1;
                    continue;
                }

                const isHost = hostId === uid;
                if (isHost) {
                    rec.attendanceSessionPoints += -3;
                } else {
                    rec.attendanceSessionPoints += -1;
                }
            }
        }
    }

    const out: HousingPointsBreakdown[] = [];
    for (const row of byId.values()) {
        row.total =
            row.attendanceSessionPoints +
            row.hostEventBonus +
            row.leadershipBonus +
            row.residencyBonus;
        out.push(row);
    }

    out.sort((a, b) => b.total - a.total);
    return out;
}

export const HOUSING_POINTS_RULES_TEXT = [
    "Higher housing points improve your likelihood of getting a single.",
    "Attendance (past sessions where a roll was saved): +1 if marked present; −1 if not marked present; −3 if you are the assigned event host and did not show as present.",
    "Community meetings and club events both use this +1 / −1 session rule (same point value as in the club handbook table).",
    "Host an event: +4 when you are set as the event host (Admin or VP Events sets this on each event).",
    "Officers (Marketing, Events, Finance, functional VPs): +2.",
    "Executive (President, Vice President, Community Manager): +3.",
    "Residency: +2 per estimated semester since join for everyone except associates and alumni (non-associates count as residents for this purpose).",
    "Handbook reference — No show (meeting): −1; No show (hosting an event): −3 when you are the assigned host and absent on the roll.",
] as const;
