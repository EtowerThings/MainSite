import type { DocumentData } from "firebase/firestore";
import type { StartupListingStatus } from "@/lib/startup-gallery";

function hasToDate(ts: unknown): ts is { toDate: () => Date } {
    return typeof ts === "object" && ts !== null && typeof (ts as { toDate?: unknown }).toDate === "function";
}

function hasToMillis(ts: unknown): ts is { toMillis: () => number } {
    return typeof ts === "object" && ts !== null && typeof (ts as { toMillis?: unknown }).toMillis === "function";
}

export function formatTimestamp(ts: unknown): string {
    if (!ts) return "";
    if (hasToDate(ts)) {
        return ts.toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
    if (typeof ts === "string") return ts;
    return "";
}

export function timestampToMs(ts: unknown): number {
    if (!ts) return 0;
    if (hasToMillis(ts)) return ts.toMillis();
    if (hasToDate(ts)) return ts.toDate().getTime();
    if (typeof ts === "string") {
        const ms = Date.parse(ts);
        return Number.isFinite(ms) ? ms : 0;
    }
    return 0;
}

/** True for legacy docs (no status) and approved listings. */
export function isPublicStartupRaw(raw: DocumentData): boolean {
    const status = raw.status;
    if (status === "pending" || status === "rejected") return false;
    return true;
}

/** Parse Firestore startup document (shared by gallery API, hooks, and edit page). */
export function parseStartupDocument(raw: DocumentData, id: string) {
    const overview =
        typeof raw.companyOverview === "string" && raw.companyOverview.trim()
            ? raw.companyOverview.trim()
            : typeof raw.description === "string"
              ? raw.description.trim()
              : "";
    return {
        id,
        name: raw.name || "Unknown Startup",
        companyOverview: overview,
        founderStory: typeof raw.founderStory === "string" ? raw.founderStory.trim() : "",
        founders: raw.founders || "",
        foundedYear: raw.foundedYear || "",
        businessCategory:
            typeof raw.businessCategory === "string" && raw.businessCategory.trim()
                ? raw.businessCategory.trim()
                : "Other",
        website: typeof raw.website === "string" && raw.website.trim() ? raw.website.trim() : null,
        instagramUrl:
            typeof raw.instagramUrl === "string" && raw.instagramUrl.trim() ? raw.instagramUrl.trim() : null,
        linkedinCompanyUrl:
            typeof raw.linkedinCompanyUrl === "string" && raw.linkedinCompanyUrl.trim()
                ? raw.linkedinCompanyUrl.trim()
                : null,
        logoUrl: typeof raw.logoUrl === "string" && raw.logoUrl.trim() ? raw.logoUrl.trim() : null,
        submittedByUid:
            typeof raw.submittedByUid === "string" && raw.submittedByUid.trim() ? raw.submittedByUid.trim() : null,
        submitterName:
            typeof raw.submitterName === "string" && raw.submitterName.trim() ? raw.submitterName.trim() : null,
        submitterGraduationYear:
            typeof raw.submitterGraduationYear === "string" &&
            /^\d{4}$/.test(raw.submitterGraduationYear.trim())
                ? raw.submitterGraduationYear.trim()
                : null,
        submitterPhotoURL:
            typeof raw.submitterPhotoURL === "string" && raw.submitterPhotoURL.trim()
                ? raw.submitterPhotoURL.trim()
                : null,
        status:
            raw.status === "pending" || raw.status === "rejected"
                ? (raw.status as StartupListingStatus)
                : "approved",
        reviewedByUid:
            typeof raw.reviewedByUid === "string" && raw.reviewedByUid.trim() ? raw.reviewedByUid.trim() : null,
        reviewedByName:
            typeof raw.reviewedByName === "string" && raw.reviewedByName.trim() ? raw.reviewedByName.trim() : null,
        reviewedAt: formatTimestamp(raw.reviewedAt),
        createdAt: formatTimestamp(raw.createdAt),
    };
}

export type StartupItem = ReturnType<typeof parseStartupDocument>;
