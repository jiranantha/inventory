"use client";

import { BOTH_NUMBERS_REGISTRATION_TYPE, UNIVERSITY_REGISTRATION_TYPE, getRegistrationType } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateOption } from "@/lib/i18n";
import type { AssetListRow } from "@/types";

// Shared by the /list and /audit desktop tables: registration type shown as an
// icon + number color instead of a separate column (icon shapes from Lucide:
// graduation-cap, building-2).
const ACTIVITY_NUMBER_COLOR = "#044377";
const UNIVERSITY_NUMBER_COLOR = "#92400E";

function GraduationCapIcon({ label }: { label: string }) {
  return (
    <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </svg>
  );
}

function BuildingIcon({ label }: { label: string }) {
  return (
    <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={label}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}

export function TypedAssetNumber({ asset }: { asset: AssetListRow }) {
  const { lang } = useLanguage();
  const registrationType = getRegistrationType(asset);
  const activityLabel = translateOption("กิจกรรมนักศึกษา", lang);
  const universityLabel = translateOption("มหาวิทยาลัย", lang);
  const activityLine = (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: ACTIVITY_NUMBER_COLOR }}>
      <GraduationCapIcon label={activityLabel} />
      {asset.assetNumber?.trim() || "-"}
    </span>
  );
  const universityLine = (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: UNIVERSITY_NUMBER_COLOR }}>
      <BuildingIcon label={universityLabel} />
      {asset.universityAssetNumber?.trim() || "-"}
    </span>
  );
  const title = translateOption(registrationType, lang);

  if (registrationType === BOTH_NUMBERS_REGISTRATION_TYPE) {
    return (
      <div className="flex flex-col gap-0.5" title={title}>
        {activityLine}
        {universityLine}
      </div>
    );
  }
  return <div title={title}>{registrationType === UNIVERSITY_REGISTRATION_TYPE ? universityLine : activityLine}</div>;
}

// Min width for a desktop-table asset-name cell: roughly half the name's visible
// length (Thai above/below combining marks take no horizontal space), so the
// name wraps to about 2 lines instead of many. Capped so a very long name wraps
// to a 3rd line rather than blowing up the table; it is never clipped.
const THAI_COMBINING_MARKS = /[ัิ-ฺ็-๎]/g;
export function assetNameMinWidth(name: string): string {
  const visibleChars = name.replace(THAI_COMBINING_MARKS, "").length;
  const em = Math.min(28, Math.max(10, Math.ceil(visibleChars / 2) * 0.6 + 0.5));
  return `${em}em`;
}
