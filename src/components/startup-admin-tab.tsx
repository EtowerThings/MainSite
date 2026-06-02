"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { deleteStartup, reviewStartupListing, type StartupItem } from "@/hooks/useFirestore";
import { STARTUP_BUSINESS_CATEGORIES } from "@/lib/startup-gallery";
import { cn } from "@/lib/utils";
import { Loader2, Rocket, Send, ThumbsDown, ThumbsUp, Trash2, Upload } from "lucide-react";

type RosterMember = {
    id: string;
    name: string;
    graduationYear?: string | null;
    photoURL?: string | null;
};

export function StartupAdminTab({
    startups,
    approvedMembers,
}: {
    startups: StartupItem[];
    approvedMembers: RosterMember[];
}) {
    const { profile } = useAuth();
    const startupLogoRef = useRef<HTMLInputElement>(null);

    const [startupName, setStartupName] = useState("");
    const [startupDesc, setStartupDesc] = useState("");
    const [startupFounderStory, setStartupFounderStory] = useState("");
    const [startupFounders, setStartupFounders] = useState("");
    const [startupYear, setStartupYear] = useState("");
    const [startupWebsite, setStartupWebsite] = useState("");
    const [startupInstagram, setStartupInstagram] = useState("");
    const [startupLinkedinCompany, setStartupLinkedinCompany] = useState("");
    const [startupBusinessCategory, setStartupBusinessCategory] = useState<string>(STARTUP_BUSINESS_CATEGORIES[0]);
    const [startupSending, setStartupSending] = useState(false);
    const [deletingStartupId, setDeletingStartupId] = useState<string | null>(null);
    const [reviewingStartupId, setReviewingStartupId] = useState<string | null>(null);
    const [startupLogo, setStartupLogo] = useState<File | null>(null);
    const [startupLogoPreview, setStartupLogoPreview] = useState<string | null>(null);
    const [startupLinkedUid, setStartupLinkedUid] = useState("");

    useEffect(() => {
        if (profile?.uid && startupLinkedUid === "") setStartupLinkedUid(profile.uid);
    }, [profile?.uid, startupLinkedUid]);

    const approvedMembersSorted = useMemo(
        () => approvedMembers.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
        [approvedMembers]
    );

    const pendingProposals = useMemo(() => startups.filter((s) => s.status === "pending"), [startups]);
    const approvedListings = useMemo(() => startups.filter((s) => s.status === "approved"), [startups]);

    const handleStartupLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) {
            setStartupLogo(null);
            setStartupLogoPreview(null);
            return;
        }
        setStartupLogo(file);
        const reader = new FileReader();
        reader.onloadend = () => setStartupLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleCreateStartup = async () => {
        if (
            !startupName.trim() ||
            !startupDesc.trim() ||
            !startupFounderStory.trim() ||
            !startupFounders.trim() ||
            !startupYear.trim() ||
            !startupLinkedUid.trim() ||
            !startupBusinessCategory.trim() ||
            !profile?.uid
        )
            return;
        setStartupSending(true);
        try {
            let logoUrl: string | null = null;
            if (startupLogo) {
                const safe = startupLogo.name.replace(/[^\w.-]/g, "_").slice(0, 80);
                const path = `startup-logos/${profile.uid}/${Date.now()}-admin-${safe}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, startupLogo);
                logoUrl = await getDownloadURL(storageRef);
            }

            const linked = approvedMembers.find((m) => m.id === startupLinkedUid.trim());
            await addDoc(collection(db, "startups"), {
                name: startupName.trim(),
                companyOverview: startupDesc.trim(),
                founderStory: startupFounderStory.trim(),
                founders: startupFounders.trim(),
                foundedYear: startupYear.trim(),
                businessCategory: startupBusinessCategory.trim(),
                website: startupWebsite.trim() || null,
                instagramUrl: startupInstagram.trim() || null,
                linkedinCompanyUrl: startupLinkedinCompany.trim() || null,
                logoUrl,
                status: "approved",
                submittedByUid: startupLinkedUid.trim(),
                submitterName: linked?.name?.trim() || profile.displayName?.trim() || "Member",
                submitterGraduationYear: linked?.graduationYear ?? null,
                submitterPhotoURL: linked?.photoURL?.trim() || profile.photoURL?.trim() || null,
                createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, "activityFeed"), {
                type: "milestone_update",
                actorId: profile.uid,
                actorName: profile.displayName || "E-board",
                targetId: "startups",
                targetName: startupName,
                description: `Added "${startupName}" to the Alumni Startups Gallery.`,
                pinned: false,
                pinnedBy: null,
                createdAt: serverTimestamp(),
            });

            setStartupName("");
            setStartupDesc("");
            setStartupFounderStory("");
            setStartupFounders("");
            setStartupYear("");
            setStartupWebsite("");
            setStartupInstagram("");
            setStartupLinkedinCompany("");
            setStartupBusinessCategory(STARTUP_BUSINESS_CATEGORIES[0]);
            setStartupLogo(null);
            setStartupLogoPreview(null);
            if (startupLogoRef.current) startupLogoRef.current.value = "";
            setStartupLinkedUid(profile.uid);
        } catch (err) {
            console.error("Startup creation error:", err);
        } finally {
            setStartupSending(false);
        }
    };

    const handleDeleteStartupListing = async (startupId: string, displayName: string) => {
        if (!confirm(`Remove “${displayName}” from the public startups gallery? This cannot be undone.`)) return;
        setDeletingStartupId(startupId);
        try {
            await deleteStartup(startupId);
        } catch (err) {
            console.error("Delete startup error:", err);
        } finally {
            setDeletingStartupId(null);
        }
    };

    const handleReviewStartup = async (startupId: string, name: string, decision: "approved" | "rejected") => {
        if (!profile?.uid) return;
        if (!confirm(`${decision === "approved" ? "Approve" : "Reject"} “${name}” for the public gallery?`)) return;
        setReviewingStartupId(startupId);
        try {
            await reviewStartupListing(startupId, decision, {
                uid: profile.uid,
                name: profile.displayName || "E-board",
            });
            if (decision === "approved") {
                await addDoc(collection(db, "activityFeed"), {
                    type: "milestone_update",
                    actorId: profile.uid,
                    actorName: profile.displayName || "E-board",
                    targetId: "startups",
                    targetName: name,
                    description: `Approved "${name}" for the Alumni Startups Gallery.`,
                    pinned: false,
                    pinnedBy: null,
                    createdAt: serverTimestamp(),
                });
            }
        } catch (err) {
            console.error("Startup review error:", err);
        } finally {
            setReviewingStartupId(null);
        }
    };

    return (
        <div className="space-y-6">
            {pendingProposals.length > 0 && (
                <div className="hud-panel bg-warning/5 border border-warning/40 p-6 sm:p-8 scanlines relative">
                    <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-warning/50" />
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-3 uppercase tracking-tight relative z-10 text-warning border-b border-warning/20 pb-4">
                        <Rocket className="w-5 h-5" /> PENDING PROPOSALS
                        <span className="ml-auto text-[10px] bg-warning/15 text-warning border border-warning/30 px-2 py-0.5">
                            {pendingProposals.length}
                        </span>
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 relative z-10">
                        Member submissions awaiting e-board approval before they appear on the public gallery.
                    </p>
                    <div className="space-y-3 relative z-10">
                        {pendingProposals.map((startup) => (
                            <div
                                key={startup.id}
                                className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 p-4 hud-panel-sm bg-background/50 border border-warning/30"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    {startup.logoUrl ? (
                                        <img src={startup.logoUrl} alt="" className="h-12 w-12 shrink-0 border border-border/50 object-contain" />
                                    ) : (
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-warning/30 bg-warning/10 text-warning">
                                            <Rocket className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold font-mono tracking-tight uppercase text-sm">{startup.name}</p>
                                        <p className="text-[10px] font-mono text-muted-foreground mt-1 line-clamp-2">{startup.companyOverview}</p>
                                        <p className="text-[9px] font-mono text-primary/80 uppercase tracking-widest mt-2">
                                            {startup.submitterName}
                                            {startup.submitterGraduationYear ? ` · Class of ${startup.submitterGraduationYear}` : ""}
                                            {startup.createdAt ? ` · ${startup.createdAt}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <Link
                                        href={`/startups/edit/${startup.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 hud-panel-sm border border-border/50 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                    >
                                        Review
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={reviewingStartupId === startup.id}
                                        onClick={() => void handleReviewStartup(startup.id, startup.name, "approved")}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 hud-panel-sm border border-primary/50 bg-primary/10 text-[10px] font-mono font-bold uppercase tracking-widest text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                                    >
                                        {reviewingStartupId === startup.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <ThumbsUp className="w-3.5 h-3.5" />
                                        )}
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        disabled={reviewingStartupId === startup.id}
                                        onClick={() => void handleReviewStartup(startup.id, startup.name, "rejected")}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 hud-panel-sm border border-destructive/40 text-[10px] font-mono font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    >
                                        <ThumbsDown className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                <h3 className="font-bold text-lg mb-2 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                    <Rocket className="w-5 h-5" /> PUBLISH DIRECTLY
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6 relative z-10">
                    Skip review and add a listing straight to the public gallery.
                </p>

                <div className="space-y-5 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">LINKED MEMBER (CODE OS)</label>
                        <select
                            value={startupLinkedUid}
                            onChange={(e) => setStartupLinkedUid(e.target.value)}
                            className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none"
                        >
                            {(approvedMembersSorted.length > 0
                                ? approvedMembersSorted
                                : profile
                                  ? [
                                        {
                                            id: profile.uid,
                                            name: profile.displayName || "You",
                                            graduationYear: profile.graduationYear ?? null,
                                            photoURL: profile.photoURL ?? null,
                                        },
                                    ]
                                  : []
                            ).map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                    {m.graduationYear ? ` · ’${m.graduationYear.slice(-2)}` : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY DESIGNATION</label>
                        <input type="text" value={startupName} onChange={(e) => setStartupName(e.target.value)} placeholder="e.g. OpenAI..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">YEAR ESTABLISHED</label>
                        <input type="text" value={startupYear} onChange={(e) => setStartupYear(e.target.value)} placeholder="e.g. 2024..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">BUSINESS CATEGORY</label>
                        <select
                            value={startupBusinessCategory}
                            onChange={(e) => setStartupBusinessCategory(e.target.value)}
                            className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none"
                        >
                            {STARTUP_BUSINESS_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">FOUNDING OPERATIVES</label>
                        <input type="text" value={startupFounders} onChange={(e) => setStartupFounders(e.target.value)} placeholder="e.g. Alice & Bob..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY WEBSITE</label>
                        <input type="url" value={startupWebsite} onChange={(e) => setStartupWebsite(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">INSTAGRAM</label>
                        <input type="text" value={startupInstagram} onChange={(e) => setStartupInstagram(e.target.value)} placeholder="@handle or URL" className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY LINKEDIN</label>
                        <input type="text" value={startupLinkedinCompany} onChange={(e) => setStartupLinkedinCompany(e.target.value)} placeholder="company/slug or URL" className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY LOGO (OPTIONAL)</label>
                        <input ref={startupLogoRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleStartupLogo} className="hidden" />
                        <button
                            type="button"
                            onClick={() => startupLogoRef.current?.click()}
                            className={cn(
                                "w-full flex flex-col items-center justify-center gap-2 px-4 py-4 border border-dashed transition-colors hud-panel-sm",
                                startupLogo ? "border-primary/40 bg-primary/5" : "border-border/50 bg-background/40 hover:border-primary/50"
                            )}
                        >
                            {startupLogoPreview ? (
                                <img src={startupLogoPreview} alt="" className="h-16 w-16 object-contain border border-primary/30" />
                            ) : (
                                <Upload className="w-6 h-6 text-muted-foreground" />
                            )}
                            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                {startupLogo ? "Click to replace" : "PNG, JPG, WebP"}
                            </span>
                        </button>
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">COMPANY OVERVIEW</label>
                        <textarea value={startupDesc} onChange={(e) => setStartupDesc(e.target.value)} placeholder="Short overview for cards and detail header…" rows={3} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                    </div>

                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">FOUNDER STORY</label>
                        <textarea value={startupFounderStory} onChange={(e) => setStartupFounderStory(e.target.value)} placeholder="Why you started, milestones, vision…" rows={5} className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                    </div>

                    <div className="col-span-1 md:col-span-2 pt-2 flex items-center justify-between">
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest leading-relaxed max-w-sm border-l-2 border-primary/30 pl-3">
                            Publishes immediately to the public gallery (no review queue).
                        </p>
                        <button
                            type="button"
                            onClick={() => void handleCreateStartup()}
                            disabled={
                                startupSending ||
                                !startupName.trim() ||
                                !startupDesc.trim() ||
                                !startupFounderStory.trim() ||
                                !startupFounders.trim() ||
                                !startupYear.trim() ||
                                !startupLinkedUid.trim() ||
                                !startupBusinessCategory.trim()
                            }
                            className="hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-3"
                        >
                            {startupSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {startupSending ? "Publishing…" : "Publish startup"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="hud-panel bg-card/40 border border-border/40 p-6 sm:p-8 scanlines relative">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-tight relative z-10 text-muted-foreground">
                    <Rocket className="w-4 h-4" /> LIVE GALLERY
                    <span className="ml-auto text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5">
                        {approvedListings.length} PUBLISHED
                    </span>
                </h3>
                {approvedListings.length === 0 ? (
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest relative z-10">No approved listings yet.</p>
                ) : (
                    <div className="space-y-3 relative z-10">
                        {approvedListings.map((startup) => (
                            <div
                                key={startup.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 hud-panel-sm bg-background/50 border border-border/40 hover:border-primary/40 transition-colors"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    {startup.logoUrl ? (
                                        <img src={startup.logoUrl} alt="" className="h-10 w-10 shrink-0 border border-border/50 object-contain" />
                                    ) : null}
                                    <div className="min-w-0">
                                        <p className="font-bold font-mono tracking-tight uppercase text-sm">
                                            {startup.name}
                                            <span className="text-muted-foreground ml-2">
                                                [{startup.foundedYear}] · {startup.businessCategory}
                                            </span>
                                        </p>
                                        {(startup.submitterName || startup.submitterGraduationYear) && (
                                            <p className="text-[9px] font-mono text-primary/70 uppercase tracking-widest mt-1">
                                                {startup.submitterName}
                                                {startup.submitterGraduationYear ? ` · Class of ${startup.submitterGraduationYear}` : ""}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Link href={`/startups/edit/${startup.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 hud-panel-sm border border-border/50 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                                        Edit
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={deletingStartupId === startup.id}
                                        onClick={() => void handleDeleteStartupListing(startup.id, startup.name)}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 hud-panel-sm border border-destructive/40 text-[10px] font-mono font-bold uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    >
                                        {deletingStartupId === startup.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
