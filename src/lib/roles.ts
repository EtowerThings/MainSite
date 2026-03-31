import { UserRole } from "@/contexts/auth-context";

// Admins = president, vice-president, community-manager (used for Admin Center, attendance, etc.)
export const ADMIN_ROLES: UserRole[] = ["president", "vice-president", "community-manager"];

// All roles in the organization
export const ALL_ROLES: { value: UserRole; label: string }[] = [
    { value: "resident", label: "Resident" },
    { value: "associate", label: "Associate" },
    { value: "marketing", label: "Marketing" },
    { value: "events", label: "Events" },
    { value: "finance", label: "Finance" },
    { value: "vice-president", label: "Vice President" },
    { value: "president", label: "President" },
    { value: "community-manager", label: "Community Manager" },
    { value: "alumni", label: "Alumni" },
];

/** True if role is one of: president, vice-president, community-manager. */
export function isAdmin(role: string | undefined): boolean {
    return ADMIN_ROLES.includes(role as UserRole);
}

/** True if user can create/edit events and take attendance (admin or events role). */
export function canEditEvents(role: string | undefined): boolean {
    return isAdmin(role) || role === "events";
}

export function isPresident(role: string | undefined): boolean {
    return role === "president";
}

export function getRoleLabel(role: string): string {
    const found = ALL_ROLES.find((r) => r.value === role);
    return found?.label || role;
}
