"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Instagram,
  Users,
  Lightbulb,
  Network,
  TrendingUp,
} from "lucide-react";
import { EtowerColumnIntro } from "@/components/etower-column-intro";
import { EtowerNav } from "@/components/etower-nav";
import { EtowerFooter } from "@/components/etower-footer";
import { HeroBusinessGallery } from "@/components/hero-business-gallery";
import { EtowerOutletsSection } from "@/components/etower-outlets-section";
import { FadeIn } from "@/components/fade-in";
import { cn } from "@/lib/utils";
import {
  ETOWER,
  IMPACT_METRICS,
  TESTIMONIALS,
  JOIN_PILLARS,
  SOCIAL_POSTS,
} from "@/lib/demo-data";

const PILLAR_ICONS = [Users, Lightbulb, Network, TrendingUp];
const MARQUEE_ITEMS = [
  "250+ Alumni Network",
  "$3B+ in Valuations",
  "100+ Startups Founded",
  "21 Active Residents",
  "Est. 2001",
  "Babson College",
];

export default function LandingPage() {
  const [introDone, setIntroDone] = useState(false);
  const handleIntroComplete = useCallback(() => {
    setIntroDone(true);
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const featuredQuote = TESTIMONIALS[0];
  const gridQuotes = TESTIMONIALS.slice(1);

  return (
    <div className={cn("etower-page min-h-screen", introDone && "etower-page--ready")}>
      {!introDone && <EtowerColumnIntro onComplete={handleIntroComplete} />}

      <div className={cn("etower-page__main", introDone && "etower-page__main--visible")}>
        <EtowerNav />

        {/* Hero — 5×5 business gallery only */}
        <section id="top" className="etower-hero-gallery-wrap relative scroll-mt-0">
          <HeroBusinessGallery />
        </section>

        {/* Marquee */}
        <div className="etower-marquee" aria-hidden>
          <div className="etower-marquee__track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i}>
                <strong>·</strong> {item}
              </span>
            ))}
          </div>
        </div>

        {/* Our Impact — dark section */}
        <section id="impact" className="etower-impact py-24 px-4 sm:px-6 scroll-mt-20">
          <div className="relative max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-16 max-w-3xl mx-auto">
                <p className="text-sm font-semibold uppercase tracking-widest text-[#b6e36e] mb-3">
                  Our Impact
                </p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                  Billions in value across industries
                </h2>
                <p className="mt-4 text-white/60 leading-relaxed">
                  eTower has built one of the most successful entrepreneurship communities in
                  Boston, with alumni creating lasting impact worldwide.
                </p>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {IMPACT_METRICS.map((m, i) => (
                <FadeIn key={m.label} delay={i * 80}>
                  <div className="etower-impact-card h-full">
                    <div className="etower-stat-value">{m.value}</div>
                    <h3 className="mt-4 font-bold text-white">{m.label}</h3>
                    <p className="mt-2 text-sm text-white/55">{m.description}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* eTower Outlets */}
        <EtowerOutletsSection />

        {/* Testimonials */}
        <section className="py-24 px-4 sm:px-6 bg-[#f8faf9]">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="etower-section-label mb-3">What Our Community Says</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0A111F]">
                  Hear from residents and alumni
                </h2>
              </div>
            </FadeIn>

            <FadeIn delay={100}>
              <blockquote className="etower-testimonial-featured mb-8 relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full etower-gradient flex items-center justify-center text-white font-bold">
                    {featuredQuote.initials}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{featuredQuote.name}</p>
                    <p className="text-sm text-white/60">{featuredQuote.role}</p>
                    <p className="text-sm text-[#b6e36e] font-medium">{featuredQuote.company}</p>
                  </div>
                </div>
                <p className="text-lg sm:text-xl leading-relaxed text-white/90 max-w-3xl relative z-10">
                  &ldquo;{featuredQuote.quote}&rdquo;
                </p>
              </blockquote>
            </FadeIn>

            <div className="grid md:grid-cols-3 gap-6">
              {gridQuotes.map((t, i) => (
                <FadeIn key={t.name} delay={150 + i * 80}>
                  <blockquote className="etower-card p-6 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-full etower-gradient flex items-center justify-center text-white font-bold text-xs">
                        {t.initials}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0A111F]">{t.name}</p>
                        <p className="text-xs text-[#64748b]">{t.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-[#64748b] leading-relaxed line-clamp-4">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </blockquote>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Instagram */}
        <section className="py-24 px-4 sm:px-6 bg-[#f8faf9]">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="text-center mb-14">
                <p className="etower-section-label mb-3">Follow Our Journey</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0A111F]">
                  Stay connected on Instagram
                </h2>
              </div>
            </FadeIn>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {SOCIAL_POSTS.map((post, i) => (
                <FadeIn key={i} delay={i * 70}>
                  <div className="etower-social-card etower-card relative">
                    <div className="etower-social-card__img relative">
                      <Image src="/etower-logo.png" alt="" width={48} height={48} className="opacity-25" />
                      <div className="etower-social-card__overlay">
                        <p className="text-white text-xs line-clamp-2">{post.caption}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-[#64748b] line-clamp-2">{post.caption}</p>
                      <p className="mt-2 text-xs text-[#94a3b8]">
                        {post.likes} likes · {post.comments} comments
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn delay={200}>
              <div className="text-center mt-10">
                <a
                  href={ETOWER.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 etower-btn etower-btn--primary px-8 py-3 text-sm"
                >
                  <Instagram className="w-4 h-4" />
                  Follow {ETOWER.instagram}
                </a>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Join */}
        <section id="join" className="py-24 px-4 sm:px-6 scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                {JOIN_PILLARS.map((pillar, i) => {
                  const Icon = PILLAR_ICONS[i];
                  return (
                    <div key={pillar.title} className="etower-card p-6 text-center group">
                      <div className="w-12 h-12 rounded-xl etower-gradient flex items-center justify-center text-white mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-[#0A111F]">{pillar.title}</h3>
                      <p className="mt-2 text-sm text-[#64748b]">{pillar.description}</p>
                    </div>
                  );
                })}
              </div>
            </FadeIn>

            <FadeIn delay={150}>
              <div className="etower-cta-banner">
                <div className="relative z-10">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                    Ready to Join eTower?
                  </h2>
                  <p className="mt-4 text-white/70 max-w-xl mx-auto">
                    Take the next step in your entrepreneurial journey. Applications are reviewed
                    on a rolling basis — early applications encouraged.
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <a href="#contact" className="etower-btn etower-btn--primary px-8 py-3.5 text-sm">
                      Learn More
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href={ETOWER.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="etower-btn etower-btn--outline border-white/30 text-white bg-white/10 hover:bg-white/20 hover:border-white/50 px-8 py-3.5 text-sm"
                    >
                      Follow on Instagram
                    </a>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        <div id="residents" className="scroll-mt-20" />
        <div id="alumni" className="scroll-mt-20" />

        <EtowerFooter />
      </div>
    </div>
  );
}
