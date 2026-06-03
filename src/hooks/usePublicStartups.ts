"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOptionalAuth } from "@/contexts/auth-context";
import { canReviewStartupSubmissions } from "@/lib/roles";
import { backfillStartupStatusApproved } from "@/lib/startup-backfill";
import {
    isPublicStartupRaw,
    parseStartupDocument,
    timestampToMs,
    type StartupItem,
} from "@/lib/startup-document";

function sortStartupDocs(docs: { data: () => Record<string, unknown>; id: string }[]) {
    return docs
        .slice()
        .sort((a, b) => timestampToMs(b.data().createdAt) - timestampToMs(a.data().createdAt))
        .map((d) => parseStartupDocument(d.data(), d.id));
}

/** E-board can list the full collection; everyone else uses status == approved. */
async function fetchPublicStartups(canReadAll: boolean): Promise<StartupItem[]> {
    if (canReadAll) {
        const snap = await getDocs(collection(db, "startups"));
        const publicDocs = snap.docs.filter((d) => isPublicStartupRaw(d.data()));
        void backfillStartupStatusApproved().catch((err) => console.warn("Startup status backfill:", err));
        return sortStartupDocs(publicDocs);
    }

    const snap = await getDocs(query(collection(db, "startups"), where("status", "==", "approved")));
    return sortStartupDocs(snap.docs);
}

/**
 * Public startup gallery — one-shot Firestore reads (no realtime listeners).
 * E-board reviewers load legacy + approved docs; others see approved only.
 */
export function usePublicStartups(enabled: boolean = true) {
    const { profile, loading: authLoading } = useOptionalAuth();
    const [data, setData] = useState<StartupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const canReadAll = !!profile && canReviewStartupSubmissions(profile.role);

    useEffect(() => {
        if (!enabled || authLoading) return;

        let cancelled = false;
        setLoading(true);

        fetchPublicStartups(canReadAll)
            .then((startups) => {
                if (!cancelled) {
                    setData(startups);
                    setError(null);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error("Public startups load error:", err);
                    setError(err instanceof Error ? err.message : "Failed to load startups");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [enabled, authLoading, canReadAll]);

    return { data, loading: loading || authLoading, error };
}

export type { StartupItem };
