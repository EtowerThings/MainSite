"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

type StartupGalleryImageProps = {
    src: string | null | undefined;
    alt?: string;
    className?: string;
    fallbackClassName?: string;
    iconClassName?: string;
};

/** Firebase Storage / Google avatar URLs with onError fallback. */
export function StartupGalleryImage({
    src,
    alt = "",
    className,
    fallbackClassName,
    iconClassName,
}: StartupGalleryImageProps) {
    const [failed, setFailed] = useState(false);
    const trimmed = src?.trim();

    if (!trimmed || failed) {
        return (
            <div
                className={cn(
                    "flex items-center justify-center bg-primary/10 text-primary",
                    fallbackClassName ?? className
                )}
            >
                <Rocket className={cn("h-8 w-8 opacity-90", iconClassName)} />
            </div>
        );
    }

    return (
        <img
            src={trimmed}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className={className}
        />
    );
}
