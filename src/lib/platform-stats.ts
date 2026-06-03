import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isPublicStartupRaw } from "@/lib/startup-document";

export const PLATFORM_STATS_DOC_ID = "public";

export type PlatformStatsPayload = {
    totalMembers: number;
    totalStartups: number;
};

export type PublicPlatformStats = {
    totalMembers: number | null;
    totalStartups: number | null;
};

export async function readPlatformStats(): Promise<PublicPlatformStats | null> {
    const snap = await getDoc(doc(db, "platformStats", PLATFORM_STATS_DOC_ID));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
        totalMembers: typeof data.totalMembers === "number" ? data.totalMembers : null,
        totalStartups: typeof data.totalStartups === "number" ? data.totalStartups : null,
    };
}

/** Recompute counts and write to public doc (any signed-in member can run this). */
export async function syncPlatformStats(): Promise<PlatformStatsPayload> {
    const usersSnap = await getDocs(collection(db, "users"));

    let totalStartups = 0;
    try {
        const startupsSnap = await getDocs(collection(db, "startups"));
        totalStartups = startupsSnap.docs.filter((d) => isPublicStartupRaw(d.data())).length;
    } catch {
        const approved = await getDocs(
            query(collection(db, "startups"), where("status", "==", "approved"))
        );
        totalStartups = approved.size;
    }

    const payload: PlatformStatsPayload = {
        totalMembers: usersSnap.size,
        totalStartups,
    };

    await setDoc(
        doc(db, "platformStats", PLATFORM_STATS_DOC_ID),
        { ...payload, updatedAt: serverTimestamp() },
        { merge: true }
    );

    return payload;
}
