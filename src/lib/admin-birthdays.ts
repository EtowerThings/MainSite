import type { MemberItem } from "@/hooks/useFirestore";

export type BirthdayRow = {
    member: MemberItem;
    birthdayYmd: string;
    displayBirth: string;
    age: number | null;
    nextBirthday: Date;
    /** Whole days from local today to next birthday (0 = today). */
    daysUntil: number;
};

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Normalize stored birthday to `YYYY-MM-DD`, or null. */
export function parseBirthdayYmd(s: string | null | undefined): string | null {
    if (!s || typeof s !== "string") return null;
    const t = s.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    return t;
}

export function ageFromBirthdayYmd(ymd: string, ref = new Date()): number | null {
    const parts = ymd.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [Y, M, D] = parts;
    const birth = new Date(Y, M - 1, D);
    if (isNaN(birth.getTime())) return null;
    let age = ref.getFullYear() - birth.getFullYear();
    const md = ref.getMonth() - birth.getMonth();
    if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) age--;
    return age;
}

/** Next calendar occurrence of month/day (birth year ignored) on or after `from` (local). */
export function nextBirthdayFromYmd(ymd: string, from = new Date()): Date | null {
    const parts = ymd.split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const [, m, d] = parts;
    if (!m || !d) return null;
    const y = from.getFullYear();
    let cand = new Date(y, m - 1, d);
    const today0 = startOfDay(from);
    if (cand < today0) cand = new Date(y + 1, m - 1, d);
    return cand;
}

export function daysFromTodayTo(target: Date, from = new Date()): number {
    const ms = 24 * 60 * 60 * 1000;
    return Math.round((startOfDay(target).getTime() - startOfDay(from).getTime()) / ms);
}

export function buildBirthdayRows(members: MemberItem[], from = new Date()): BirthdayRow[] {
    const rows: BirthdayRow[] = [];
    for (const m of members) {
        const ymd = parseBirthdayYmd(m.birthday);
        if (!ymd) continue;
        const next = nextBirthdayFromYmd(ymd, from);
        if (!next) continue;
        const [Y, Mo, Da] = ymd.split("-").map(Number);
        const displayBirth = new Date(Y, Mo - 1, Da).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        rows.push({
            member: m,
            birthdayYmd: ymd,
            displayBirth,
            age: ageFromBirthdayYmd(ymd, from),
            nextBirthday: next,
            daysUntil: daysFromTodayTo(next, from),
        });
    }
    rows.sort((a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime());
    return rows;
}

export function membersMissingBirthday(members: MemberItem[]): MemberItem[] {
    return [...members]
        .filter((m) => !parseBirthdayYmd(m.birthday))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
