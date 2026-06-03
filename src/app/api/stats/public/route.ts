export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isPublicStartupRaw } from "@/lib/startup-document";

/** Public landing-page counts — also caches to Firestore for unauthenticated reads. */
export async function GET() {
    try {
        const [usersSnap, startupsSnap] = await Promise.all([
            adminDb.collection("users").get(),
            adminDb.collection("startups").get(),
        ]);

        const totalStartups = startupsSnap.docs.filter((d) => isPublicStartupRaw(d.data())).length;
        const payload = {
            totalMembers: usersSnap.size,
            totalStartups,
            updatedAt: new Date(),
        };

        await adminDb.collection("platformStats").doc("public").set(payload, { merge: true });

        return NextResponse.json({
            totalMembers: payload.totalMembers,
            totalStartups: payload.totalStartups,
        });
    } catch (error) {
        console.error("GET /api/stats/public error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
