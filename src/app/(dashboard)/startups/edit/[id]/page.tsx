"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { parseStartupDocument, updateStartup } from "@/hooks/useFirestore";
import { STARTUP_BUSINESS_CATEGORIES, isStartupBusinessCategory } from "@/lib/startup-gallery";
import { isAdmin } from "@/lib/roles";
import { ArrowLeft, Loader2, Rocket, Send, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EditStartupPage() {
    const router = useRouter();
    const params = useParams();
    const id = typeof params.id === "string" ? params.id : "";
    const { user, profile, loading: authLoading } = useAuth();

    const [name, setName] = useState("");
    const [companyOverview, setCompanyOverview] = useState("");
    const [founderStory, setFounderStory] = useState("");
    const [founders, setFounders] = useState("");
    const [foundedYear, setFoundedYear] = useState("");
    const [businessCategory, setBusinessCategory] = useState<string>(STARTUP_BUSINESS_CATEGORIES[0]);
    const [website, setWebsite] = useState("");
    const [instagramUrl, setInstagramUrl] = useState("");
    const [linkedinCompanyUrl, setLinkedinCompanyUrl] = useState("");
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const logoRef = useRef<HTMLInputElement>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const [loadingDoc, setLoadingDoc] = useState(true);
    const [submittedByUid, setSubmittedByUid] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && !user) router.replace("/login");
    }, [authLoading, user, router]);

    useEffect(() => {
        if (!id) {
            setLoadError("Invalid startup.");
            setLoadingDoc(false);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoadingDoc(true);
            setLoadError("");
            try {
                const snap = await getDoc(doc(db, "startups", id));
                if (cancelled) return;
                if (!snap.exists()) {
                    setLoadError("This startup listing was not found.");
                    setLoadingDoc(false);
                    return;
                }
                const s = parseStartupDocument(snap.data(), snap.id);
                setSubmittedByUid(s.submittedByUid);
                setName(s.name);
                setCompanyOverview(s.companyOverview);
                setFounderStory(s.founderStory);
                setFounders(s.founders);
                setFoundedYear(s.foundedYear);
                setBusinessCategory(
                    isStartupBusinessCategory(s.businessCategory) ? s.businessCategory : STARTUP_BUSINESS_CATEGORIES[0]
                );
                setWebsite(s.website ?? "");
                setInstagramUrl(s.instagramUrl ?? "");
                setLinkedinCompanyUrl(s.linkedinCompanyUrl ?? "");
                setLogoPreview(s.logoUrl);
                setLogo(null);
            } catch (e) {
                console.error(e);
                if (!cancelled) setLoadError("Could not load startup.");
            } finally {
                if (!cancelled) setLoadingDoc(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const canEdit =
        !!profile && (isAdmin(profile.role) || (!!submittedByUid && profile.uid === submittedByUid));

    const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file (PNG, JPG, or WebP).");
            return;
        }
        setError("");
        setLogo(file);
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !profile || !id || !canEdit) return;
        if (
            !name.trim() ||
            !companyOverview.trim() ||
            !founderStory.trim() ||
            !founders.trim() ||
            !foundedYear.trim() ||
            !businessCategory.trim()
        ) {
            setError("Fill in all required fields.");
            return;
        }
        setSending(true);
        setError("");
        try {
            let logoUrl: string | null | undefined = undefined;
            if (logo) {
                const safe = logo.name.replace(/[^\w.-]/g, "_").slice(0, 80);
                const path = `startup-logos/${user.uid}/${Date.now()}-edit-${safe}`;
                const storageRef = ref(storage, path);
                await uploadBytes(storageRef, logo);
                logoUrl = await getDownloadURL(storageRef);
            }

            const ownerUid = submittedByUid;
            let submitterName = profile.displayName?.trim() || "Member";
            let submitterGraduationYear = profile.graduationYear?.trim() || null;
            let submitterPhotoURL = profile.photoURL?.trim() || null;
            if (ownerUid && ownerUid !== profile.uid) {
                const ownerSnap = await getDoc(doc(db, "users", ownerUid));
                if (ownerSnap.exists()) {
                    const u = ownerSnap.data();
                    submitterName = (typeof u.displayName === "string" && u.displayName.trim()) || submitterName;
                    const gy = u.graduationYear;
                    submitterGraduationYear =
                        typeof gy === "string" && /^\d{4}$/.test(gy.trim()) ? gy.trim() : submitterGraduationYear;
                    submitterPhotoURL =
                        typeof u.photoURL === "string" && u.photoURL.trim() ? u.photoURL.trim() : submitterPhotoURL;
                }
            }

            await updateStartup(id, {
                name: name.trim(),
                companyOverview: companyOverview.trim(),
                founderStory: founderStory.trim(),
                founders: founders.trim(),
                foundedYear: foundedYear.trim(),
                businessCategory: businessCategory.trim(),
                website: website.trim() || null,
                instagramUrl: instagramUrl.trim() || null,
                linkedinCompanyUrl: linkedinCompanyUrl.trim() || null,
                ...(logoUrl !== undefined ? { logoUrl } : {}),
                submitterName,
                submitterGraduationYear,
                submitterPhotoURL,
            });

            router.push("/startups");
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Could not save changes.");
        } finally {
            setSending(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (loadingDoc) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 pb-16 pt-4">
                <Link
                    href="/startups"
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to gallery
                </Link>
                <p className="text-sm font-mono text-destructive">{loadError}</p>
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 pb-16 pt-4">
                <Link
                    href="/startups"
                    className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to gallery
                </Link>
                <p className="text-sm font-mono text-muted-foreground">
                    You don&apos;t have permission to edit this listing. Only the member who posted it or an admin can make changes.
                </p>
            </div>
        );
    }

    const inputClass =
        "w-full border border-border/50 bg-background/60 px-4 py-3 font-mono text-sm transition-colors focus:border-primary/50 focus:outline-none hud-panel-sm";

    return (
        <div className="mx-auto max-w-3xl animate-fade-in space-y-6 pb-16 pt-4">
            <Link
                href="/startups"
                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
                <ArrowLeft className="h-4 w-4" /> Back to gallery
            </Link>

            <div className="hud-panel border border-primary/30 bg-card/70 p-6 sm:p-8 scanlines">
                <div className="mb-6 flex items-center gap-3 border-b border-border/40 pb-4">
                    <Rocket className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight">Edit startup</h1>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                            Updates appear immediately in the public gallery
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="space-y-4">
                        <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary border-b border-border/30 pb-2">Company</h2>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Company name *</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className={cn(inputClass, "uppercase")} placeholder="Acme Inc." />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Business category *</label>
                            <select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)} className={inputClass}>
                                {STARTUP_BUSINESS_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Year founded *</label>
                            <input
                                value={foundedYear}
                                onChange={(e) => setFoundedYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                className={inputClass}
                                placeholder="2024"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Company overview *</label>
                            <textarea
                                value={companyOverview}
                                onChange={(e) => setCompanyOverview(e.target.value)}
                                rows={4}
                                className={cn(inputClass, "resize-none")}
                                placeholder="Product, customers, stage…"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Founder story *</label>
                            <textarea
                                value={founderStory}
                                onChange={(e) => setFounderStory(e.target.value)}
                                rows={6}
                                className={cn(inputClass, "resize-none")}
                                placeholder="Tell the CODE community your story…"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Founding team (public names) *</label>
                            <input value={founders} onChange={(e) => setFounders(e.target.value)} className={inputClass} placeholder="Names as they should appear publicly" />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary border-b border-border/30 pb-2">Links & brand</h2>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Company website</label>
                            <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://…" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Instagram</label>
                            <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} className={inputClass} placeholder="@handle or full profile URL" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Company LinkedIn</label>
                            <input value={linkedinCompanyUrl} onChange={(e) => setLinkedinCompanyUrl(e.target.value)} className={inputClass} placeholder="company/your-company or full URL" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Company logo (optional)</label>
                            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogo} />
                            <button
                                type="button"
                                onClick={() => logoRef.current?.click()}
                                className={cn(
                                    "flex w-full cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 transition-colors hud-corners",
                                    logo || logoPreview ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card/40 hover:border-primary/50"
                                )}
                            >
                                {logoPreview ? (
                                    <img src={logoPreview} alt="" className="h-20 w-20 border border-primary/30 object-contain" />
                                ) : (
                                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                                )}
                                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                    {logo ? "Tap to replace image" : "PNG, JPG, or WebP"}
                                </span>
                            </button>
                        </div>
                    </section>

                    {error && <p className="text-xs font-mono text-destructive">{error}</p>}

                    <button
                        type="submit"
                        disabled={sending}
                        className="flex w-full items-center justify-center gap-2 border border-primary bg-primary py-3 font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50 hud-panel glow-border-strong"
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {sending ? "Saving…" : "Save changes"}
                    </button>
                </form>
            </div>
        </div>
    );
}
