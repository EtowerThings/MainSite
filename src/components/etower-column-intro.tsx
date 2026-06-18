"use client";

import { useEffect, useState } from "react";
import { INTRO_COLUMN_DIRECTIONS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const COLUMN_COUNT = INTRO_COLUMN_DIRECTIONS.length;
const ENTER_MS = 900;
const HOLD_MS = 1100;
const STAGGER_MS = 55;
const EXIT_MS = 1100;
const FADE_MS = 400;

type EtowerColumnIntroProps = {
  onComplete: () => void;
};

function IntroGraphicStrip() {
  return (
    <div className="etower-intro__strip-inner flex h-full w-full items-center justify-center bg-white">
      <div className="etower-intro__content flex flex-col items-center gap-5 sm:gap-8 px-4">
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          <div className="etower-intro__icon-mark shrink-0">
            <span className="text-white font-bold text-[clamp(2.5rem,8vw,5.5rem)] leading-none">
              e
            </span>
          </div>
          <span className="etower-intro__wordmark whitespace-nowrap">
            e<span className="text-[#5aad4a]">Tower</span>
          </span>
        </div>
        <p className="etower-intro__tagline text-center whitespace-nowrap">
          Entrepreneurs · Live · Learn · Launch
        </p>
      </div>
    </div>
  );
}

export function EtowerColumnIntro({ onComplete }: EtowerColumnIntroProps) {
  const [entered, setEntered] = useState(false);
  const [separating, setSeparating] = useState(false);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.classList.add("etower-intro-active");
    return () => document.body.classList.remove("etower-intro-active");
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      onComplete();
      setDone(true);
      return;
    }

    const enterTimer = setTimeout(() => setEntered(true), 50);
    const separateTimer = setTimeout(() => setSeparating(true), ENTER_MS + HOLD_MS);
    const fadeTimer = setTimeout(
      () => setFading(true),
      ENTER_MS + HOLD_MS + EXIT_MS + STAGGER_MS * (COLUMN_COUNT - 1)
    );
    const doneTimer = setTimeout(() => {
      setDone(true);
      onComplete();
    }, ENTER_MS + HOLD_MS + EXIT_MS + STAGGER_MS * (COLUMN_COUNT - 1) + FADE_MS);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(separateTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (done) return null;

  return (
    <div
      className={cn(
        "etower-intro fixed inset-0 z-[200] overflow-hidden pointer-events-none",
        entered && "etower-intro--entered",
        fading && "etower-intro--fading"
      )}
      aria-hidden={separating}
    >
      <div className="relative h-full w-full">
        {INTRO_COLUMN_DIRECTIONS.map((direction, i) => (
          <div
            key={i}
            className={cn(
              "etower-intro__col absolute top-0 bottom-0 overflow-hidden bg-white",
              separating &&
                (direction === "up"
                  ? "etower-intro__col-exit-up"
                  : "etower-intro__col-exit-down")
            )}
            style={{
              left: `${i * 12.5}%`,
              width: "12.5%",
              animationDelay: separating ? `${i * STAGGER_MS}ms` : undefined,
            }}
          >
            <div
              className="absolute top-0 h-full"
              style={{
                width: `${COLUMN_COUNT * 100}%`,
                left: `${-i * 100}%`,
              }}
            >
              <IntroGraphicStrip />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
