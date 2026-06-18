"use client";

import Image from "next/image";
import { useState } from "react";
import { HERO_GALLERY_BUSINESSES, type HeroGalleryBusiness } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function GalleryLogo({ biz }: { biz: HeroGalleryBusiness }) {
  const [logoFailed, setLogoFailed] = useState(false);

  if (logoFailed) {
    return (
      <div className="hero-gallery__logo-fallback">{biz.fallbackInitials}</div>
    );
  }

  return (
    <Image
      src={biz.logo}
      alt={`${biz.name} logo`}
      width={140}
      height={56}
      className="hero-gallery__logo-img object-contain"
      unoptimized
      onError={() => setLogoFailed(true)}
    />
  );
}

export function HeroBusinessGallery() {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  return (
    <div className="hero-gallery grid grid-cols-5 grid-rows-5 h-full w-full gap-0">
      {HERO_GALLERY_BUSINESSES.map((biz) => (
        <div key={biz.id} className="hero-gallery__cell group relative overflow-hidden">
          <Image
            src={biz.image}
            alt={biz.name}
            fill
            sizes="20vw"
            className={cn(
              "hero-gallery__photo object-cover",
              loaded[biz.id] && "hero-gallery__photo--loaded"
            )}
            unoptimized
            onLoad={() => setLoaded((prev) => ({ ...prev, [biz.id]: true }))}
          />
          <div className="hero-gallery__logo absolute inset-0 flex items-center justify-center z-10 pointer-events-none p-3">
            <div className="hero-gallery__logo-wrap">
              <GalleryLogo biz={biz} />
            </div>
          </div>
          <div className="hero-gallery__name absolute bottom-0 left-0 right-0 z-20 px-2 py-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <p className="text-white text-[10px] sm:text-xs font-semibold truncate">{biz.name}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
