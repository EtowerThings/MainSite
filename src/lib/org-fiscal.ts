export type FiscalTerm = "spring" | "fall";

export interface OrgSettingsData {
    fiscalTerm: FiscalTerm;
    /** Last two digits of the calendar year for this term label, e.g. "26". */
    fiscalYearTwoDigit: string;
}

/** Single org-wide settings document id in `orgSettings`. */
export const ORG_SETTINGS_CLUB_DOC_ID = "club";

export function normalizeYearTwoDigit(input: string | number | undefined | null): string {
    const digits = String(input ?? "").replace(/\D/g, "");
    if (!digits) return String(new Date().getFullYear()).slice(-2);
    return digits.slice(-2).padStart(2, "0");
}

/** Heuristic default before any Firestore doc exists: Aug–Dec → Fall, else Spring; year = current CY. */
export function defaultOrgFiscalSettings(): OrgSettingsData {
    const m = new Date().getMonth();
    const fiscalTerm: FiscalTerm = m >= 7 ? "fall" : "spring";
    return {
        fiscalTerm,
        fiscalYearTwoDigit: String(new Date().getFullYear()).slice(-2),
    };
}

export function parseOrgSettingsRaw(raw: Record<string, unknown> | undefined): OrgSettingsData {
    const fiscalTerm: FiscalTerm = raw?.fiscalTerm === "fall" ? "fall" : "spring";
    const fiscalYearTwoDigit = normalizeYearTwoDigit(raw?.fiscalYearTwoDigit as string | number | undefined);
    return { fiscalTerm, fiscalYearTwoDigit };
}

/** Display label e.g. `S26` / `F26`. When `stored` is null (no doc yet), uses {@link defaultOrgFiscalSettings}. */
export function fiscalLabelFromOrgSettings(stored: OrgSettingsData | null): string {
    const s = stored ?? defaultOrgFiscalSettings();
    const letter = s.fiscalTerm === "fall" ? "F" : "S";
    return `${letter}${normalizeYearTwoDigit(s.fiscalYearTwoDigit)}`;
}
