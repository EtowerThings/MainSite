"use client";

import { ArrowRight, Coffee, Megaphone, Shirt } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { ETOWER_OUTLETS } from "@/lib/demo-data";

export function EtowerOutletsSection() {
  const { sectionTitle, clothing, megaphone, cafe } = ETOWER_OUTLETS;

  return (
    <section id="outlets" className="py-24 px-4 sm:px-6 bg-white scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14">
            <p className="etower-section-label mb-3">{sectionTitle}</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0A111F]">
              Spaces built for founders
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          <FadeIn delay={0}>
            <article className="etower-outlet-card etower-outlet-card--soon h-full flex flex-col">
              <div className="etower-outlet-card__icon">
                <Shirt className="w-6 h-6" />
              </div>
              <p className="etower-outlet-card__status">{clothing.status}</p>
              <h3 className="mt-3 text-lg font-bold text-[#0A111F] tracking-wide">
                {clothing.title}
              </h3>
              <p className="mt-3 text-sm text-[#64748b] flex-1">
                Official eTower apparel — launching soon for residents and alumni.
              </p>
            </article>
          </FadeIn>

          <FadeIn delay={80}>
            <article className="etower-outlet-card h-full flex flex-col">
              <div className="etower-outlet-card__icon">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#0A111F] tracking-wide">{megaphone.title}</h3>
              <p className="mt-4 text-sm text-[#64748b] leading-relaxed flex-1">
                {megaphone.description}
              </p>
              <a
                href={megaphone.href}
                className="etower-btn etower-btn--primary mt-6 w-full sm:w-auto text-sm px-6 py-3"
              >
                {megaphone.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </article>
          </FadeIn>

          <FadeIn delay={160}>
            <article className="etower-outlet-card h-full flex flex-col">
              <div className="etower-outlet-card__icon">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#0A111F] lowercase first-letter:uppercase">
                {cafe.title}
              </h3>
              <p className="mt-4 text-sm text-[#64748b] leading-relaxed flex-1">
                {cafe.description}
              </p>
              <a
                href={cafe.href}
                className="etower-btn etower-btn--outline mt-6 w-full sm:w-auto text-sm px-6 py-3"
              >
                {cafe.cta}
                <ArrowRight className="w-4 h-4" />
              </a>
            </article>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
