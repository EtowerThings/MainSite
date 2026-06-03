import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Legacy docs created before `status` existed — e-board only (needs full collection read). */
export async function backfillStartupStatusApproved() {
    const snap = await getDocs(collection(db, "startups"));
    const updates: Promise<void>[] = [];
    for (const d of snap.docs) {
        const data = d.data();
        if (data.status === "pending" || data.status === "rejected") continue;
        if (data.status !== "approved") {
            updates.push(updateDoc(d.ref, { status: "approved" }));
        }
    }
    await Promise.all(updates);
}
