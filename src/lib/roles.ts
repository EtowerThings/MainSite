import { UserRole } from "@/contexts/auth-context";

/**
 * Hidden super-admin role — assign only in Firestore (`users/{uid}.role = "root"`).
 * Not listed in ALL_ROLES; displays as "Member" to everyone except another root user.
 */
export const ROOT_ROLE = "root" as const;

/** President, VP (club), community manager — full admin center powers (roster, applications, etc.). */
export const ADMIN_ROLES: UserRole[] = ["president", "vice-president", "community-manager"];

/** Functional VPs — access admin center for broadcasts, budgets, and role-specific tools. */
export const VP_ROLES: UserRole[] = [
    "vp-events",
    "vp-marketing",
    "vp-prof-dev",
    "vp-finance",
    "vp-recruitment",
    "vp-outreach",
];

/** Leadership / e-board display (badges, roster filters). */
export const LEADERSHIP_ROLES: UserRole[] = [...ADMIN_ROLES, ...VP_ROLES];

/** Team leads who can open Admin Tools for broadcasts and budgets (not full core-admin roster). */
export const ANNOUNCEMENT_TEAM_ROLES: UserRole[] = ["recruitment", "outreach"];

/** Club / team role (Firestore `role`). Residency is separate (`residency` field). */
export const ALL_ROLES: { value: UserRole; label: string }[] = [
    { value: "member", label: "Member" },
    { value: "marketing", label: "Marketing" },
    { value: "events", label: "Events" },
    { value: "finance", label: "Finance" },
    { value: "recruitment", label: "Recruitment" },
    { value: "outreach", label: "Outreach" },
    { value: "vp-events", label: "VP of Events" },
    { value: "vp-marketing", label: "VP of Marketing" },
    { value: "vp-prof-dev", label: "VP of Prof Dev" },
    { value: "vp-finance", label: "VP of Finance" },
    { value: "vp-recruitment", label: "VP of Recruitment" },
    { value: "vp-outreach", label: "VP of Outreach" },
    { value: "vice-president", label: "Vice President" },
    { value: "president", label: "President" },
    { value: "community-manager", label: "Community Manager" },
    { value: "alumni", label: "Alumni" },
];

export function isRoot(role: string | undefined): boolean {
    return role === ROOT_ROLE;
}

/** President, vice president, community manager, or root. */
export function isAdmin(role: string | undefined): boolean {
    return isRoot(role) || ADMIN_ROLES.includes(role as UserRole);
}

/** Core admins, functional VPs, or recruitment/outreach team leads — Admin Tools (limited tabs) and announcements. */
export function canAccessAdminCenter(role: string | undefined): boolean {
    return (
        isAdmin(role) ||
        VP_ROLES.includes(role as UserRole) ||
        ANNOUNCEMENT_TEAM_ROLES.includes(role as UserRole)
    );
}

/** Same set as admin center access for announcements and budgets. */
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
    return isRoot(role) || role === "president";
}

/** President, club VP, community manager, functional VP, or root — shared e-board calendar & tasks. */
export function canAccessEboardWorkspace(role: string | undefined): boolean {
    return isRoot(role) || LEADERSHIP_ROLES.includes(role as UserRole);
}

/** Approve or reject startup gallery proposals (core exec + functional VPs). */
export function canReviewStartupSubmissions(role: string | undefined): boolean {
    return canAccessEboardWorkspace(role);
}

export function getRoleLabel(role: string, viewerRole?: string): string {
    if (role === ROOT_ROLE) {
        return viewerRole === ROOT_ROLE ? "System Admin" : "Member";
    }
    const found = ALL_ROLES.find((r) => r.value === role);
    return found?.label || role;
}
