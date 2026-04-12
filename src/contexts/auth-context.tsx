"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole =
    | "resident"
    | "associate"
    | "marketing"
    | "events"
    | "finance"
    | "vice-president"
    | "president"
    | "community-manager"
    | "vp-events"
    | "vp-marketing"
    | "vp-prof-dev"
    | "vp-finance"
    | "alumni";

export interface EngagementMetrics {
    attendanceRate?: number;
    projectsCompleted?: number;
    uploadsCount?: number;
    pitchesSubmitted?: number;
}

interface UserProfile {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    role: UserRole;
    status: "pending" | "approved" | "rejected" | "removed";
    standoutSkill: string | null;
    skills?: string[];
    onboarded?: boolean;
    openToMentorship?: boolean;
    linkedin?: string | null;
    engagementMetrics?: EngagementMetrics;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    needsOnboarding: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch user profile from Firestore
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const metrics = data.engagementMetrics;
                        const onboardingName = data.displayName && String(data.displayName).trim();
                        setProfile({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: onboardingName || firebaseUser.displayName || null,
                            photoURL: data.photoURL || firebaseUser.photoURL,
                            role: (data.role as UserRole) || "resident",
                            status: data.status || (data.onboarded ? "approved" : "pending"), // Handle legacy users
                            standoutSkill: data.standoutSkill || null,
                            skills: data.skills || [],
                            onboarded: data.onboarded === true,
                            openToMentorship: data.openToMentorship || false,
                            linkedin: data.linkedin || data.alumni?.linkedinUrl || null,
                            engagementMetrics: metrics ? {
                                attendanceRate: metrics.attendanceRate ?? 0,
                                projectsCompleted: metrics.projectsCompleted ?? (Array.isArray(data.projects) ? data.projects.length : 0),
                                uploadsCount: metrics.uploadsCount ?? 0,
                                pitchesSubmitted: metrics.pitchesSubmitted ?? 0,
                            } : undefined,
                        });
                        setNeedsOnboarding(data.onboarded !== true);
                    } else {
                        // User exists in Auth but not Firestore yet — create stub doc
                        try {
                            await setDoc(doc(db, "users", firebaseUser.uid), {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || null,
                                displayName: firebaseUser.displayName || null,
                                photoURL: firebaseUser.photoURL || null,
                                role: "resident",
                                status: "pending",
                                onboarded: false,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                            }, { merge: true });
                        } catch {
                            // May fail if rules not set up yet
                        }

                        setProfile({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: "resident",
                            status: "pending",
                            standoutSkill: null,
                            skills: [],
                            onboarded: false,
                            openToMentorship: false,
                            linkedin: null,
                            engagementMetrics: undefined,
                        });
                        setNeedsOnboarding(true);
                    }
                } catch {
                    setProfile({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        role: "resident",
                        status: "pending",
                        standoutSkill: null,
                        skills: [],
                        openToMentorship: false,
                        linkedin: null,
                        engagementMetrics: undefined,
                    });
                }
            } else {
                setProfile(null);
                setNeedsOnboarding(false);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const signInWithEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUpWithEmail = async (email: string, password: string) => {
        await createUserWithEmailAndPassword(auth, email, password);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setProfile(null);
    };

    const refreshProfile = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const onboardingName = data.displayName && String(data.displayName).trim();
                setProfile({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: onboardingName || currentUser.displayName || null,
                    photoURL: data.photoURL || currentUser.photoURL,
                    role: data.role || "member",
                    status: data.status || (data.onboarded ? "approved" : "pending"),
                    standoutSkill: data.standoutSkill || null,
                    skills: data.skills || [],
                    onboarded: data.onboarded === true,
                    openToMentorship: data.openToMentorship || false,
                    linkedin: data.linkedin || data.alumni?.linkedinUrl || null,
                });
                setNeedsOnboarding(data.onboarded !== true);
            }
        } catch (err) {
            console.error("Failed to refresh profile:", err);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                needsOnboarding,
                signInWithGoogle,
                signInWithEmail,
                signUpWithEmail,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

// Safe version for public pages — returns null values instead of throwing
export function useOptionalAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        return {
            user: null,
            profile: null,
            loading: false,
            needsOnboarding: false,
            signInWithGoogle: async () => { },
            signInWithEmail: async () => { },
            signUpWithEmail: async () => { },
            signOut: async () => { },
            refreshProfile: async () => { },
        } as AuthContextType;
    }
    return context;
}
