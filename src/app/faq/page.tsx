"use client";

import { useState } from "react";
import { useFAQ } from "@/hooks/useFirestore";
import {
    HelpCircle,
    Search,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicNav } from "@/components/public-nav";
import { useOptionalAuth } from "@/contexts/auth-context";
import Link from "next/link";

export default function FAQPage() {
    const { user } = useOptionalAuth();
    const { data: faqs, loading } = useFAQ();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filteredFAQs = faqs.filter((faq) => {
        if (searchQuery && !faq.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Grid Background */}
            <div className="pointer-events-none fixed inset-0 grid-bg opacity-30" />
            <div className="pointer-events-none fixed bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] bg-primary/10" />

            <PublicNav alwaysVisible />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
                {/* Header */}
                <div className="text-center mb-10 sm:mb-14 animate-fade-in">
                    <div className="w-16 h-16 hud-panel-alt bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-6 relative animate-float">
                        <div className="absolute inset-0 glow-border opacity-50" />
                        <HelpCircle className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase mb-4">
                        COMMUNITY <span className="gradient-text-cyber">FAQ</span>
                    </h1>
                    <div className="hud-panel-sm border border-border/50 bg-card/60 px-6 py-3 scanlines mx-auto max-w-lg">
                        <p className="relative z-10 text-muted-foreground text-sm font-mono tracking-wider">
                            <span className="text-primary font-bold">&gt;</span> Querying knowledge base for common inquiries regarding CODE operations.
                        </p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-6 sm:mb-8 max-w-2xl mx-auto animate-slide-up">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
                    <input type="text" placeholder="SEARCH FAQ..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3.5 hud-panel bg-card/80 border border-primary/30 focus:border-primary/70 text-sm font-mono uppercase tracking-widest transition-colors focus:outline-none glow-border" />
                    {searchQuery && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] font-mono text-primary animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" /> SEARCHING
                        </div>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs font-mono text-primary tracking-widest uppercase animate-pulse">Accessing Data...</span>
                    </div>
                )}

                {/* FAQ Accordion */}
                {!loading && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {filteredFAQs.map((faq, i) => (
                            <div key={faq.id} className={cn("bg-card/60 border border-border/50 overflow-hidden card-hover transition-all hover:border-primary/50 scanlines", i % 2 === 0 ? "hud-panel-sm" : "hud-corners")}>
                                <button onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)} className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 relative z-10">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="text-[10px] font-mono text-primary/60 uppercase tracking-widest mt-1 sm:mt-0 flex-shrink-0">SYS_Q_0{i + 1}</div>
                                        <h3 className="font-bold text-sm uppercase tracking-tight leading-relaxed">{faq.question}</h3>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 border border-primary/20">
                                        {expandedId === faq.id ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </div>
                                </button>
                                {expandedId === faq.id && (
                                    <div className="px-4 sm:px-5 pb-5 sm:pb-6 relative z-10">
                                        <div className="pl-[88px] pr-4 pt-4 border-t border-border/40">
                                            <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                                                <span className="text-primary mr-2">&gt;</span>{faq.answer}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredFAQs.length === 0 && (
                    <div className="text-center py-20 hud-panel bg-card/40 border border-border/50 max-w-2xl mx-auto scanlines">
                        <HelpCircle className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4 relative z-10" />
                        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase relative z-10">NO ENTRIES FOUND MATCHING QUERY PARAMETERS.</p>
                    </div>
                )}

                {/* Ask a Question CTA */}
                <div className="mt-12 sm:mt-16 max-w-2xl mx-auto text-center p-8 hud-panel-alt bg-card/80 border border-primary/30 scanlines noise relative animate-border-pulse">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                    <MessageSquare className="w-8 h-8 text-primary mx-auto mb-4 relative z-10" />
                    <h3 className="font-black text-xl sm:text-2xl mb-2 uppercase tracking-tight relative z-10">Unresolved Query?</h3>
                    <p className="text-xs font-mono text-muted-foreground mb-6 uppercase tracking-wider relative z-10">Submit a direct inquiry to the E-Board.</p>

                    <Link href={user ? "/dashboard" : "/login"} className="inline-flex hud-panel-sm bg-primary text-primary-foreground px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all glow-border-strong relative z-10">
                        OPEN COMM CHANNEL
                    </Link>
                </div>
            </div>
        </div>
    );
}
