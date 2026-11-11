"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AssetListRow } from "@/types";

// Compact per-card photo carousel for the /list mobile cards. Shows one of the
// asset's own photos (asset.assetImages — never inspection evidence); arrows /
// swipe change the photo in this card only, tapping the photo hands off to the
// shared full-screen AssetImageGalleryModal at the same index. Renders nothing
// when the asset has no photo files. White text uses text-[#FFFFFF] because
// globals.css remaps `.asset-shell .text-white` to dark navy.
export function AssetPhotoCarousel({
  asset,
  onOpen,
  className = "",
}: {
  asset: AssetListRow;
  onOpen: (index: number, trigger: HTMLButtonElement) => void;
  className?: string;
}) {
  const { lang } = useLanguage();
  const images = asset.assetImages ?? [];
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) return null;

  const current = images[Math.min(index, images.length - 1)];
  const hasMany = images.length > 1;
  const label = {
    open: (n: number) => (lang === "th" ? `ดูรูปภาพขนาดใหญ่ รูปที่ ${n} จาก ${images.length}: ${asset.assetName}` : `View large image ${n} of ${images.length}: ${asset.assetName}`),
    prev: lang === "th" ? "รูปก่อนหน้า" : "Previous image",
    next: lang === "th" ? "รูปถัดไป" : "Next image",
    failed: lang === "th" ? "โหลดรูปไม่ได้" : "Image unavailable",
  };

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    const endX = event.changedTouches[0]?.clientX;
    if (!hasMany || startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 30) return;
    setIndex((i) => (deltaX < 0 ? Math.min(images.length - 1, i + 1) : Math.max(0, i - 1)));
  };

  const arrowClass =
    "absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFFFFF] disabled:pointer-events-none disabled:opacity-0";

  return (
    <div
      className={`relative aspect-[4/3] shrink-0 overflow-hidden rounded-lg border border-line bg-surfaceSoft touch-pan-y ${className}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={(event) => onOpen(index, event.currentTarget)}
        aria-haspopup="dialog"
        aria-label={label.open(index + 1)}
        className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        {failed.has(index) ? (
          <span className="flex h-full w-full items-center justify-center px-1 text-center text-[11px] font-semibold text-muted">{label.failed}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            src={current.url}
            alt=""
            loading="lazy"
            draggable={false}
            className="h-full w-full select-none object-cover"
            onError={() => setFailed((prev) => new Set(prev).add(index))}
          />
        )}
      </button>
      {hasMany && (
        <>
          <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={index === 0} aria-label={label.prev} className={`${arrowClass} left-1`}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={index === images.length - 1} aria-label={label.next} className={`${arrowClass} right-1`}>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="pointer-events-none absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[#FFFFFF]" aria-live="polite">
            {index + 1} / {images.length}
          </span>
        </>
      )}
    </div>
  );
}
