"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOptionalAuth } from "@/contexts/auth-context";
import { readPlatformStats, syncPlatformStats, type PublicPlatformStats } from "@/lib/platform-stats";

/** Client fallback — approved startups only (no member count without cached public doc). */
async function fetchApprovedStartupCount(): Promise<number> {
    const snap = await getDocs(query(collection(db, "startups"), where("status", "==", "approved")));
    return snap.size;
}

export function usePublicPlatformStats() {
    const { user, loading: authLoading } = useOptionalAuth();
    const [stats, setStats] = useState<PublicPlatformStats>({
        totalMembers: null,
        totalStartups: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;

        let cancelled = false;

        (async () => {
            try {
                const cached = await readPlatformStats();
                if (!cancelled && cached) {
                    setStats(cached);
                    setLoading(false);
                }

                if (user) {
                    try {
                        const fresh = await syncPlatformStats();
                        if (!cancelled) {
                            setStats({
                                totalMembers: fresh.totalMembers,
                                totalStartups: fresh.totalStartups,
                            });
                        }
                    } catch (err) {
                        console.warn("Platform stats sync failed:", err);
                    } finally {
                        if (!cancelled) setLoading(false);
                    }
                    return;
                }

                if (!cached) {
                    try {
                        const totalStartups = await fetchApprovedStartupCount();
                        if (!cancelled) {
                            setStats({ totalMembers: null, totalStartups });
                        }
                    } catch (err) {
                        console.error("Public startups count error:", err);
                    }
                }
            } catch (err) {
                console.error("Public platform stats error:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.uid]);

    return { stats, loading: loading || authLoading };
}

export type { PublicPlatformStats };
