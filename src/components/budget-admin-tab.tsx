"use client";

import { useState, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useBudgets, useOrgSettings, type BudgetItem, type BudgetLineRow } from "@/hooks/useFirestore";
import { fiscalLabelFromOrgSettings } from "@/lib/org-fiscal";
import { parseBudgetSpreadsheet, parseLegacyBudgetSpreadsheet, type BudgetRowInput } from "@/lib/budget-import";
import { exportBudgetXlsx, parseBudgetXlsxBuffer } from "@/lib/budget-xlsx";
import { cn } from "@/lib/utils";
import { Loader2, Plus, Trash2, Upload, Download, Save, FileSpreadsheet, ExternalLink } from "lucide-react";

function emptyRow(): BudgetLineRow {
    return { item: "", price: 0, quantity: 1, notes: "", link: "" };
}

function inputsToRows(rows: BudgetRowInput[]): BudgetLineRow[] {
    return rows.map((r) => ({
        item: r.item,
        price: r.price,
        quantity: Math.max(0, r.quantity) || 1,
        notes: r.notes,
        link: r.link,
    }));
}

function lineTotal(r: BudgetLineRow): number {
    const p = Number(r.price) || 0;
    const q = Number(r.quantity) || 0;
    return p * q;
}

function formatUsd(n: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
}

/** Safe href for user-entered URLs (clickable in UI). */
function hrefForLink(raw: string): string | null {
    const t = raw.trim();
    if (!t) return null;
    if (/^(https?:|mailto:)/i.test(t)) return t;
    return `https://${t.replace(/^\/+/, "")}`;
}

/** Short label for a clickable link (hostname or “Email”). */
function linkClickLabel(raw: string): string {
    const t = raw.trim();
    if (!t) return "";
    if (/^mailto:/i.test(t)) return t.replace(/^mailto:/i, "").split("?")[0] || "Email link";
    const h = hrefForLink(t);
    if (!h) return t.length > 48 ? `${t.slice(0, 45)}…` : t;
    try {
        const u = new URL(h);
        const host = u.hostname.replace(/^www\./, "");
        if (u.pathname.length > 1) {
            const p = u.pathname + u.search;
            return p.length > 28 ? `${host}${p.slice(0, 25)}…` : `${host}${p}`;
        }
        return host;
    } catch {
        return t.length > 48 ? `${t.slice(0, 45)}…` : t;
    }
}

export function BudgetAdminTab() {
    const { user, profile, loading: authLoading } = useAuth();
    const budgetsEnabled = !!user?.uid;
    const { data: budgets, loading: budgetsLoading, error, createBudget, updateBudget, deleteBudget } =
        useBudgets(budgetsEnabled);
    const { data: orgSettings, loading: orgLoading, error: orgSettingsError } = useOrgSettings(budgetsEnabled);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fiscalLabel = useMemo(
        () =>
            fiscalLabelFromOrgSettings(
                orgSettings
                    ? { fiscalTerm: orgSettings.fiscalTerm, fiscalYearTwoDigit: orgSettings.fiscalYearTwoDigit }
                    : null
            ),
        [orgSettings]
    );

    const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
    const [title, setTitle] = useState("");
    const [expectedAttendees, setExpectedAttendees] = useState(0);
    const [rows, setRows] = useState<BudgetLineRow[]>([emptyRow()]);
    const [saving, setSaving] = useState(false);
    const [importMsg, setImportMsg] = useState<string | null>(null);

    const loadBudgetIntoEditor = (b: BudgetItem | null) => {
        if (!b) {
            setTitle("");
            setExpectedAttendees(0);
            setRows([emptyRow()]);
            return;
        }
        setTitle(b.title);
        setExpectedAttendees(b.expectedAttendees ?? 0);
        setRows(b.rows.length > 0 ? b.rows.map((r) => ({ ...r })) : [emptyRow()]);
    };

    const startNew = () => {
        setSelectedId("new");
        loadBudgetIntoEditor(null);
        setImportMsg(null);
    };

    const openBudget = (id: string) => {
        setSelectedId(id);
        const b = budgets.find((x) => x.id === id);
        if (b) loadBudgetIntoEditor(b);
        setImportMsg(null);
    };

    let totalCost = 0;
    for (const r of rows) {
        totalCost += lineTotal(r);
    }
    const attendeesNum = Math.max(0, Math.floor(expectedAttendees) || 0);
    const costPerAttendee = attendeesNum > 0 ? totalCost / attendeesNum : null;

    const handleSave = async () => {
        if (!user?.uid || !profile) return;
        const cleanRows = rows.filter(
            (r) =>
                r.item.trim() ||
                r.price !== 0 ||
                r.quantity !== 0 ||
                r.notes.trim() ||
                r.link.trim()
        );
        const toSave = cleanRows.length > 0 ? cleanRows : [emptyRow()];
        setSaving(true);
        setImportMsg(null);
        try {
            if (selectedId === "new") {
                await createBudget({
                    title: title.trim() || "Untitled budget",
                    fiscalYear: fiscalLabel,
                    expectedAttendees: attendeesNum,
                    rows: toSave,
                    uid: user.uid,
                    displayName: profile.displayName || "Member",
                });
                setSelectedId(null);
                loadBudgetIntoEditor(null);
            } else if (selectedId) {
                await updateBudget(selectedId, {
                    title: title.trim() || "Untitled budget",
                    fiscalYear: fiscalLabel,
                    expectedAttendees: attendeesNum,
                    rows: toSave,
                });
            }
        } catch (e) {
            console.error(e);
            setImportMsg("Save failed. Check permissions and try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedId || selectedId === "new") return;
        if (!confirm("Delete this budget permanently?")) return;
        setSaving(true);
        try {
            await deleteBudget(selectedId);
            setSelectedId(null);
            loadBudgetIntoEditor(null);
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;

        const isXlsx = /\.xlsx?$/i.test(f.name);
        if (isXlsx) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const buf = reader.result;
                    if (!(buf instanceof ArrayBuffer)) {
                        setImportMsg("Could not read spreadsheet file.");
                        return;
                    }
                    const { rows: parsed, expectedAttendees: exp } = parseBudgetXlsxBuffer(buf);
                    if (parsed.length === 0) {
                        setImportMsg("No line rows found in sheet. Include headers: Item, Price, Quantity, Notes, Link.");
                        return;
                    }
                    setRows(parsed);
                    if (exp > 0) setExpectedAttendees(exp);
                    setImportMsg(`Imported ${parsed.length} row(s) from ${f.name}.`);
                } catch (err) {
                    console.error(err);
                    setImportMsg("Could not parse .xlsx file.");
                }
            };
            reader.readAsArrayBuffer(f);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || "");
            try {
                const legacy = parseLegacyBudgetSpreadsheet(text);
                const parsed = legacy ?? parseBudgetSpreadsheet(text);
                if (parsed.length === 0) {
                    setImportMsg("No data rows found. Use headers: Item, Price, Quantity, Notes, Link.");
                    return;
                }
                setRows(inputsToRows(parsed));
                setImportMsg(`Imported ${parsed.length} row(s).`);
            } catch (err) {
                console.error(err);
                setImportMsg("Could not parse file. Try CSV or .xlsx export.");
            }
        };
        reader.readAsText(f);
    };

    const exportXlsx = async () => {
        try {
            await exportBudgetXlsx(
                {
                    title: title.trim() || "Budget",
                    fiscalYear: fiscalLabel,
                    expectedAttendees: attendeesNum,
                },
                rows,
                title.trim() || "budget"
            );
        } catch (err) {
            console.error(err);
            setImportMsg("Export failed. Try again.");
        }
    };

    const updateRow = (i: number, patch: Partial<BudgetLineRow>) => {
        setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
    };

    const addRow = () => setRows((prev) => [...prev, emptyRow()]);
    const removeRow = (i: number) => setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));

    if (authLoading || (budgetsEnabled && (budgetsLoading || orgLoading))) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Loading budgets…
                </span>
            </div>
        );
    }

    if (error) {
        const isPermission =
            error.toLowerCase().includes("permission") || error.toLowerCase().includes("insufficient");
        return (
            <div className="hud-panel border border-destructive/40 bg-destructive/5 p-6 space-y-3">
                <p className="text-sm font-mono text-destructive font-bold uppercase tracking-tight">
                    Firestore: {error}
                </p>
                {isPermission && (
                    <div className="text-xs font-mono text-muted-foreground space-y-2 leading-relaxed border-l-2 border-destructive/30 pl-3">
                        <p>
                            Localhost still talks to your real Firebase project. If the <code className="text-foreground">budgets</code> rules are
                            not published in that project, every listener gets permission-denied (this is not a Next.js or CORS bug).
                        </p>
                        <p className="text-foreground/90">
                            Fix: Firebase Console → Firestore → Rules → paste the contents of{" "}
                            <code className="text-primary">firestore.rules</code> from this repo (including the{" "}
                            <code className="text-primary">match /budgets</code> block) → Publish.
                        </p>
                        <p>
                            Or from the repo root (after <code className="text-foreground">firebase login</code> and{" "}
                            <code className="text-foreground">firebase use &lt;your-project-id&gt;</code>):{" "}
                            <code className="text-primary whitespace-nowrap">firebase deploy --only firestore:rules</code>
                        </p>
                        <p className="text-[10px] uppercase tracking-widest">
                            Confirm <code className="normal-case text-foreground">NEXT_PUBLIC_FIREBASE_PROJECT_ID</code> matches the project where
                            you published rules.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="hud-panel bg-card/60 border border-primary/40 p-6 scanlines relative">
                <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-r from-transparent to-primary/50" />
                <h3 className="font-bold text-lg mb-2 flex items-center gap-3 uppercase tracking-tight relative z-10 text-primary border-b border-primary/20 pb-4">
                    <FileSpreadsheet className="w-5 h-5" /> BUDGET WORKSPACE
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 relative z-10">
                    Columns: Item, Price, Quantity, Notes, Link. Total cost = Σ (price × quantity). Export downloads an .xlsx with summary fields and
                    line items.
                </p>

                {orgSettingsError && (
                    <div className="relative z-10 mb-4 rounded-sm border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] font-mono text-amber-200/90 leading-relaxed">
                        {orgSettingsError}
                    </div>
                )}

                <div className="flex flex-wrap gap-2 relative z-10 mb-4">
                    <button
                        type="button"
                        onClick={startNew}
                        className="hud-panel-sm px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" /> New budget
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.xlsx,.xls,text/csv,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={handleFile}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="hud-panel-sm px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-border/50 hover:border-primary/50 flex items-center gap-2"
                    >
                        <Upload className="w-3.5 h-3.5" /> Import CSV / Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => void exportXlsx()}
                        className="hud-panel-sm px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border border-border/50 hover:border-primary/50 flex items-center gap-2"
                    >
                        <Download className="w-3.5 h-3.5" /> Export .xlsx
                    </button>
                </div>

                {budgets.length > 0 && (
                    <div className="relative z-10 mb-6">
                        <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-2">
                            Saved budgets
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {budgets.map((b) => (
                                <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => openBudget(b.id)}
                                    className={cn(
                                        "px-3 py-1.5 text-[10px] font-mono uppercase tracking-tight border transition-colors",
                                        selectedId === b.id
                                            ? "border-primary bg-primary/15 text-primary"
                                            : "border-border/50 bg-background/40 hover:border-primary/40"
                                    )}
                                >
                                    {b.title}
                                    {b.fiscalYear ? ` · ${b.fiscalYear}` : ""}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {importMsg && (
                    <p className="text-[10px] font-mono text-muted-foreground mb-3 relative z-10">{importMsg}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10 mb-4">
                    <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                            Title
                        </label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Spring social"
                            className="w-full px-3 py-2 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                            Fiscal term (club-wide)
                        </label>
                        <div className="w-full px-3 py-2 hud-panel-sm bg-background/40 border border-border/50 text-sm font-mono font-bold text-primary tabular-nums">
                            {fiscalLabel}
                        </div>
                        <p className="text-[9px] font-mono text-muted-foreground/90 mt-1 leading-snug">
                            Applied on save and export. Core admins set this under Admin → CLUB FISCAL.
                        </p>
                    </div>
                    <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                            Expected attendees
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={Number.isFinite(expectedAttendees) ? expectedAttendees : 0}
                            onChange={(e) => setExpectedAttendees(parseInt(e.target.value, 10) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono focus:outline-none tabular-nums"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto custom-scroll relative z-10 border border-border/40 rounded-sm">
                    <table className="w-full text-left text-[11px] font-mono min-w-[960px] table-fixed">
                        <thead>
                            <tr className="border-b-2 border-primary/40 text-[9px] uppercase tracking-widest bg-primary/10">
                                <th className="py-2.5 px-3 w-[18%] text-left font-bold text-primary">Item</th>
                                <th className="py-2.5 px-2 w-[11%] text-right font-bold text-chart-1">Price</th>
                                <th className="py-2.5 px-2 w-[8%] text-right font-bold text-chart-3">Qty</th>
                                <th className="py-2.5 px-2 w-[12%] text-right font-bold text-chart-1">Line total</th>
                                <th className="py-2.5 px-2 w-[22%] font-bold text-foreground/90">Notes</th>
                                <th className="py-2.5 px-2 w-[24%] font-bold text-chart-2">Link</th>
                                <th className="py-2.5 px-1 w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => {
                                const lt = lineTotal(r);
                                const href = hrefForLink(r.link);
                                return (
                                    <tr
                                        key={i}
                                        className={cn(
                                            "border-b border-border/30 transition-colors hover:bg-primary/5",
                                            i % 2 === 0 ? "bg-card/30" : "bg-background/20"
                                        )}
                                    >
                                        <td className="p-1.5 align-top w-[18%]">
                                            <input
                                                value={r.item}
                                                onChange={(e) => updateRow(i, { item: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-transparent border border-transparent focus:border-primary/50 focus:outline-none font-semibold text-foreground"
                                            />
                                        </td>
                                        <td className="p-1.5 align-top">
                                            <div className="relative flex items-center">
                                                <span className="absolute left-1.5 text-chart-1 font-bold text-xs pointer-events-none select-none">
                                                    $
                                                </span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    value={Number.isFinite(r.price) ? r.price : 0}
                                                    onChange={(e) => updateRow(i, { price: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-5 pr-1 py-1.5 text-right bg-transparent border border-transparent focus:border-chart-1/50 focus:outline-none tabular-nums font-medium text-chart-1"
                                                />
                                            </div>
                                            <p className="text-[9px] text-right text-muted-foreground/90 tabular-nums pr-1 mt-0.5">
                                                {formatUsd(Number(r.price) || 0)}
                                            </p>
                                        </td>
                                        <td className="p-1.5 align-top">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={Number.isFinite(r.quantity) ? r.quantity : 0}
                                                onChange={(e) =>
                                                    updateRow(i, { quantity: Math.max(0, parseInt(e.target.value, 10) || 0) })
                                                }
                                                className="w-full px-2 py-1.5 text-right bg-transparent border border-transparent focus:border-chart-3/50 focus:outline-none tabular-nums font-semibold text-chart-3"
                                            />
                                        </td>
                                        <td className="p-1.5 align-top text-right tabular-nums pt-2.5 px-2 font-bold text-chart-1 text-sm">
                                            {formatUsd(lt)}
                                        </td>
                                        <td className="p-1.5 align-top">
                                            <input
                                                value={r.notes}
                                                onChange={(e) => updateRow(i, { notes: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-transparent border border-transparent focus:border-border focus:outline-none text-muted-foreground"
                                            />
                                        </td>
                                        <td className="p-1.5 align-top">
                                            <input
                                                value={r.link}
                                                onChange={(e) => updateRow(i, { link: e.target.value })}
                                                placeholder="https://…"
                                                className="w-full px-2 py-1 mb-1 bg-background/40 border border-border/40 rounded-sm focus:border-chart-2/50 focus:outline-none text-[10px]"
                                            />
                                            {href ? (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title={r.link.trim()}
                                                    className="inline-flex items-center gap-1 max-w-full text-[10px] font-semibold text-chart-2 underline underline-offset-2 decoration-chart-2/60 hover:text-primary hover:decoration-primary break-all"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-chart-2" />
                                                    <span className="truncate">{linkClickLabel(r.link)}</span>
                                                </a>
                                            ) : (
                                                <span className="text-[9px] text-muted-foreground/70">—</span>
                                            )}
                                        </td>
                                        <td className="p-1 text-center align-top">
                                            <button
                                                type="button"
                                                onClick={() => removeRow(i)}
                                                className="p-1.5 text-muted-foreground hover:text-destructive"
                                                title="Remove row"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4 mt-4 relative z-10">
                    <button
                        type="button"
                        onClick={addRow}
                        className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary hover:underline flex items-center gap-1"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add row
                    </button>
                    <div className="text-[10px] font-mono uppercase tracking-tight space-y-2 text-right rounded-sm border border-chart-1/30 bg-chart-1/5 px-4 py-3">
                        <div>
                            <span className="text-muted-foreground font-bold">Total cost </span>
                            <span className="text-chart-1 font-black text-base tabular-nums">{formatUsd(totalCost)}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground font-bold">Cost per attendee </span>
                            <span className="text-chart-1 font-bold tabular-nums">
                                {costPerAttendee != null ? formatUsd(costPerAttendee) : "—"}
                            </span>
                            {attendeesNum === 0 && (
                                <span className="normal-case text-[9px] text-muted-foreground/80 ml-1 font-normal">(set expected attendees)</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6 relative z-10 pt-4 border-t border-border/40">
                    <button
                        type="button"
                        disabled={saving || selectedId === null}
                        onClick={handleSave}
                        className="hud-panel bg-primary text-primary-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {selectedId === "new" ? "Create budget" : selectedId ? "Save changes" : "Save"}
                    </button>
                    {selectedId && selectedId !== "new" && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleDelete}
                            className="hud-panel-sm px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
                {selectedId === null && (
                    <p className="text-[9px] font-mono text-muted-foreground mt-2 relative z-10">
                        Choose a saved budget above or start a new one to enable saving.
                    </p>
                )}
            </div>
        </div>
    );
}
