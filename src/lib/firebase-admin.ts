import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { parseClubRole } from "@/lib/member-residency";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
    if (getApps().length) {
        return getApps()[0];
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
        // During build time, env vars may not be available.
        // Initialize with just projectId to prevent crash; runtime calls will fail gracefully.
        return initializeApp({ projectId: "build-placeholder" });
    }

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
}

let _adminAuth: Auth | null = null;
let _adminDb: Firestore | null = null;

function getAdminAuth(): Auth {
    if (!_adminAuth) {
        _adminAuth = getAuth(getAdminApp());
    }
    return _adminAuth;
}

function getAdminDbInstance(): Firestore {
    if (!_adminDb) {
        _adminDb = getFirestore(getAdminApp());
    }
    return _adminDb;
}

// Proxy object so consuming code can call adminDb.collection(...) seamlessly
export const adminDb = new Proxy({} as Firestore, {
    get(_target, prop) {
        const instance = getAdminDbInstance();
        const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
        if (typeof val === "function") {
            return val.bind(instance);
        }
        return val;
    },
});

export const adminAuth = new Proxy({} as Auth, {
    get(_target, prop) {
        const instance = getAdminAuth();
        const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
        if (typeof val === "function") {
            return val.bind(instance);
        }
        return val;
    },
});

export async function verifyIdToken(token: string) {
    return getAdminAuth().verifyIdToken(token);
}

export async function getUserRole(uid: string) {
    const userDoc = await getAdminDbInstance().collection("users").doc(uid).get();
    const data = userDoc.data() as Record<string, unknown> | undefined;
    return parseClubRole(data ?? {});
}
