"use client";

import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { EtowerNav } from "@/components/etower-nav";
import { EtowerFooter } from "@/components/etower-footer";
import { FadeIn } from "@/components/fade-in";
import { FEATURED_STARTUPS, HERO_GALLERY_BUSINESSES } from "@/lib/demo-data";

export default function StartupsPage() {
  return (
    <div className="etower-page min-h-screen">
      <EtowerNav />
      <main className="pt-8 pb-0">
        <section className="py-16 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <p className="etower-section-label mb-3">Featured Startups</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0A111F] tracking-tight">
                Ventures from our community
              </h1>
              <p className="mt-4 text-[#64748b] max-w-2xl leading-relaxed">
                Discover innovative companies founded by eTower residents and alumni.
              </p>
            </FadeIn>

            <div className="mt-14 grid md:grid-cols-3 gap-8">
              {FEATURED_STARTUPS.map((s, i) => (
                <FadeIn key={s.id} delay={i * 100}>
                  <article className="etower-startup-card p-8 flex flex-col h-full">
                    <div className="w-16 h-16 rounded-2xl etower-gradient flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg">
                      {s.initial}
                    </div>
                    <span className="etower-startup-badge w-fit mb-3">{s.category}</span>
                    <h2 className="text-xl font-bold text-[#0A111F]">{s.name}</h2>
                    <p className="mt-3 text-sm text-[#64748b] flex-1 leading-relaxed">{s.overview}</p>
                    <p className="mt-5 text-sm border-t border-[#0A111F]/8 pt-5">
                      <span className="font-semibold text-[#0A111F]">Founded by</span>{" "}
                      <span className="text-[#64748b]">{s.founder}</span>
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5aad4a]">
                      Visit
                      <ExternalLink className="w-3.5 h-3.5" />
                    </span>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 bg-[#f8faf9]">
          <div className="max-w-6xl mx-auto">
            <FadeIn>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0A111F]">All community ventures</h2>
              <p className="mt-3 text-[#64748b]">Startups built by current and former eTower residents.</p>
            </FadeIn>
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {HERO_GALLERY_BUSINESSES.map((biz, i) => (
                <FadeIn key={biz.id} delay={i * 30}>
                  <div className="etower-card p-4 text-center">
                    <div className="h-12 flex items-center justify-center mb-3">
                      <Image
                        src={biz.logo}
                        alt={biz.name}
                        width={80}
                        height={32}
                        className="max-h-10 w-auto object-contain"
                        unoptimized
                      />
                    </div>
                    <p className="text-xs font-semibold text-[#0A111F] leading-snug">{biz.name}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      </main>
      <EtowerFooter />
    </div>
  );
}
