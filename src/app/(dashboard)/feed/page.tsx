"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { canPostAnnouncement } from "@/lib/roles";
import { useFeed } from "@/hooks/useFirestore";
import {
    Activity,
    Pin,
    Rocket,
    BookOpen,
    CheckCircle2,
    UserPlus,
    Clock,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkifyText } from "@/components/linkify-text";

const typeIcons: Record<string, { icon: React.ReactNode; color: string; border: string }> = {
    milestone_update: { icon: <Rocket className="w-4 h-4" />, color: "text-primary bg-primary/10", border: "border-primary/30" },
    resource_upload: { icon: <BookOpen className="w-4 h-4" />, color: "text-chart-2 bg-chart-2/10", border: "border-chart-2/30" },
    project_complete: { icon: <CheckCircle2 className="w-4 h-4" />, color: "text-success bg-success/10", border: "border-success/30" },
    member_join: { icon: <UserPlus className="w-4 h-4" />, color: "text-warning bg-warning/10", border: "border-warning/30" },
};

export default function FeedPage() {
    const { profile } = useAuth();
    const { data: activities, loading, togglePin } = useFeed();
    const [filter, setFilter] = useState<"all" | "pinned">("all");
    const isEBoard = canPostAnnouncement(profile?.role);

    const filteredActivities = filter === "pinned"
        ? activities.filter((a) => a.pinned)
        : activities;

    return (
        <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-fade-in relative z-10 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-border/50 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        FEED
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">
                        NETWORK <span className="gradient-text-cyber">ACTIVITY LOG</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "px-5 py-2.5 hud-panel-sm text-xs font-mono font-bold uppercase tracking-widest transition-all border",
                            filter === "all"
                                ? "bg-primary text-primary-foreground border-primary glow-border"
                                : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:border-border"
                        )}
                    >
                        GLOBAL
                    </button>
                    <button
                        onClick={() => setFilter("pinned")}
                        className={cn(
                            "px-5 py-2.5 hud-panel-sm text-xs font-mono font-bold uppercase tracking-widest transition-all border flex items-center gap-2",
                            filter === "pinned"
                                ? "bg-primary text-primary-foreground border-primary glow-border"
                                : "bg-card/40 border-border/40 text-muted-foreground hover:bg-accent hover:border-border"
                        )}
                    >
                        <Pin className="w-3.5 h-3.5" />
                        PINNED
                    </button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-mono text-primary uppercase tracking-widest animate-pulse">SYNCING ACTIVITY DATA...</span>
                </div>
            )}

            {/* Feed */}
            {!loading && (
                <div className="flex-1 space-y-4">
                    {filteredActivities.map((activity, i) => {
                        const typeInfo = typeIcons[activity.type] || typeIcons.milestone_update;
                        return (
                            <div
                                key={activity.id}
                                className={cn(
                                    "bg-card/60 border p-5 sm:p-6 transition-all relative overflow-hidden group scanlines",
                                    i % 2 === 0 ? 'hud-panel-sm' : 'hud-corners',
                                    activity.pinned ? "border-primary/50 bg-primary/5 glow-border" : "border-border/40 hover:border-primary/30"
                                )}
                            >
                                {activity.pinned && (
                                    <>
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-primary/20 rounded-bl-[16px] pointer-events-none z-10" />
                                        <div className="absolute top-2 right-2 z-20">
                                            <Pin className="w-4 h-4 text-primary fill-primary animate-pulse" />
                                        </div>
                                    </>
                                )}
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className={cn("w-12 h-12 hud-corners flex flex-col items-center justify-center flex-shrink-0 border", typeInfo.color, typeInfo.border)}>
                                        {typeInfo.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold font-mono uppercase bg-background px-2 py-0.5 border border-border/50 text-foreground">{activity.actorName}</span>
                                            <div className="w-1.5 h-1.5 bg-border rotate-45" />
                                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {activity.createdAt}
                                            </span>
                                        </div>
                                        <p className="text-sm font-mono leading-relaxed mt-2 text-muted-foreground">
                                            <span className="text-primary/50 mr-2">&gt;</span>
                                            <LinkifyText>{activity.description}</LinkifyText>
                                            {activity.targetName && (
                                                <span className="font-bold text-foreground ml-1 uppercase">[{activity.targetName}]</span>
                                            )}
                                        </p>
                                    </div>
                                    {isEBoard && (
                                        <button
                                            onClick={() => togglePin(activity.id, activity.pinned, profile?.uid || "")}
                                            className={cn(
                                                "p-2.5 hud-panel-sm border transition-all flex-shrink-0 group/btn mt-1 mr-2",
                                                activity.pinned
                                                    ? "bg-primary text-primary-foreground border-primary hover:brightness-110"
                                                    : "bg-background/50 border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50"
                                            )}
                                            title={activity.pinned ? "Unpin" : "Pin"}
                                        >
                                            <Pin className={cn("w-4 h-4", activity.pinned ? "" : "group-hover/btn:rotate-12 transition-transform")} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredActivities.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 hud-panel bg-card/40 border border-border/40 scanlines">
                            <Activity className="w-16 h-16 text-muted-foreground/30 mb-4" />
                            <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest text-center max-w-sm leading-relaxed relative z-10">
                                {filter === "pinned" ? "NO PINNED POSTS FOUND." : "NO ACTIVITY RECORDED."}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
