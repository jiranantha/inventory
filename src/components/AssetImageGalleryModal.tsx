"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AssetListRow } from "@/types";

// Read-only gallery of one asset's own photos (asset.assetImages — never
// inspection evidence). Opened from the /list image-count badge (desktop) and
// the mobile card photo (AssetPhotoCarousel), optionally at a given image.
export function AssetImageGalleryModal({
  asset,
  initialIndex = 0,
  onClose,
}: {
  asset: AssetListRow;
  initialIndex?: number;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const images = asset.assetImages ?? [];
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
  const [failed, setFailed] = useState<Set<number>>(() => new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const titleId = `asset-gallery-title-${asset.id}`;

  const hasMany = images.length > 1;
  const canPrev = index > 0;
  const canNext = index < images.length - 1;
  const current = images[index];

  const label = {
    close: lang === "th" ? "ปิดหน้าต่างรูปภาพ" : "Close image gallery",
    prev: lang === "th" ? "รูปก่อนหน้า" : "Previous image",
    next: lang === "th" ? "รูปถัดไป" : "Next image",
    noImages: lang === "th" ? "ไม่พบไฟล์รูปภาพของครุภัณฑ์นี้" : "No image files found for this asset",
    failed: lang === "th" ? "ไม่สามารถโหลดรูปภาพนี้ได้" : "This image could not be loaded",
    thumb: (n: number) => (lang === "th" ? `ดูรูปที่ ${n}` : `View image ${n}`),
    alt: (n: number) => (lang === "th" ? `รูปภาพครุภัณฑ์ ${asset.assetName} รูปที่ ${n} จาก ${images.length}` : `${asset.assetName} — image ${n} of ${images.length}`),
  };

  // Lock background scroll and focus the close button while open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key === "ArrowRight") {
        setIndex((i) => Math.min(images.length - 1, i + 1));
      } else if (event.key === "Tab" && dialogRef.current) {
        // Keep keyboard focus inside the dialog.
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [images.length, onClose]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    const endX = event.changedTouches[0]?.clientX;
    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) return;
    setIndex((i) => (deltaX < 0 ? Math.min(images.length - 1, i + 1) : Math.max(0, i - 1)));
  };

  const navButtonClass =
    "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-30";

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90dvh] w-full max-w-[900px] flex-col overflow-hidden rounded-xl bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="break-words text-base font-bold leading-snug text-ink">{asset.assetName}</h2>
            {hasMany && (
              <p className="mt-0.5 text-xs font-semibold text-muted" aria-live="polite">
                {index + 1} / {images.length}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={label.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line text-ink transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div
          className="relative flex min-h-[220px] flex-1 items-center justify-center bg-[#011628] touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {!current ? (
            <p className="px-6 py-16 text-center text-sm font-semibold text-white/80">{label.noImages}</p>
          ) : failed.has(index) ? (
            <p className="px-6 py-16 text-center text-sm font-semibold text-white/80">{label.failed}</p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.url}
              src={current.url}
              alt={label.alt(index + 1)}
              className="max-h-[calc(90dvh-10rem)] w-full select-none object-contain"
              draggable={false}
              onError={() => setFailed((prev) => new Set(prev).add(index))}
            />
          )}
          {hasMany && (
            <>
              <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={!canPrev} aria-label={label.prev} className={`${navButtonClass} left-2`}>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={!canNext} aria-label={label.next} className={`${navButtonClass} right-2`}>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M7.5 4.5 13 10l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>

        {hasMany && (
          <div className="flex gap-2 overflow-x-auto border-t border-line px-3 py-2.5">
            {images.map((image, i) => (
              <button
                key={`${image.url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={label.thumb(i + 1)}
                aria-current={i === index ? "true" : undefined}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 bg-surfaceSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {failed.has(i) ? (
                  <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted">!</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                    onError={() => setFailed((prev) => new Set(prev).add(i))}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
