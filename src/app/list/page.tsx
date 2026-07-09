"use client";

import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useMemo } from "react";
import { AssetStructureBadge, FilterChip, InspectionResultBadge, PageHeader, SearchableFilterField, SelectField, StatusBadge, getAssetStructureFilterLabel } from "@/components/ui";
import { assetReportExportColumns, assetToReportRow } from "@/lib/assets";
import { exportAssetReport } from "@/lib/import-export";
import { Permissions } from "@/lib/permissions";
import { uniqueSorted } from "@/lib/utils";
import { AnnualInspection, AssetListRow, Organization } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateOption } from "@/lib/i18n";

function ListPage({
  assets,
  annualInspections,
  permissions,
  activeOrganizations,
  onAddAsset,
  onViewDetails,
  onEditAsset,
  onDeleteAsset,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  permissions: Permissions;
  activeOrganizations: Organization[];
  onAddAsset: () => void;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
}) {
  const { lang, t } = useLanguage();
  const inspectedAssetIds = useMemo(
    () => new Set(annualInspections.map((inspection) => inspection.assetId)),
    [annualInspections],
  );
  const fiscalYearOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.fiscalYear)).sort((a, b) => Number(b) - Number(a))];
  const organizationOptions = [
    "ทั้งหมด",
    ...uniqueSorted([
      ...activeOrganizations.map((o) => o.name),
      ...assets.map((a) => a.organization),
    ]),
  ];
  const assetTypeOptions = ["ทั้งหมด", "ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"];
  const statusOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.status))];

  const [search, setSearch] = useState("");
  const [fiscalYear, setFiscalYear] = useState("ทั้งหมด");
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [assetType, setAssetType] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const pageSize = 25;

  const filteredRows = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return assets.filter((row) => {
      const searchText = `${row.assetName} ${row.assetNumber} ${row.organization}`.toLowerCase();
      const matchSearch = !cleanSearch || searchText.includes(cleanSearch);
      const matchFiscalYear = fiscalYear === "ทั้งหมด" || row.fiscalYear === fiscalYear;
      const matchOrganization = organization === "ทั้งหมด" || row.organization === organization;
      const matchAssetType = assetType === "ทั้งหมด" || getAssetStructureFilterLabel(row) === assetType;
      const matchStatus = status === "ทั้งหมด" || row.status === status;
      return matchSearch && matchFiscalYear && matchOrganization && matchAssetType && matchStatus;
    });
  }, [assetType, assets, fiscalYear, organization, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasActiveFilters = Boolean(search.trim()) || fiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || assetType !== "ทั้งหมด" || status !== "ทั้งหมด";
  const clearAllFilters = () => {
    setSearch("");
    setFiscalYear("ทั้งหมด");
    setOrganization("ทั้งหมด");
    setAssetType("ทั้งหมด");
    setStatus("ทั้งหมด");
    setPage(1);
  };

  const tableHeadings = [
    t("col.no"), t("col.year"), t("col.number"), t("col.name"),
    t("col.type"), t("col.org"), t("col.status"), t("col.inspection"),
    t("col.image"), t("col.manage"),
  ];
  const centeredHeadings = new Set([t("col.no"), t("col.year"), t("col.type"), t("col.status"), t("col.inspection"), t("col.image"), t("col.manage")]);

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
                  onClick={() => setExportOpen((v) => !v)}
                  className="min-h-11 rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                >
                  {t("c.export")} ▾
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-line bg-surface shadow-glow">
                      {(["pdf", "word", "excel"] as const).map((fmt) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => {
                            const fp: string[] = [];
                            if (search.trim()) fp.push(lang === "th" ? `ค้นหา: ${search.trim()}` : `Search: ${search.trim()}`);
                            if (fiscalYear !== "ทั้งหมด") fp.push(lang === "th" ? `ปีงบประมาณ: ${fiscalYear}` : `Fiscal Year: ${fiscalYear}`);
                            if (organization !== "ทั้งหมด") fp.push(lang === "th" ? `หน่วยงาน: ${organization}` : `Department: ${organization}`);
                            if (assetType !== "ทั้งหมด") fp.push(lang === "th" ? `ลักษณะ: ${translateOption(assetType, lang)}` : `Type: ${translateOption(assetType, lang)}`);
                            if (status !== "ทั้งหมด") fp.push(lang === "th" ? `สถานะ: ${translateOption(status, lang)}` : `Status: ${translateOption(status, lang)}`);
                            const reportTitle = lang === "th" ? "รายงานครุภัณฑ์ทั้งหมด" : "All Asset Report";
                            exportAssetReport(fmt, reportTitle, assetReportExportColumns, filteredRows.map(assetToReportRow), fp.join("  |  "), { lang });
                            setExportOpen(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-ink hover:bg-surfaceSoft"
                        >
                          {fmt === "pdf" ? "PDF" : fmt === "word" ? "Word" : "Excel"}
                        </button>
                      ))}
                    </div>
                  </>
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
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <label className="block md:col-span-2 xl:col-span-1">
            <span className="text-sm font-semibold text-ink">{t("c.search")}</span>
            <div className="relative mt-2">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={t("c.searchAssets")}
                className="h-12 w-full rounded-lg border border-line bg-surfaceSoft py-3 pl-9 pr-10 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setPage(1); }}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-muted hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ล้างคำค้นหา"
                >
                  x
                </button>
              )}
            </div>
          </label>
          <SelectField label={t("list.filterYear")} value={fiscalYear} onChange={(value) => { setFiscalYear(value); setPage(1); }} options={fiscalYearOptions} getOptionLabel={(v) => translateOption(v, lang)} />
          <SearchableFilterField label={t("list.filterOrg")} value={organization} onChange={(value) => { setOrganization(value); setPage(1); }} options={organizationOptions} getOptionLabel={(v) => translateOption(v, lang)} />
          <SelectField label={t("list.filterType")} value={assetType} onChange={(value) => { setAssetType(value); setPage(1); }} options={assetTypeOptions} getOptionLabel={(v) => translateOption(v, lang)} />
          <SelectField label={t("list.filterStatus")} value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} getOptionLabel={(v) => translateOption(v, lang)} />
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
            {search.trim() && <FilterChip label={t("chip.search")} value={search.trim()} onClear={() => { setSearch(""); setPage(1); }} />}
            {fiscalYear !== "ทั้งหมด" && <FilterChip label={t("chip.year")} value={fiscalYear} onClear={() => { setFiscalYear("ทั้งหมด"); setPage(1); }} />}
            {organization !== "ทั้งหมด" && <FilterChip label={t("chip.org")} value={organization} onClear={() => { setOrganization("ทั้งหมด"); setPage(1); }} />}
            {assetType !== "ทั้งหมด" && <FilterChip label={t("chip.type")} value={translateOption(assetType, lang)} onClear={() => { setAssetType("ทั้งหมด"); setPage(1); }} />}
            {status !== "ทั้งหมด" && <FilterChip label={t("chip.status")} value={translateOption(status, lang)} onClear={() => { setStatus("ทั้งหมด"); setPage(1); }} />}
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {visibleRows.map((row, index) => (
          <article key={row.assetCode} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">{t("col.no")} {(safePage - 1) * pageSize + index + 1} · {t("col.year")} {row.fiscalYear}</p>
                <p className="mt-1 break-words text-sm font-bold text-primary">{row.assetNumber}</p>
                <h3 className="mt-1 break-words text-base font-extrabold text-ink">{row.assetName}</h3>
              </div>
              <StatusBadge value={row.status} variant="soft" />
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs font-semibold text-muted">{t("col.type")}</dt><dd className="mt-1"><AssetStructureBadge asset={row} /></dd></div>
              <div><dt className="text-xs font-semibold text-muted">{t("col.org")}</dt><dd className="mt-1 break-words text-ink">{row.organization}</dd></div>
              <div><dt className="text-xs font-semibold text-muted">{t("col.inspection")}</dt><dd className="mt-1"><InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} /></dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => onViewDetails(row)} className="min-h-11 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink">{t("c.detail")}</button>
              {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEditAsset(row)} className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white">{t("c.edit")}</button>}
              {permissions.canDelete && <button onClick={() => onDeleteAsset(row)} className="min-h-11 rounded-md border border-red-300/30 px-3 py-2 text-sm font-semibold text-danger">{t("c.delete")}</button>}
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
          <table className="w-full min-w-[1024px] table-fixed border-collapse text-left text-sm xl:min-w-0">
            <colgroup>
              <col className="w-[44px]" />
              <col className="w-[84px]" />
              <col className="w-[158px]" />
              <col className="w-[215px]" />
              <col className="w-[112px]" />
              <col className="w-[158px]" />
              <col className="w-[104px]" />
              <col className="w-[132px]" />
              <col className="w-[54px]" />
              <col className="w-[180px]" />
            </colgroup>
            <thead className="bg-surfaceSoft text-ink">
              <tr>
                {tableHeadings.map((heading) => (
                  <th key={heading} className={`border-b border-line px-4 py-2.5 font-semibold ${centeredHeadings.has(heading) ? "text-center" : ""}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surface text-ink">
              {visibleRows.map((row, index) => (
                <tr key={row.assetCode} className="align-middle hover:bg-surfaceSoft">
                  <td className="px-3 py-3 text-center text-muted">{(safePage - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-3 text-center">{row.fiscalYear}</td>
                  <td className="px-4 py-3 font-semibold text-primary" title={row.assetNumber}><div className="line-clamp-2 break-words">{row.assetNumber}</div></td>
                  <td className="px-4 py-3 font-semibold text-ink" title={row.assetName}><div className="line-clamp-2 break-words">{row.assetName}</div></td>
                  <td className="px-3 py-3 text-center"><AssetStructureBadge asset={row} /></td>
                  <td className="px-4 py-3"><div className="truncate" title={row.organization}>{row.organization}</div></td>
                  <td className="px-3 py-3 text-center"><StatusBadge value={row.status} variant="soft" /></td>
                  <td className="px-3 py-3 text-center"><InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} /></td>
                  <td className="px-3 py-3 text-center">
                    <button className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-line bg-slate-900 text-[11px] font-bold text-primary hover:border-primary">
                      {row.imageCount}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-row items-center justify-center gap-2">
                      <button onClick={() => onViewDetails(row)} className="whitespace-nowrap rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-ink hover:border-primary hover:text-primary">{t("c.detail")}</button>
                      {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEditAsset(row)} className="whitespace-nowrap rounded-md bg-orange px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange/90">{t("c.edit")}</button>}
                      {permissions.canDelete && <button onClick={() => onDeleteAsset(row)} className="whitespace-nowrap rounded-md border border-red-300/30 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10">{t("c.delete")}</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center">
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
    </section>
  );
}


export default function ListRoute() {
  const { permissions, assets, annualInspections, activeOrganizations, onGoToRecord, onViewDetails, onEditAsset, onDeleteAsset } = useAppData();
  if (!permissions.canViewList) return <PlaceholderPage title="ไม่มีสิทธิ์ดูรายการครุภัณฑ์" />;
  return (
    <ListPage
      assets={assets}
      annualInspections={annualInspections}
      permissions={permissions}
      activeOrganizations={activeOrganizations}
      onAddAsset={onGoToRecord}
      onViewDetails={onViewDetails}
      onEditAsset={onEditAsset}
      onDeleteAsset={onDeleteAsset}
    />
  );
}
