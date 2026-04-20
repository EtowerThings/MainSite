import { UserRole } from "@/contexts/auth-context";

/** President, VP (club), community manager — full admin center powers (roster, applications, etc.). */
export const ADMIN_ROLES: UserRole[] = ["president", "vice-president", "community-manager"];

/** Functional VPs — access admin center for broadcasts, budgets, and role-specific tools. */
export const VP_ROLES: UserRole[] = [
    "vp-events",
    "vp-marketing",
    "vp-prof-dev",
    "vp-finance",
    "vp-recruitment",
];

/** Leadership / e-board display (badges, roster filters). */
export const LEADERSHIP_ROLES: UserRole[] = [...ADMIN_ROLES, ...VP_ROLES];

/** Club / team role (Firestore `role`). Residency is separate (`residency` field). */
export const ALL_ROLES: { value: UserRole; label: string }[] = [
    { value: "member", label: "Member" },
    { value: "marketing", label: "Marketing" },
    { value: "events", label: "Events" },
    { value: "finance", label: "Finance" },
    { value: "vp-events", label: "VP of Events" },
    { value: "vp-marketing", label: "VP of Marketing" },
    { value: "vp-prof-dev", label: "VP of Prof Dev" },
    { value: "vp-finance", label: "VP of Finance" },
    { value: "vp-recruitment", label: "VP of Recruitment" },
    { value: "vice-president", label: "Vice President" },
    { value: "president", label: "President" },
    { value: "community-manager", label: "Community Manager" },
    { value: "alumni", label: "Alumni" },
];

/** President, vice president, or community manager. */
export function isAdmin(role: string | undefined): boolean {
    return ADMIN_ROLES.includes(role as UserRole);
}

/** Core admins or functional VPs — can open Admin Tools and post announcements. */
export function canAccessAdminCenter(role: string | undefined): boolean {
    return isAdmin(role) || VP_ROLES.includes(role as UserRole);
}

/** Same set as admin center access — announcements and budgets. */
export function canPostAnnouncement(role: string | undefined): boolean {
    return canAccessAdminCenter(role);
}

/** Create/edit/delete events and take attendance (events lead roles). */
export function canEditEvents(role: string | undefined): boolean {
    return isAdmin(role) || role === "events" || role === "vp-events";
}

/** Admin attendance matrix and per-session roster (core admin, Events role, VP Events). */
export function canManageEventAttendance(role: string | undefined): boolean {
    return isAdmin(role) || role === "events" || role === "vp-events";
}

export function isPresident(role: string | undefined): boolean {
    return role === "president";
}

export function getRoleLabel(role: string): string {
    const found = ALL_ROLES.find((r) => r.value === role);
    return found?.label || role;
}
