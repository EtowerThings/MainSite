/** Business category options for startup gallery submissions. */
export const STARTUP_BUSINESS_CATEGORIES = [
    "B2B SaaS",
    "Consumer tech",
    "FinTech",
    "Health & bio",
    "EdTech",
    "LegalTech",
    "E-commerce / retail",
    "Media & entertainment",
    "Climate & sustainability",
    "AI / ML",
    "Hardware / IoT",
    "Consulting & services",
    "Nonprofit / social impact",
    "Other",
] as const;

export type StartupBusinessCategory = (typeof STARTUP_BUSINESS_CATEGORIES)[number];

export type StartupListingStatus = "pending" | "approved" | "rejected";

export function isStartupPubliclyVisible(status: StartupListingStatus): boolean {
    return status === "approved";
}

export function isStartupBusinessCategory(s: string): s is StartupBusinessCategory {
    return (STARTUP_BUSINESS_CATEGORIES as readonly string[]).includes(s);
}

function withHttps(url: string): string {
    const t = url.trim();
    if (!t) return "";
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

/** Safe href for company website. */
export function hrefWebsite(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    return withHttps(raw);
}

/** Build Instagram profile URL from @handle or full URL. */
export function hrefInstagram(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    const t = raw.trim();
    if (/^https?:\/\//i.test(t)) return t;
    const h = t.replace(/^@/, "").replace(/^\//, "");
    if (!h) return null;
    return `https://www.instagram.com/${h.replace(/^instagram\.com\/?/i, "")}`;
}

/** Build LinkedIn URL (company or profile path). */
export function hrefLinkedIn(raw: string | null | undefined): string | null {
    if (!raw?.trim()) return null;
    let t = raw.trim();
    if (/^https?:\/\//i.test(t)) return t;
    t = t.replace(/^www\.linkedin\.com\/?/i, "").replace(/^linkedin\.com\/?/i, "");
    const path = t.replace(/^\/?/, "");
    if (!path) return null;
    return `https://www.linkedin.com/${path}`;
}
