"use client";

import {
    Trophy,
    ExternalLink,
    GitBranch,
    Code2,
    Users,
    Calendar,
    X,
    Play,
    Loader2,
    Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PublicNav } from "@/components/public-nav";
import { useProjects } from "@/hooks/useFirestore";

export default function HallOfFamePage() {
    const { data: allProjects, loading } = useProjects();
    const [selectedProject, setSelectedProject] = useState<string | null>(null);

    // Only show completed projects on Hall of Fame
    const projects = allProjects.filter((p) => p.status === "complete");
    const featuredProject = projects[0]; // first completed project is featured
    const selectedProjectData = projects.find((p) => p.id === selectedProject);

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Grid Background */}
            <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />
            <div className="pointer-events-none fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] bg-primary/10" />

            <PublicNav alwaysVisible />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
                {/* Header */}
                <div className="text-center mb-12 sm:mb-16 animate-fade-in">
                    <div className="inline-flex items-center gap-2 hud-panel-sm bg-background/50 border border-primary/30 text-primary px-4 py-1.5 text-xs font-mono tracking-widest uppercase mb-6 shadow-sm">
                        <Database className="w-3.5 h-3.5" />
                        CODE Project Archive
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase">
                        Hall Of <span className="gradient-text-cyber animate-flicker">Fame</span>
                    </h1>
                    <div className="mt-6 flex justify-center">
                        <div className="hud-panel border border-border/50 bg-card/60 px-6 py-3 scanlines">
                            <p className="relative z-10 text-muted-foreground text-sm font-mono tracking-wider">
                                <span className="text-primary font-bold">&gt;</span> Accessing successful deployments and completed club projects.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-mono text-primary tracking-widest uppercase animate-pulse">Loading Projects...</span>
                    </div>
                )}

                {!loading && projects.length === 0 && (
                    <div className="text-center py-20 hud-panel bg-card/40 border border-border/50 max-w-2xl mx-auto scanlines">
                        <Trophy className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4 relative z-10" />
                        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase relative z-10">No completed projects found in archive. Pending deployments.</p>
                    </div>
                )}

                {!loading && featuredProject && (
                    <>
                        {/* Featured Project */}
                        <div className="mb-10 sm:mb-16 hud-panel bg-card/70 border border-primary/30 overflow-hidden card-hover cursor-pointer glow-border animate-border-pulse scanlines" onClick={() => setSelectedProject(featuredProject.id)}>
                            <div className="grid md:grid-cols-2 gap-0 relative z-10">
                                <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center border-b md:border-b-0 md:border-r border-border/40">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-mono text-primary uppercase tracking-widest">SYS_PRIME // FEATURED</span>
                                    </div>
                                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-3 tracking-tight uppercase">{featuredProject.name}</h2>
                                    <p className="text-muted-foreground text-sm font-mono leading-relaxed mb-6">{featuredProject.description}</p>
                                    <div className="flex flex-wrap gap-3 mt-auto">
                                        <button className="hud-panel-sm bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border">Extract Data</button>
                                        {featuredProject.liveUrl && (
                                            <a href={featuredProject.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 hud-corners bg-background/50 text-xs font-bold uppercase tracking-widest border border-border/60 hover:border-primary/50 hover:text-primary transition-all">
                                                <Play className="w-3.5 h-3.5" /> Execute
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="hidden md:flex bg-gradient-to-br from-primary/10 to-transparent items-center justify-center p-10 relative overflow-hidden">
                                    <div className="absolute inset-0 noise" />
                                    <div className="w-40 h-40 hud-panel-alt bg-primary/20 border border-primary/40 flex items-center justify-center relative z-10 animate-float">
                                        <div className="absolute inset-0 glow-border opacity-50" />
                                        <Code2 className="w-16 h-16 text-primary" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {projects.filter((p) => p.id !== featuredProject.id).map((project, i) => (
                                <div key={project.id} className={cn("group relative bg-card/60 border border-border/40 overflow-hidden card-hover cursor-pointer transition-all hover:border-primary/50 hover:bg-card/90 scanlines", i % 2 === 0 ? "hud-panel" : "hud-panel-alt")} onClick={() => setSelectedProject(project.id)}>
                                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-primary/20 border-l-[20px] border-l-transparent group-hover:border-t-primary/50 transition-colors z-20" />
                                    <div className="h-32 sm:h-40 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center border-b border-border/40 relative z-10">
                                        <div className="w-14 h-14 hud-panel-sm bg-primary/20 border border-primary/30 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <Code2 className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="p-5 relative z-10">
                                        <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                            <Database className="w-3 h-3" />
                                            {project.id.slice(0, 8)}
                                        </div>
                                        <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors tracking-tight uppercase line-clamp-1">{project.name}</h3>
                                        <p className="text-xs text-muted-foreground font-mono line-clamp-2 mb-4">{project.description}</p>
                                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-t border-border/40 pt-3">
                                            <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {project.teamMembers.length} UNITS</span>
                                            <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {project.createdAt}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Case Study Modal */}
            {selectedProjectData && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
                    <div className="hud-panel bg-card border border-primary/30 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl scanlines noise relative glow-border" onClick={(e) => e.stopPropagation()}>
                        {/* Decorative top border */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent z-20" />

                        <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50 p-5 flex items-start justify-between z-20">
                            <div className="min-w-0 pr-4">
                                <div className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    ARCHIVE DATA EXTRACTED
                                </div>
                                <h2 className="font-black text-xl sm:text-2xl truncate uppercase tracking-tight">{selectedProjectData.name}</h2>
                                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">LOGGED: {selectedProjectData.createdAt} // PERSONNEL: {selectedProjectData.teamMembers.length}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-2 hud-panel-sm bg-accent border border-border/50 hover:border-primary/50 hover:text-primary transition-colors flex-shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 relative z-10 space-y-6">
                            <div className="hud-corners bg-background/50 border border-border/50 p-4">
                                <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mb-2 border-b border-border/50 pb-1">MISSION SUMMARY</div>
                                <p className="text-sm text-foreground font-mono leading-relaxed">{selectedProjectData.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {selectedProjectData.liveUrl && (
                                    <a href={selectedProjectData.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hud-panel-sm bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border">
                                        <ExternalLink className="w-3.5 h-3.5" /> EXECUTE LIVE
                                    </a>
                                )}
                                {selectedProjectData.githubUrl && (
                                    <a href={selectedProjectData.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 hud-panel-sm bg-background/50 text-xs font-bold uppercase tracking-widest border border-border/60 hover:border-primary/50 hover:text-primary transition-all">
                                        <GitBranch className="w-3.5 h-3.5" /> SOURCE CODE
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
