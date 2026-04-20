/** Housing / membership status (orthogonal to club officer role). */
export type ResidencyType = "associate" | "resident" | "alumni";

export const ALL_RESIDENCY_OPTIONS: { value: ResidencyType; label: string }[] = [
    { value: "resident", label: "Resident" },
    { value: "associate", label: "Associate" },
    { value: "alumni", label: "Alumni" },
];

export function getResidencyLabel(r: string | undefined): string {
    if (!r) return "Resident";
    const found = ALL_RESIDENCY_OPTIONS.find((o) => o.value === r);
    return found?.label ?? r;
}

/**
 * Derive residency from `residency` field, or infer from legacy `role` when unset.
 */
export function parseResidency(raw: Record<string, unknown>): ResidencyType {
    const r = raw.residency;
    if (r === "associate" || r === "resident" || r === "alumni") return r;
    const legacy = raw.role;
    if (legacy === "associate") return "associate";
    if (legacy === "alumni") return "alumni";
    return "resident";
}

/**
 * Club / permission role stored in Firestore as `role`.
 * Legacy docs used `role` for associate/resident; those map to `member` + `residency`.
 */
export function parseClubRole(raw: Record<string, unknown>): string {
    const fromField = raw.clubRole;
    if (typeof fromField === "string" && fromField.trim()) return fromField.trim();
    const legacy = typeof raw.role === "string" ? raw.role : "member";
    if (legacy === "associate" || legacy === "resident") return "member";
    return legacy;
}
