"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Clock, CalendarRange, Timer } from "lucide-react";

/** 00, 05, … 55 — works with native time strings and stays compact */
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function toHHMM(h: number, m: number): string {
    return `${pad2(((h % 24) + 24) % 24)}:${pad2(((m % 60) + 60) % 60)}`;
}

export function parseHHMM(s: string): { h: number; m: number } | null {
    const match = s?.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const min = parseInt(match[2], 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, m: min };
}

function snapToStep(min: number): number {
    return MINUTE_STEPS.reduce((best, step) =>
        Math.abs(step - min) < Math.abs(best - min) ? step : best
    );
}

export function addMinutesToHHMM(hhmm: string, delta: number): string {
    const p = parseHHMM(hhmm);
    if (!p) return toHHMM(18, 0);
    let minutes = p.h * 60 + p.m + delta;
    minutes = Math.max(0, Math.min(24 * 60 - 1, minutes));
    return toHHMM(Math.floor(minutes / 60), minutes % 60);
}

function format12h(hhmm: string): string {
    const p = parseHHMM(hhmm);
    if (!p) return "—";
    const d = new Date();
    d.setHours(p.h, p.m, 0, 0);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type Props = {
    startTime: string;
    endTime: string;
    onChange: (next: { startTime: string; endTime: string }) => void;
    label?: string;
    className?: string;
};

const PRESET_STARTS: { label: string; h: number; m: number }[] = [
    { label: "9 AM", h: 9, m: 0 },
    { label: "10 AM", h: 10, m: 0 },
    { label: "12 PM", h: 12, m: 0 },
    { label: "3 PM", h: 15, m: 0 },
    { label: "5 PM", h: 17, m: 0 },
    { label: "6 PM", h: 18, m: 0 },
];

const DURATION_MINS = [
    { label: "30m", m: 30 },
    { label: "1h", m: 60 },
    { label: "1½h", m: 90 },
    { label: "2h", m: 120 },
];

function TimeSelectBlock({
    title,
    valueHHMM,
    onCommit,
    accent,
}: {
    title: string;
    valueHHMM: string;
    onCommit: (hhmm: string) => void;
    accent: "start" | "end";
}) {
    const raw = parseHHMM(valueHHMM);
    const p = raw ? { h: raw.h, m: snapToStep(raw.m) } : { h: 18, m: 0 };

    const setHour = (h: number) => {
        onCommit(toHHMM(h, p.m));
    };

    const setMinute = (m: number) => {
        onCommit(toHHMM(p.h, m));
    };

    const hours24 = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

    return (
        <div
            className={cn(
                "rounded-md border p-3 sm:p-4 space-y-3 transition-colors",
                accent === "start"
                    ? "border-primary/35 bg-primary/[0.06]"
                    : "border-chart-2/35 bg-chart-2/[0.06]"
            )}
        >
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                <Timer className={cn("w-3.5 h-3.5", accent === "start" ? "text-primary" : "text-chart-2")} />
                {title}
            </div>
            <div className="flex gap-2 items-stretch">
                <select
                    value={p.h}
                    onChange={(e) => setHour(Number(e.target.value))}
                    className="flex-1 min-w-0 px-2 sm:px-3 py-2.5 hud-panel-sm bg-background/80 border border-border/50 focus:border-primary/50 text-xs sm:text-sm font-mono focus:outline-none cursor-pointer"
                >
                    {hours24.map((h) => {
                        const d = new Date();
                        d.setHours(h, 0, 0, 0);
                        const label = d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
                        return (
                            <option key={h} value={h}>
                                {label}
                            </option>
                        );
                    })}
                </select>
                <span className="flex items-center text-muted-foreground font-mono text-sm select-none">:</span>
                <select
                    value={p.m}
                    onChange={(e) => setMinute(Number(e.target.value))}
                    className="w-[4.25rem] sm:w-[5.5rem] shrink-0 px-2 py-2.5 hud-panel-sm bg-background/80 border border-border/50 focus:border-primary/50 text-xs sm:text-sm font-mono focus:outline-none cursor-pointer"
                >
                    {MINUTE_STEPS.map((m) => (
                        <option key={m} value={m}>
                            {pad2(m)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export function EventTimeSchedule({ startTime, endTime, onChange, label = "Time schedule", className }: Props) {
    const allDay = !startTime.trim() && !endTime.trim();

    const preview =
        startTime.trim() && endTime.trim()
            ? `${format12h(startTime)} – ${format12h(endTime)}`
            : startTime.trim()
              ? `Starts ${format12h(startTime)} — set end time below`
              : allDay
                ? "All day — no fixed hours"
                : "—";

    const applyPresetStart = (h: number, m: number) => {
        const s = toHHMM(h, m);
        onChange({ startTime: s, endTime: addMinutesToHHMM(s, 60) });
    };

    const applyDuration = (mins: number) => {
        const s = startTime.trim() && parseHHMM(startTime) ? startTime : toHHMM(18, 0);
        onChange({ startTime: s, endTime: addMinutesToHHMM(s, mins) });
    };

    const commitStart = (s: string) => {
        const curEnd = endTime.trim();
        let nextEnd = curEnd;
        const ps = parseHHMM(s);
        const pe = parseHHMM(curEnd);
        if (ps && pe) {
            const sMin = ps.h * 60 + ps.m;
            const eMin = pe.h * 60 + pe.m;
            if (eMin <= sMin) nextEnd = addMinutesToHHMM(s, 60);
        } else if (ps && !curEnd) {
            nextEnd = addMinutesToHHMM(s, 60);
        }
        onChange({ startTime: s, endTime: nextEnd });
    };

    return (
        <div className={cn("p-4 hud-corners bg-background/40 border border-border/50 space-y-4", className)}>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                {label}
            </div>

            <div className="flex p-0.5 hud-panel-sm bg-background/60 border border-border/50 rounded-sm">
                <button
                    type="button"
                    onClick={() => onChange({ startTime: "", endTime: "" })}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm",
                        allDay ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(203,247,2,0.25)]" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                >
                    <CalendarRange className="w-3.5 h-3.5 shrink-0" />
                    All day
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (allDay) onChange({ startTime: toHHMM(18, 0), endTime: toHHMM(19, 0) });
                    }}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest transition-all rounded-sm border-l border-border/40",
                        !allDay ? "bg-primary text-primary-foreground shadow-[0_0_12px_rgba(203,247,2,0.25)]" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                >
                    <Timer className="w-3.5 h-3.5 shrink-0" />
                    Set times
                </button>
            </div>

            {!allDay && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <TimeSelectBlock
                            title="Start"
                            valueHHMM={startTime || toHHMM(18, 0)}
                            accent="start"
                            onCommit={commitStart}
                        />
                        <TimeSelectBlock
                            title="End"
                            valueHHMM={
                                endTime.trim()
                                    ? endTime
                                    : addMinutesToHHMM(startTime || toHHMM(18, 0), 60)
                            }
                            accent="end"
                            onCommit={(e) => {
                                const s = startTime.trim() || toHHMM(18, 0);
                                let endVal = e;
                                const sa = parseHHMM(s);
                                const ea = parseHHMM(e);
                                if (sa && ea) {
                                    const sMin = sa.h * 60 + sa.m;
                                    const eMin = ea.h * 60 + ea.m;
                                    if (eMin <= sMin) endVal = addMinutesToHHMM(s, 30);
                                }
                                onChange({ startTime: s, endTime: endVal });
                            }}
                        />
                    </div>

                    <div className="space-y-2">
                        <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Quick start</p>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESET_STARTS.map((pr) => (
                                <button
                                    key={pr.label}
                                    type="button"
                                    onClick={() => applyPresetStart(pr.h, pr.m)}
                                    className="px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest hud-panel-sm border border-border/50 bg-card/40 hover:border-primary/50 hover:text-primary transition-colors"
                                >
                                    {pr.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest">Block length (from start)</p>
                        <div className="flex flex-wrap gap-1.5">
                            {DURATION_MINS.map((d) => (
                                <button
                                    key={d.label}
                                    type="button"
                                    onClick={() => applyDuration(d.m)}
                                    className="px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest hud-panel-sm border border-border/50 bg-card/40 hover:border-chart-2/50 hover:text-chart-2 transition-colors"
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-primary/25 bg-primary/5">
                <div className="w-1 h-8 rounded-full bg-primary/60 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[9px] font-mono font-bold text-primary/80 uppercase tracking-widest">Live preview</p>
                    <p className="text-sm font-mono font-bold text-foreground tracking-tight break-words">{preview}</p>
                </div>
            </div>
        </div>
    );
}
