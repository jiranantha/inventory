"use client";

import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, Suspense, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AssetNumberCell, FilterChip, InspectionResultBadge, MultiSelectFilter, PageHeader, RegistrationTypeBadge, SearchableMultiSelectFilter, StatusBadge, getRegistrationType } from "@/components/ui";
import { AssetImageGalleryModal } from "@/components/AssetImageGalleryModal";
import { AssetPhotoCarousel } from "@/components/AssetPhotoCarousel";
import { TypedAssetNumber, assetNameMinWidth } from "@/components/TypedAssetNumber";
import { assetPdfReportColumns, assetReportExportColumns, assetToPdfReportRow, assetToReportRow } from "@/lib/assets";
import { exportAssetReport } from "@/lib/import-export";
import { Permissions } from "@/lib/permissions";
import { chartColors, dashboardCardColors } from "@/constants/colors";
import { countBy, uniqueSorted } from "@/lib/utils";
import { AnnualInspection, AssetListRow } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateOption } from "@/lib/i18n";
import { ASSET_STATUS_FILTER_OPTIONS } from "@/constants/statuses";
import { registrationTypeOptions } from "@/constants/options";

// Pie-slice palette for the committee-only status chart on /list — same fixed
// blue palette the overview/dashboard page's status pie chart already uses,
// kept local here since the dashboard doesn't export it.
const COMMITTEE_PIE_COLORS = ["#044377", "#508ABA", "#9CD1FC", "#C3E3FD", "#032D50", "#B0DADF", "#E1F1FE", "#011628"];

// Desktop /list table action button: 32px square, 16px Lucide-style icon
// (children are the SVG paths), with a tooltip shown on hover and keyboard focus.
// Colors use explicit hex classes: globals.css remaps `.asset-shell .text-white`
// to dark navy (!important), so `text-white` would render navy here.
// Mobile /list card action button: 16px icon on top, 12px label below, filling
// its grid cell. Same hex-color rule as ActionIconButton (no `text-white`).
function MobileActionButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[52px] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-xs font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${className}`}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function ActionIconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${className}`}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {children}
        </svg>
      </button>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-[7px] -translate-x-1/2 whitespace-nowrap rounded-md border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1 text-xs font-medium leading-4 text-[#032D50] opacity-0 shadow-[0_2px_8px_rgba(3,45,80,0.12)] transition-opacity group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function parseMultiParam(param: string | null): string[] {
  if (!param) return [];
  return param.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildAssetPdfFileName(selectedYears: string[]) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const yearPart = selectedYears.length === 1 ? `_${selectedYears[0]}` : "";
  return `รายงานครุภัณฑ์ทั้งหมด${yearPart}_${dateStr}.pdf`;
}

function ListPage({
  assets,
  annualInspections,
  permissions,
  onAddAsset,
  onViewDetails,
  onEditAsset,
  onDeleteAsset,
  currentUserRole,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  permissions: Permissions;
  onAddAsset: () => void;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
  currentUserRole: string;
}) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inspectedAssetIds = useMemo(
    () => new Set(annualInspections.map((inspection) => inspection.assetId)),
    [annualInspections],
  );
  const fiscalYearOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.fiscalYear)).sort((a, b) => Number(b) - Number(a))];
  const organizationOptions = [
    "ทั้งหมด",
    ...uniqueSorted(assets.map((a) => a.organization)).filter(
      (name) => name !== "-" && name !== "สภานักศึกษา มหาวิทยาลัยเชียงใหม่"
    ),
  ];
  const registrationTypeFilterOptions = ["ทั้งหมด", ...registrationTypeOptions];

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [selectedYears, setSelectedYears] = useState<string[]>(() => parseMultiParam(searchParams.get("years")));
  const [selectedUnits, setSelectedUnits] = useState<string[]>(() => parseMultiParam(searchParams.get("units")));
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() => parseMultiParam(searchParams.get("statuses")));
  const [selectedRegTypes, setSelectedRegTypes] = useState<string[]>(() => parseMultiParam(searchParams.get("regTypes")));
  const [page, setPage] = useState(1);

  const pushFilters = useCallback((f: {
    search: string;
    years: string[];
    units: string[];
    statuses: string[];
    regTypes: string[];
  }) => {
    const p = new URLSearchParams();
    if (f.search.trim()) p.set("q", f.search.trim());
    if (f.years.length > 0) p.set("years", f.years.join(","));
    if (f.units.length > 0) p.set("units", f.units.join(","));
    if (f.statuses.length > 0) p.set("statuses", f.statuses.join(","));
    if (f.regTypes.length > 0) p.set("regTypes", f.regTypes.join(","));
    const qs = p.toString();
    router.replace(qs ? `/list?${qs}` : "/list", { scroll: false });
  }, [router]);

  const [exportOpen, setExportOpen] = useState(false);
  const [galleryAsset, setGalleryAsset] = useState<AssetListRow | null>(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const galleryTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openImageGallery = useCallback((asset: AssetListRow, trigger: HTMLButtonElement, startIndex = 0) => {
    galleryTriggerRef.current = trigger;
    setGalleryStartIndex(startIndex);
    setGalleryAsset(asset);
  }, []);
  const closeImageGallery = useCallback(() => {
    setGalleryAsset(null);
    galleryTriggerRef.current?.focus();
  }, []);
  const [exportMenuPos, setExportMenuPos] = useState<{ top: number; left: number } | null>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const pageSize = 25;

  // The export menu is portaled to <body> with fixed positioning so no parent
  // can clip it. Default placement: below the button, right edges aligned (same
  // as the old absolute right-0 / mt-1). It is then clamped inside the viewport
  // and flipped above the button if there is no room below.
  useLayoutEffect(() => {
    if (!exportOpen) {
      setExportMenuPos(null);
      return;
    }
    const VIEWPORT_MARGIN = 8;
    const GAP = 4;
    const updatePosition = () => {
      const button = exportButtonRef.current;
      const menu = exportMenuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      const maxLeft = viewportWidth - menuWidth - VIEWPORT_MARGIN;
      const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.right - menuWidth, maxLeft));
      let top = rect.bottom + GAP;
      const aboveTop = rect.top - GAP - menuHeight;
      if (top + menuHeight > viewportHeight - VIEWPORT_MARGIN && aboveTop >= VIEWPORT_MARGIN) top = aboveTop;
      setExportMenuPos({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [exportOpen]);

  const filteredRows = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return assets.filter((row) => {
      const searchText = `${row.assetName} ${row.assetNumber} ${row.universityAssetNumber ?? ""} ${row.organization}`.toLowerCase();
      const matchSearch = !cleanSearch || searchText.includes(cleanSearch);
      const matchFiscalYear = selectedYears.length === 0 || selectedYears.includes(row.fiscalYear);
      const matchOrganization = selectedUnits.length === 0 || selectedUnits.includes(row.organization);
      const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(row.status);
      const matchRegType = selectedRegTypes.length === 0 || selectedRegTypes.includes(getRegistrationType(row));
      return matchSearch && matchFiscalYear && matchOrganization && matchStatus && matchRegType;
    });
  }, [assets, search, selectedYears, selectedUnits, selectedStatuses, selectedRegTypes]);

  // Role-specific enhanced view for คณะกรรมการนักศึกษา (role key "Committee") —
  // a compact summary (cards + charts) inserted between the filters and the
  // table. Built entirely from `filteredRows`, the same filtered set the table
  // below renders, so it always reflects the current search/year/unit/status/
  // registration-type filters with no separate data path to keep in sync.
  const isCommittee = currentUserRole === "Committee";
  const [chartsReady, setChartsReady] = useState(false);
  useEffect(() => {
    if (isCommittee) setChartsReady(true);
  }, [isCommittee]);
  const committeeUninspectedCount = useMemo(
    () => filteredRows.filter((row) => !inspectedAssetIds.has(row.id)).length,
    [filteredRows, inspectedAssetIds],
  );
  const committeeStatusChartData = useMemo(
    () => Object.entries(countBy(filteredRows, (row) => row.status))
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({ name, value, color: COMMITTEE_PIE_COLORS[index % COMMITTEE_PIE_COLORS.length] })),
    [filteredRows],
  );
  const committeeStatusTotal = committeeStatusChartData.reduce((total, item) => total + item.value, 0);
  const committeeOrgChartData = useMemo(
    () => Object.entries(countBy(filteredRows, (row) => row.organization))
      .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB, "th"))
      .map(([name, value]) => ({ name, value })),
    [filteredRows],
  );
  const committeeTooltipStyle = {
    backgroundColor: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    color: "var(--color-text-primary)",
  };

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasActiveFilters = Boolean(search.trim()) || selectedYears.length > 0 || selectedUnits.length > 0 || selectedStatuses.length > 0 || selectedRegTypes.length > 0;
  const clearAllFilters = () => {
    setSearch("");
    setSelectedYears([]);
    setSelectedUnits([]);
    setSelectedStatuses([]);
    setSelectedRegTypes([]);
    setPage(1);
    router.replace("/list", { scroll: false });
  };

  // Registration type has no column of its own — it's shown by the icon/color
  // next to each number (TypedAssetNumber).
  const tableHeadings = [
    t("col.no"), t("col.yearShort"), t("col.number"), t("col.name"),
    t("col.org"), t("col.status"), t("col.inspection"),
    t("col.image"), t("col.manage"),
  ];
  const centeredHeadings = new Set([t("col.no"), t("col.yearShort"), t("col.status"), t("col.inspection"), t("col.image"), t("col.manage")]);
  // Desktop-table columns sized exactly to their one-line content; only Name
  // (index 3) is unsized, so it alone absorbs any spare table width.
  const compactColumnIndexes = new Set([0, 1, 2, 4, 5, 6, 7, 8]);
  // Mobile card actions: one row, one equal column per action the user may use.
  const canEditAsset = permissions.canEdit || permissions.canEditLimitedFields;
  const mobileActionCount = 1 + (canEditAsset ? 1 : 0) + (permissions.canDelete ? 1 : 0);
  const mobileActionGridClass = mobileActionCount === 3 ? "grid-cols-3" : mobileActionCount === 2 ? "grid-cols-2" : "grid-cols-1";

  // Search/filter card — extracted so its position can differ by role: normal
  // roles keep it right under the page header (original position); the
  // Committee-only layout renders it further down, under the summary/charts
  // block and directly above the table. Same JSX, same filter state/logic —
  // only where it's placed in the tree changes.
  const filterCard = (
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <label className="block md:col-span-2 xl:col-span-1">
            <span className="text-sm font-semibold text-ink">{t("c.search")}</span>
            <div className="relative mt-2">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => {
                  const v = event.target.value;
                  setSearch(v);
                  setPage(1);
                  pushFilters({ search: v, years: selectedYears, units: selectedUnits, statuses: selectedStatuses, regTypes: selectedRegTypes });
                }}
                placeholder={t("c.searchAssets")}
                className="h-12 w-full rounded-lg border border-line bg-surfaceSoft py-3 pl-9 pr-10 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setPage(1); pushFilters({ search: "", years: selectedYears, units: selectedUnits, statuses: selectedStatuses, regTypes: selectedRegTypes }); }}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-muted hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ล้างคำค้นหา"
                >
                  x
                </button>
              )}
            </div>
          </label>
          <MultiSelectFilter
            label={t("list.filterYear")}
            values={selectedYears}
            onChange={(v) => { setSelectedYears(v); setPage(1); pushFilters({ search, years: v, units: selectedUnits, statuses: selectedStatuses, regTypes: selectedRegTypes }); }}
            options={fiscalYearOptions}
            getOptionLabel={(v) => translateOption(v, lang)}
          />
          <SearchableMultiSelectFilter
            label={t("list.filterOrg")}
            values={selectedUnits}
            onChange={(v) => { setSelectedUnits(v); setPage(1); pushFilters({ search, years: selectedYears, units: v, statuses: selectedStatuses, regTypes: selectedRegTypes }); }}
            options={organizationOptions}
            getOptionLabel={(v) => translateOption(v, lang)}
          />
          <MultiSelectFilter
            label={t("list.filterStatus")}
            values={selectedStatuses}
            onChange={(v) => { setSelectedStatuses(v); setPage(1); pushFilters({ search, years: selectedYears, units: selectedUnits, statuses: v, regTypes: selectedRegTypes }); }}
            options={ASSET_STATUS_FILTER_OPTIONS}
            getOptionLabel={(v) => translateOption(v, lang)}
          />
          <MultiSelectFilter
            label={t("list.filterRegType")}
            values={selectedRegTypes}
            onChange={(v) => { setSelectedRegTypes(v); setPage(1); pushFilters({ search, years: selectedYears, units: selectedUnits, statuses: selectedStatuses, regTypes: v }); }}
            options={registrationTypeFilterOptions}
            getOptionLabel={(v) => translateOption(v, lang)}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm font-normal text-muted">
            {t("c.showing")} {filteredRows.length.toLocaleString("th-TH")} {t("c.items")}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              {t("c.clearFilters")}
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search.trim() && <FilterChip label={t("chip.search")} value={search.trim()} onClear={() => { setSearch(""); setPage(1); pushFilters({ search: "", years: selectedYears, units: selectedUnits, statuses: selectedStatuses, regTypes: selectedRegTypes }); }} />}
            {selectedYears.length > 0 && (
              <FilterChip
                label={t("chip.year")}
                value={selectedYears.join(", ")}
                onClear={() => { setSelectedYears([]); setPage(1); pushFilters({ search, years: [], units: selectedUnits, statuses: selectedStatuses, regTypes: selectedRegTypes }); }}
              />
            )}
            {selectedUnits.length > 0 && (
              <FilterChip
                label={t("chip.org")}
                value={selectedUnits.join(", ")}
                onClear={() => { setSelectedUnits([]); setPage(1); pushFilters({ search, years: selectedYears, units: [], statuses: selectedStatuses, regTypes: selectedRegTypes }); }}
              />
            )}
            {selectedStatuses.length > 0 && (
              <FilterChip
                label={t("chip.status")}
                value={selectedStatuses.map((v) => translateOption(v, lang)).join(", ")}
                onClear={() => { setSelectedStatuses([]); setPage(1); pushFilters({ search, years: selectedYears, units: selectedUnits, statuses: [], regTypes: selectedRegTypes }); }}
              />
            )}
            {selectedRegTypes.length > 0 && (
              <FilterChip
                label={t("chip.regType")}
                value={selectedRegTypes.map((v) => translateOption(v, lang)).join(", ")}
                onClear={() => { setSelectedRegTypes([]); setPage(1); pushFilters({ search, years: selectedYears, units: selectedUnits, statuses: selectedStatuses, regTypes: [] }); }}
              />
            )}
          </div>
        )}
      </div>
  );

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-4">
      <PageHeader
        title={t("list.title")}
        description={t("list.desc")}
        actions={(
          <>
            {permissions.canExport && (
              <div className="relative">
                <button
                  ref={exportButtonRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  onClick={() => setExportOpen((v) => !v)}
                  className="min-h-11 rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                >
                  {t("c.export")} ▾
                </button>
                {exportOpen && createPortal(
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                    <div
                      ref={exportMenuRef}
                      role="menu"
                      className="fixed z-50 w-36 overflow-hidden rounded-md border border-line bg-surface shadow-glow"
                      style={exportMenuPos
                        ? { top: exportMenuPos.top, left: exportMenuPos.left }
                        : { top: 0, left: 0, visibility: "hidden" }}
                    >
                      {(["pdf", "word", "excel"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => {
                            const fp: string[] = [];
                            if (search.trim()) fp.push(lang === "th" ? `ค้นหา: ${search.trim()}` : `Search: ${search.trim()}`);
                            if (selectedYears.length > 0) fp.push(lang === "th" ? `ปีงบประมาณ: ${selectedYears.join(", ")}` : `Fiscal Year: ${selectedYears.join(", ")}`);
                            if (selectedUnits.length > 0) fp.push(lang === "th" ? `หน่วยงาน: ${selectedUnits.join(", ")}` : `Department: ${selectedUnits.join(", ")}`);
                            if (selectedStatuses.length > 0) fp.push(lang === "th" ? `สถานะ: ${selectedStatuses.map((v) => translateOption(v, lang)).join(", ")}` : `Status: ${selectedStatuses.map((v) => translateOption(v, lang)).join(", ")}`);
                            if (selectedRegTypes.length > 0) fp.push(lang === "th" ? `ประเภทการขึ้นทะเบียน: ${selectedRegTypes.map((v) => translateOption(v, lang)).join(", ")}` : `Registration Type: ${selectedRegTypes.map((v) => translateOption(v, lang)).join(", ")}`);
                            const reportTitle = lang === "th" ? "รายงานครุภัณฑ์ทั้งหมด" : "All Asset Report";
                            const isPdf = fmt === "pdf";
                            const columns = isPdf ? assetPdfReportColumns : assetReportExportColumns;
                            const exportRows = isPdf
                              ? filteredRows.map((row) => assetToPdfReportRow(row, inspectedAssetIds.has(row.id)))
                              : filteredRows.map(assetToReportRow);
                            void exportAssetReport(fmt, reportTitle, columns, exportRows, fp.join("  |  "), {
                              lang,
                              pdfFileName: isPdf ? buildAssetPdfFileName(selectedYears) : undefined,
                            }).catch(() => {
                              window.alert(lang === "th" ? "ไม่สามารถส่งออกไฟล์ได้ กรุณาลองใหม่อีกครั้ง" : "Export failed. Please try again.");
                            });
                            setExportOpen(false);
                          }}
                          role="menuitem"
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-ink hover:bg-surfaceSoft max-sm:min-h-11 max-sm:text-sm"
                        >
                          {fmt === "pdf" ? "PDF" : fmt === "word" ? "Word" : "Excel"}
                        </button>
                      ))}
                    </div>
                  </>,
                  document.body,
                )}
              </div>
            )}
            {permissions.canCreate && (
              <button onClick={onAddAsset} className="min-h-11 rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-white transition hover:bg-amberSoft">
                {t("c.add")}
              </button>
            )}
          </>
        )}
      />
      {/* Normal roles: filter card stays right under the header, same as before. */}
      {!isCommittee && filterCard}

      {/* Committee-only compact summary — cards + charts, visible only for role
          "Committee" (คณะกรรมการนักศึกษา). All other roles see nothing here. */}
      {isCommittee && (
        <section className="space-y-4">
          {filteredRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-surfaceSoft px-4 py-8 text-center">
              <p className="text-sm font-bold text-ink">{t("list.committeeNoData")}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <article className={`flex min-h-[110px] flex-col justify-center gap-1.5 rounded-lg border ${dashboardCardColors.total.border} bg-surface bg-gradient-to-br ${dashboardCardColors.total.glow} to-transparent px-4 py-4 shadow-glow`}>
                  <p className="text-sm font-semibold text-ink">{t("dash.totalAssets")}</p>
                  <strong className={`block text-3xl font-extrabold leading-none ${dashboardCardColors.total.accent}`}>{filteredRows.length.toLocaleString("th-TH")}</strong>
                </article>
                <article className={`flex min-h-[110px] flex-col justify-center gap-1.5 rounded-lg border ${dashboardCardColors.pending.border} bg-surface bg-gradient-to-br ${dashboardCardColors.pending.glow} to-transparent px-4 py-4 shadow-glow`}>
                  <p className="text-sm font-semibold text-ink">{t("dash.unaudited")}</p>
                  <strong className={`block text-3xl font-extrabold leading-none ${dashboardCardColors.pending.accent}`}>{committeeUninspectedCount.toLocaleString("th-TH")}</strong>
                </article>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                <article className="flex min-h-[260px] flex-col overflow-visible rounded-lg border border-line bg-surface p-4">
                  <h3 className="text-sm font-bold text-ink">{t("dash.chartStatus")}</h3>
                  <div className="mt-3 min-h-0 flex-1 overflow-visible">
                    {chartsReady ? (
                      <div className="flex h-full flex-col">
                        <div className="relative min-h-0 flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={committeeStatusChartData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={76} paddingAngle={3}>
                                {committeeStatusChartData.map((item) => (
                                  <Cell key={item.name} fill={item.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={committeeTooltipStyle}
                                formatter={(value, name) => [`${Number(value).toLocaleString("th-TH")} ${t("dash.itemCount")}`, translateOption(String(name), lang)]}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
                            <strong className="text-2xl font-extrabold leading-none text-ink">{committeeStatusTotal.toLocaleString("th-TH")}</strong>
                            <span className="mt-1 text-[11px] font-semibold text-muted">{t("dash.itemCount")}</span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-ink">
                          {committeeStatusChartData.map((item) => (
                            <span key={item.name} className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                              {translateOption(item.name, lang)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">{t("dash.preparingChart")}</div>
                    )}
                  </div>
                </article>

                <article className="flex min-h-[260px] flex-col overflow-visible rounded-lg border border-line bg-surface p-4">
                  <h3 className="text-sm font-bold text-ink">{t("dash.chartByOrg")}</h3>
                  <div className="mt-3 min-h-0 flex-1 overflow-visible">
                    {chartsReady ? (
                      committeeOrgChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={committeeOrgChartData} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                            <CartesianGrid stroke={chartColors.grid} vertical={false} />
                            <XAxis
                              dataKey="name"
                              stroke={chartColors.axis}
                              tickLine={false}
                              axisLine={false}
                              interval={0}
                              angle={-35}
                              textAnchor="end"
                              tick={{ fill: chartColors.axis, fontSize: 10 }}
                              tickFormatter={(value: string) => (value.length > 12 ? `${value.slice(0, 12)}…` : value)}
                            />
                            <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                            <Tooltip
                              contentStyle={committeeTooltipStyle}
                              cursor={{ fill: "#E1F1FE" }}
                              formatter={(value) => [`${Number(value).toLocaleString("th-TH")} ${t("dash.itemCount")}`, t("dash.assetCount")]}
                            />
                            <Bar dataKey="value" name={t("dash.assetCount")} fill={chartColors.organizationBar} radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-semibold text-muted">{t("dash.noChartData")}</div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-muted">{t("dash.preparingChart")}</div>
                    )}
                  </div>
                </article>
              </div>
            </>
          )}
        </section>
      )}

      {/* Committee layout: filter card moved below the summary/charts, directly
          above the table (always shown here regardless of the summary's own
          empty state, so the admin can still adjust filters). */}
      {isCommittee && filterCard}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {visibleRows.map((row, index) => (
          <article key={row.assetCode} className="rounded-lg border border-line bg-surface p-4">
            {/* Header: index/year + usage status. Then two columns — asset info
                left, photo carousel right (only when the asset has photos; the
                photo shrinks on very narrow screens, and the number may wrap
                there rather than being truncated). Org spans the full width below. */}
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-xs font-semibold text-muted">{t("col.no")} {(safePage - 1) * pageSize + index + 1} · {t("col.year")} {row.fiscalYear}</p>
              <StatusBadge value={row.status} variant="soft" />
            </div>
            <div className="mt-2 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-primary [&_*]:whitespace-normal [&_*]:[overflow-wrap:anywhere]"><AssetNumberCell asset={row} truncate={false} /></div>
                <h3 className="mt-1 break-words text-base font-extrabold leading-snug text-ink">{row.assetName}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <RegistrationTypeBadge registrationType={row.registrationType} truncate={false} />
                  <InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} />
                  {(row.assetImages?.length ?? 0) === 0 && (
                    <span className="text-[11px] font-semibold text-muted">{lang === "th" ? "ไม่มีรูปภาพ" : "No photos"}</span>
                  )}
                </div>
              </div>
              <AssetPhotoCarousel
                asset={row}
                onOpen={(photoIndex, trigger) => openImageGallery(row, trigger, photoIndex)}
                className="w-[88px] min-[360px]:w-[112px] min-[400px]:w-[128px]"
              />
            </div>
            <dl className="mt-3 text-sm">
              <div><dt className="text-xs font-semibold text-muted">{t("col.org")}</dt><dd className="mt-1 break-words text-ink">{row.organization}</dd></div>
            </dl>
            <div className={`mt-3 grid gap-2 ${mobileActionGridClass}`}>
              <MobileActionButton label={t("c.detail")} onClick={() => onViewDetails(row)} className="border border-[#D1D9E0] bg-white text-ink">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M10 9H8" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
              </MobileActionButton>
              {canEditAsset && (
                <MobileActionButton label={t("c.edit")} onClick={() => onEditAsset(row)} className="border border-[#044377] bg-[#044377] text-[#FFFFFF]">
                  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                  <path d="m15 5 4 4" />
                </MobileActionButton>
              )}
              {permissions.canDelete && (
                <MobileActionButton label={t("c.delete")} onClick={() => onDeleteAsset(row)} className="border border-[#DC2626] bg-white text-[#DC2626]">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </MobileActionButton>
              )}
            </div>
          </article>
        ))}
        {visibleRows.length === 0 && (
          <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center">
            <p className="font-bold text-ink">{t("c.noData")}</p>
            <p className="mt-2 text-sm text-muted">{t("c.noDataSub")}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} className="min-h-11 rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:opacity-40">{t("c.prev")}</button>
          <span className="text-center font-bold text-ink">{t("c.page")} {safePage}/{pageCount}</span>
          <button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={safePage === pageCount} className="min-h-11 rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:opacity-40">{t("c.next")}</button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden w-full overflow-hidden rounded-lg border border-line bg-surface md:block">
        <div className="w-full overflow-x-auto">
          {/* Auto table layout sized by real content (the old table-fixed colgroup
              reserved a 260px number column + 1050px min-width, truncating Name).
              Every column except Name is `w-px` with one-line content, so it is
              exactly as wide as its content: Number, Org and the three action
              buttons always stay on one line. Name absorbs the spare width and
              wraps; its min-width (assetNameMinWidth) is about half the name's
              length so it fits in ~2 lines. Laptop sizing: 13px text below 1600px
              (14px above), 6px side padding on compact columns, 32px action
              buttons. Measured with the 260px sidebar: fits from ~1366px; at
              1280px long one-line Org/number content needs ~50-70px more, so only
              this container scrolls horizontally — nothing clips or truncates. */}
          <table className="w-full border-collapse text-left text-[13px] min-[1600px]:text-sm">
            <thead className="bg-surfaceSoft text-ink">
              <tr>
                {tableHeadings.map((heading, index) => (
                  <th
                    key={heading}
                    className={`border-b border-line py-2.5 font-semibold ${centeredHeadings.has(heading) ? "text-center" : ""} ${
                      compactColumnIndexes.has(index) ? "w-px px-1.5" : "px-2"
                    }`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface text-ink">
              {visibleRows.map((row, index) => (
                <tr key={row.assetCode} className="align-middle hover:bg-surfaceSoft">
                  <td className="whitespace-nowrap px-1.5 py-3 text-center text-muted">{(safePage - 1) * pageSize + index + 1}</td>
                  <td className="whitespace-nowrap px-1.5 py-3 text-center">{row.fiscalYear}</td>
                  <td className="px-1.5 py-3 font-semibold"><TypedAssetNumber asset={row} /></td>
                  <td className="px-2 py-3 font-semibold leading-snug text-ink"><div className="break-words" style={{ minWidth: assetNameMinWidth(row.assetName) }}>{row.assetName}</div></td>
                  <td className="whitespace-nowrap px-1.5 py-3">{row.organization}</td>
                  <td className="whitespace-nowrap px-1.5 py-3 text-center"><StatusBadge value={row.status} variant="soft" /></td>
                  <td className="whitespace-nowrap px-1.5 py-3 text-center"><InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} /></td>
                  <td className="px-1.5 py-3 text-center">
                    {row.imageCount > 0 ? (
                      <button
                        type="button"
                        onClick={(event) => openImageGallery(row, event.currentTarget)}
                        aria-haspopup="dialog"
                        aria-label={lang === "th" ? `ดูรูปภาพ ${row.imageCount} รูป: ${row.assetName}` : `View ${row.imageCount} image(s): ${row.assetName}`}
                        className="inline-flex h-7 w-9 cursor-pointer items-center justify-center rounded-md border border-line bg-slate-900 text-[11px] font-bold text-primary transition hover:border-primary hover:bg-surfaceSoft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {row.imageCount}
                      </button>
                    ) : (
                      <span className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-line bg-slate-900 text-[11px] font-bold text-primary">
                        {row.imageCount}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-1.5 py-1.5">
                    <div className="flex flex-row flex-nowrap items-center justify-center gap-1">
                      <ActionIconButton label={t("c.detail")} onClick={() => onViewDetails(row)} className="border border-[#D1D9E0] bg-white text-ink hover:border-primary hover:text-primary">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                        <path d="M10 9H8" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                      </ActionIconButton>
                      {(permissions.canEdit || permissions.canEditLimitedFields) && (
                        <ActionIconButton label={t("c.edit")} onClick={() => onEditAsset(row)} className="border border-[#044377] bg-[#044377] text-[#FFFFFF] hover:text-[#FFFFFF] focus-visible:text-[#FFFFFF] active:text-[#FFFFFF]">
                          <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                          <path d="m15 5 4 4" />
                        </ActionIconButton>
                      )}
                      {permissions.canDelete && (
                        <ActionIconButton label={t("c.delete")} onClick={() => onDeleteAsset(row)} className="border border-[#DC2626] bg-white text-[#DC2626] hover:bg-[#FEF2F2]">
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </ActionIconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={tableHeadings.length} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-white">{t("c.noData")}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">{t("c.noDataSub")}</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="mt-4 rounded-md bg-gold px-4 py-2 text-sm font-bold text-slate-950 hover:bg-primary-hover"
                        >
                          {t("c.clearFilters")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink">
          <span>
            {t("c.showing")} {visibleRows.length > 0 ? (safePage - 1) * pageSize + 1 : 0}-{Math.min(safePage * pageSize, filteredRows.length)} {t("c.of")} {filteredRows.length.toLocaleString("th-TH")} {t("c.items")}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("c.prev")}
            </button>
            <span className="rounded-md bg-surfaceSoft px-3 py-2 font-bold text-white">
              {t("c.page")} {safePage}/{pageCount}
            </span>
            <button
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={safePage === pageCount}
              className="rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("c.next")}
            </button>
          </div>
        </div>
      </div>
      {galleryAsset && (
        <AssetImageGalleryModal key={galleryAsset.id} asset={galleryAsset} initialIndex={galleryStartIndex} onClose={closeImageGallery} />
      )}
    </section>
  );
}


export default function ListRoute() {
  const { permissions, assets, annualInspections, onGoToRecord, onViewDetails, onEditAsset, onDeleteAsset, currentUser } = useAppData();
  if (!permissions.canViewList) return <PlaceholderPage title="ไม่มีสิทธิ์ดูรายการครุภัณฑ์" />;
  const storeReturnUrl = () => {
    sessionStorage.setItem("listReturnUrl", window.location.pathname + window.location.search);
  };
  return (
    <Suspense>
      <ListPage
        assets={assets}
        annualInspections={annualInspections}
        permissions={permissions}
        onAddAsset={onGoToRecord}
        onViewDetails={(asset) => { storeReturnUrl(); onViewDetails(asset); }}
        onEditAsset={(asset) => { storeReturnUrl(); onEditAsset(asset); }}
        onDeleteAsset={onDeleteAsset}
        currentUserRole={currentUser.role}
      />
    </Suspense>
  );
}
