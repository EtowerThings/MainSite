"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useResources } from "@/hooks/useFirestore";
import { Search, Filter, Plus, FileText, Video, Link as LinkIcon, BookOpen, AlertCircle, ChevronDown, Check, Upload, X, Eye, Calendar, Sparkles, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const typeIcons: Record<string, React.ReactNode> = {
    guide: <FileText className="w-5 h-5" />,
    tutorial: <BookOpen className="w-5 h-5" />,
    video: <Video className="w-5 h-5" />,
    document: <FileText className="w-5 h-5" />,
    link: <LinkIcon className="w-5 h-5" />,
};

export default function ResourcesPage() {
    const { profile } = useAuth();
    const { data: resources, loading, createResource } = useResources(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [tierFilter, setTierFilter] = useState("all");
    const [phaseFilter, setPhaseFilter] = useState("all");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newResource, setNewResource] = useState({ title: "", description: "", phase: "beginner", type: "guide", tier: "community", topics: "", fileUrl: "" });

    const filteredResources = resources.filter((r) => {
        if (tierFilter !== "all" && r.tier !== tierFilter) return false;
        if (phaseFilter !== "all" && r.phase !== phaseFilter) return false;
        if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const handleUpload = async () => {
        if (!newResource.title.trim()) return;
        await createResource({
            title: newResource.title,
            description: newResource.description,
            phase: newResource.phase,
            type: newResource.type,
            tier: newResource.tier,
            topics: newResource.topics ? newResource.topics.split(",").map((t) => t.trim()).filter(Boolean) : [],
            fileUrl: newResource.fileUrl,
            uploadedBy: profile?.displayName || "Unknown",
            uploadedById: profile?.uid || "",
        });
        setNewResource({ title: "", description: "", phase: "beginner", type: "guide", tier: "community", topics: "", fileUrl: "" });
        setShowUploadModal(false);
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-5 border-b border-border/50">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        RESOURCES
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase relative group">
                        KNOWLEDGE <span className="gradient-text-cyber">BASE</span>
                        <span className="absolute -top-1 -right-4 text-[10px] text-primary/50 font-mono hidden md:inline animate-pulse">v2.0</span>
                    </h1>
                </div>
                {profile?.role !== "alumni" && profile?.residency !== "alumni" && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="hud-panel-sm bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border-strong flex items-center gap-2 group"
                    >
                        <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                        UPLOAD DATA
                    </button>
                )}
            </div>

            {/* Search & Filters */}
            <div className="space-y-4">
                <div className="relative hud-corners bg-card/60 border border-border/40 p-1">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                        type="text"
                        placeholder="QUERY ARCHIVE..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-transparent text-sm font-mono uppercase tracking-wide focus:outline-none placeholder:text-muted-foreground/50 transition-colors"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground hidden sm:block">
                        HIT ENTER
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center bg-card/40 p-3 border border-border/30 hud-panel-sm">
                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scroll pb-1 sm:pb-0">
                        {["all", "official", "community"].map((tier) => (
                            <button
                                key={tier}
                                onClick={() => setTierFilter(tier)}
                                className={cn(
                                    "px-4 py-1.5 hud-panel-sm text-[10px] font-mono font-bold capitalize transition-all whitespace-nowrap border",
                                    tierFilter === tier
                                        ? "bg-primary text-primary-foreground border-primary glow-border"
                                        : "bg-background/50 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                {tier === "all" ? "GLOBAL ARCHIVE" : tier === "official" ? "E-BOARD VERIFIED" : "COMMUNITY"}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-border/50 hidden sm:block" />

                    <div className="flex gap-2 w-full sm:w-auto overflow-x-auto custom-scroll pb-1 sm:pb-0">
                        {["all", "beginner", "intermediate", "advanced"].map((phase) => (
                            <button
                                key={phase}
                                onClick={() => setPhaseFilter(phase)}
                                className={cn(
                                    "px-4 py-1.5 hud-panel-sm text-[10px] font-mono font-bold capitalize transition-all whitespace-nowrap border",
                                    phaseFilter === phase
                                        ? "bg-primary text-primary-foreground border-primary glow-border"
                                        : "bg-background/50 border-border/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                            >
                                {phase === "all" ? "ALL SECTORS" : phase}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-xs font-mono text-primary uppercase tracking-widest animate-pulse">LOADING...</span>
                </div>
            )}

            {/* Grid */}
            {!loading && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredResources.map((resource, i) => (
                        <div key={resource.id} className={cn("group bg-card/60 border p-5 transition-all hover:border-primary/50 relative flex flex-col scanlines", i % 2 === 0 ? 'hud-panel' : 'hud-corners', resource.tier === "official" ? "border-primary/40 bg-primary/5" : "border-border/40")}>
                            {resource.tier === "official" && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/20 to-transparent pointer-events-none z-10" />
                            )}

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className={cn("w-12 h-12 hud-corners flex flex-col items-center justify-center border", resource.tier === "official" ? "bg-primary/10 border-primary/50 text-primary" : "bg-card border-border/50 text-muted-foreground")}>
                                    {typeIcons[resource.type] || typeIcons.guide}
                                </div>
                                <span className={cn("text-[10px] px-3 py-1 hud-panel-sm font-mono font-bold uppercase tracking-widest border", resource.tier === "official" ? "bg-primary border-primary text-primary-foreground glow-border shadow-[0_0_10px_rgba(203,247,2,0.5)]" : "bg-background/60 border-border/50 text-muted-foreground")}>
                                    {resource.tier === "official" ? "VERIFIED" : "USR_GEN"}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-2 uppercase tracking-tight group-hover:text-primary transition-colors relative z-10 line-clamp-1">{resource.title}</h3>
                            <p className="text-sm font-mono text-muted-foreground mb-4 line-clamp-2 leading-relaxed flex-1 relative z-10">
                                <span className="text-primary/50 mr-2">&gt;</span>{resource.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-5 relative z-10 p-2 bg-background/50 border border-border/40">
                                <span className={cn("text-[9px] px-2 py-0.5 border font-mono font-bold uppercase tracking-widest", resource.phase === "beginner" ? "bg-success/10 border-success/30 text-success" : resource.phase === "intermediate" ? "bg-warning/10 border-warning/30 text-warning" : "bg-destructive/10 border-destructive/30 text-destructive")}>
                                    Lvl: {resource.phase}
                                </span>
                                {resource.topics.slice(0, 3).map((topic) => (
                                    <span key={topic} className="text-[9px] px-2 py-0.5 border border-border/50 bg-card font-mono text-muted-foreground uppercase">{topic}</span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground relative z-10 pt-3 border-t border-border/40">
                                <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {resource.views} QUERIES</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {resource.date}</span>
                            </div>

                            {resource.fileUrl && (
                                <Link
                                    href={resource.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 flex items-center justify-center gap-2 p-3 hud-panel bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:brightness-110 hover:shadow-[0_0_15px_rgba(203,247,2,0.5)] transition-all z-20 group/btn"
                                >
                                    {resource.type === 'link' ? <LinkIcon className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                    <span className="group-hover/btn:animate-pulse">
                                        {resource.type === 'link' ? "OPEN EXTERNAL LINK" : "DOWNLOAD DATA"}
                                    </span>
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredResources.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 hud-panel bg-card/40 border border-border/40 scanlines">
                    <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4 relative z-10" />
                    <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest relative z-10 text-center max-w-sm leading-relaxed">
                        NO RESULTS FOUND.
                    </p>
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
                    <div className="hud-panel bg-card border border-primary/40 max-w-xl w-full p-6 scanlines noise relative glow-border animate-fade-in" onClick={(e) => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20" />

                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50 relative z-30">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Share a resource</span>
                                </div>
                                <h3 className="font-black text-xl uppercase tracking-tight flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-primary" /> Upload to the library
                                </h3>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hud-panel-sm border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors bg-background/50"><X className="w-4 h-4" /></button>
                        </div>

                        <div className="space-y-5 relative z-10">
                            <div className="p-4 hud-corners bg-background/40 border border-border/50 space-y-4">
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Title <span className="text-primary">*</span></label>
                                    <input type="text" value={newResource.title} onChange={(e) => setNewResource({ ...newResource, title: e.target.value })} placeholder="e.g. Intro to React" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Description</label>
                                    <textarea rows={3} value={newResource.description} onChange={(e) => setNewResource({ ...newResource, description: e.target.value })} placeholder="Enter file summary..." className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none resize-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Difficulty</label>
                                    <select value={newResource.phase} onChange={(e) => setNewResource({ ...newResource, phase: e.target.value })} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none">
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                    <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Type</label>
                                    <select value={newResource.type} onChange={(e) => setNewResource({ ...newResource, type: e.target.value })} className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono transition-colors focus:outline-none">
                                        <option value="guide">Guide</option>
                                        <option value="tutorial">Tutorial</option>
                                        <option value="video">Video</option>
                                        <option value="document">Document</option>
                                        <option value="link">External link</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 hud-corners bg-background/40 border border-border/50">
                                <label className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                                    TAGS <span className="opacity-50">(CSV)</span>
                                </label>
                                <input type="text" value={newResource.topics} onChange={(e) => setNewResource({ ...newResource, topics: e.target.value })} placeholder="e.g. REACT, TYPESCRIPT" className="w-full px-4 py-2.5 hud-panel-sm bg-background/60 border border-border/50 focus:border-primary/50 text-sm font-mono uppercase transition-colors focus:outline-none" />
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!newResource.title.trim()}
                                className="w-full mt-2 py-3.5 hud-panel bg-primary text-primary-foreground text-xs font-mono font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Upload className="w-4 h-4" /> Submit for review
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
