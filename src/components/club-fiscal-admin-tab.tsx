"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useOrgSettings } from "@/hooks/useFirestore";
import { isAdmin } from "@/lib/roles";
import {
    defaultOrgFiscalSettings,
    fiscalLabelFromOrgSettings,
    normalizeYearTwoDigit,
    type FiscalTerm,
    type OrgSettingsData,
} from "@/lib/org-fiscal";
import { CalendarClock, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export function ClubFiscalAdminTab() {
    const { profile } = useAuth();
    const core = isAdmin(profile?.role);
    const { data, loading, error, saveOrgSettings } = useOrgSettings(core);

    const [term, setTerm] = useState<FiscalTerm>("spring");
    const [yearInput, setYearInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        const base = data
            ? { fiscalTerm: data.fiscalTerm, fiscalYearTwoDigit: data.fiscalYearTwoDigit }
            : defaultOrgFiscalSettings();
        setTerm(base.fiscalTerm);
        setYearInput(base.fiscalYearTwoDigit);
    }, [data]);

    if (!core) return null;

    const preview = fiscalLabelFromOrgSettings({
        fiscalTerm: term,
        fiscalYearTwoDigit: normalizeYearTwoDigit(yearInput),
    });

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        try {
            const payload: OrgSettingsData = {
                fiscalTerm: term,
                fiscalYearTwoDigit: normalizeYearTwoDigit(yearInput),
            };
            await saveOrgSettings(payload);
            setMsg("Saved.");
        } catch (e) {
            console.error(e);
            setMsg("Save failed. Check permissions and try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="hud-panel bg-card/60 border border-primary/40 p-6 sm:p-8 scanlines relative">
            <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
            <h3 className="font-bold text-lg mb-2 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                <CalendarClock className="w-5 h-5" /> CLUB FISCAL TERM
            </h3>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-6 relative z-10 max-w-xl leading-relaxed">
                Sets the global label shown on the dashboard and applied automatically when budgets are saved or exported (e.g.{" "}
                <span className="text-primary">S26</span> = Spring &apos;26, <span className="text-primary">F26</span> = Fall &apos;26).
            </p>

            {error && (
                <p className="text-xs font-mono text-destructive mb-4 relative z-10">
                    Firestore: {error}
                </p>
            )}

            {loading ? (
                <div className="flex items-center gap-3 py-12 relative z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Loading settings…</span>
                </div>
            ) : (
                <div className="space-y-6 relative z-10">
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Term</span>
                        {(["spring", "fall"] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTerm(t)}
                                className={cn(
                                    "px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border transition-colors",
                                    term === t
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border/50 bg-background/40 hover:border-primary/40"
                                )}
                            >
                                {t === "spring" ? "Spring (S)" : "Fall (F)"}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-1.5 max-w-xs">
                        <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest ml-1">
                            Year (2 digits)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={yearInput}
                            onChange={(e) => setYearInput(e.target.value)}
                            placeholder="26"
                            className="w-full px-4 py-3 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono tabular-nums focus:outline-none"
                        />
                        <p className="text-[9px] font-mono text-muted-foreground">You can type 26 or 2026 — only the last two digits are stored.</p>
                    </div>

                    <div className="hud-panel-sm border border-primary/30 bg-primary/5 px-4 py-3 inline-block">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mr-2">Preview</span>
                        <span className="text-lg font-black font-mono text-primary tabular-nums">{preview}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleSave()}
                            className="hud-panel bg-primary text-primary-foreground px-8 py-3.5 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-3"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? "Saving…" : "Save club fiscal"}
                        </button>
                        {msg && <span className="text-[10px] font-mono text-muted-foreground">{msg}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
