"use client";

import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useMemo } from "react";
import { FilterChip, PageHeader, SelectField } from "@/components/ui";
import { annualInspectionToReportRow, assetReportDisplayColumns, assetReportExportColumns, assetToReportRow, getAssetValue, getReportRowValue, inspectionReportColumns } from "@/lib/assets";
import { getCurrentInspectionYear } from "@/lib/dates";
import { exportAssetReport } from "@/lib/import-export";
import { Permissions } from "@/lib/permissions";
import { uniqueSorted } from "@/lib/utils";
import { AnnualInspection, AssetListRow } from "@/types";
import { ASSET_STATUS_FILTER_OPTIONS } from "@/constants/statuses";

function ReportsPage({
  assets,
  annualInspections,
  permissions,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  permissions: Permissions;
}) {
  const reportTypes = [
    "รายงานครุภัณฑ์ทั้งหมด",
    "รายงานครุภัณฑ์ที่ใช้งานได้",
    "รายงานครุภัณฑ์ที่ชำรุด",
    "รายงานครุภัณฑ์ที่รอซ่อม",
    "รายงานครุภัณฑ์ที่สูญหาย",
    "รายงานครุภัณฑ์ที่โอนย้าย",
    "รายงานครุภัณฑ์ที่จำหน่ายแล้ว",
    "รายงานครุภัณฑ์ที่รอตรวจสอบ",
    "รายงานครุภัณฑ์แยกตามปีงบประมาณ",
    "รายงานครุภัณฑ์แยกตามฝ่าย/ชมรม",
    "รายงานผลการตรวจสอบประจำปี",
  ];
  const statusByReportType: Record<string, string> = {
    รายงานครุภัณฑ์ทั้งหมด: "ทั้งหมด",
    รายงานครุภัณฑ์ที่ใช้งานได้: "ใช้งานได้",
    รายงานครุภัณฑ์ที่ชำรุด: "ชำรุด",
    รายงานครุภัณฑ์ที่รอซ่อม: "รอซ่อม",
    รายงานครุภัณฑ์ที่สูญหาย: "สูญหาย",
    รายงานครุภัณฑ์ที่โอนย้าย: "โอนย้าย",
    รายงานครุภัณฑ์ที่จำหน่ายแล้ว: "จำหน่ายแล้ว",
    รายงานครุภัณฑ์ที่รอตรวจสอบ: "รอตรวจสอบ",
  };
  const fiscalYearOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((asset) => asset.fiscalYear)).sort((a, b) => Number(b) - Number(a))];
  const organizationOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((asset) => asset.organization))];
  const statusOptions = ASSET_STATUS_FILTER_OPTIONS;
  const currentInspectionYear = String(getCurrentInspectionYear());
  const currentYearInspectedAssetIds = useMemo(
    () => new Set(
      annualInspections
        .filter((inspection) => inspection.inspectionYear === currentInspectionYear)
        .map((inspection) => inspection.assetId),
    ),
    [annualInspections, currentInspectionYear],
  );
  const inspectionOptions = ["ทั้งหมด", "ตรวจสอบแล้ว", "ยังไม่ได้ตรวจสอบ"];

  const [reportType, setReportType] = useState(reportTypes[0]);
  const [fiscalYear, setFiscalYear] = useState("ทั้งหมด");
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [inspectionResult, setInspectionResult] = useState("ทั้งหมด");

  const handleReportTypeChange = (nextReportType: string) => {
    setReportType(nextReportType);
    const nextStatus = statusByReportType[nextReportType];
    if (nextStatus) setStatus(nextStatus);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const computedInspection = currentYearInspectedAssetIds.has(asset.id) ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจสอบ";
      const matchFiscalYear = fiscalYear === "ทั้งหมด" || asset.fiscalYear === fiscalYear;
      const matchOrganization = organization === "ทั้งหมด" || asset.organization === organization;
      const matchStatus = status === "ทั้งหมด" || asset.status === status;
      const matchInspection = inspectionResult === "ทั้งหมด" || computedInspection === inspectionResult;

      return matchFiscalYear && matchOrganization && matchStatus && matchInspection;
    });
  }, [assets, currentYearInspectedAssetIds, fiscalYear, inspectionResult, organization, status]);

  const assetsById = useMemo(() => new Map(assets.map((item) => [item.id, item])), [assets]);

  const inspectionReportRows = useMemo(() => {
    if (inspectionResult === "ยังไม่ได้ตรวจสอบ") return [];
    return annualInspections
      .filter((inspection) => inspection.inspectionYear === currentInspectionYear)
      .map((inspection) => {
        const asset = assetsById.get(inspection.assetId);
        if (!asset) return null;
        return { asset, inspection };
      })
      .filter((item): item is { asset: AssetListRow; inspection: AnnualInspection } => Boolean(item))
      .filter(({ asset, inspection }) => {
        const matchFiscalYear = fiscalYear === "ทั้งหมด" || asset.fiscalYear === fiscalYear;
        const matchOrganization = organization === "ทั้งหมด" || asset.organization === organization;
        const matchStatus = status === "ทั้งหมด" || inspection.result === status || asset.status === status;
        return matchFiscalYear && matchOrganization && matchStatus;
      })
      .map(({ asset, inspection }) => annualInspectionToReportRow(inspection, asset));
  }, [annualInspections, assetsById, currentInspectionYear, fiscalYear, inspectionResult, organization, status]);

  const isInspectionReport = reportType === "รายงานผลการตรวจสอบประจำปี";
  const displayColumns = isInspectionReport ? inspectionReportColumns : assetReportDisplayColumns;
  const exportColumns = isInspectionReport ? inspectionReportColumns : assetReportExportColumns;
  const displayRows = isInspectionReport
    ? inspectionReportRows
    : filteredAssets.map((asset) => Object.fromEntries(assetReportDisplayColumns.map((column) => [column.key, getAssetValue(asset, column.key)])));
  const exportRows = isInspectionReport ? inspectionReportRows : filteredAssets.map(assetToReportRow);

  const subtitle = [
    `ประเภทรายงาน: ${reportType}`,
    `ปีงบประมาณ: ${fiscalYear}`,
    `ฝ่าย/ชมรม: ${organization}`,
    `สถานะ: ${status}`,
    `ผลตรวจสอบปี ${currentInspectionYear}: ${inspectionResult}`,
  ].join(" | ");
  const hasActiveReportFilters = reportType !== reportTypes[0] || fiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || status !== "ทั้งหมด" || inspectionResult !== "ทั้งหมด";
  const clearReportFilters = () => {
    setReportType(reportTypes[0]);
    setFiscalYear("ทั้งหมด");
    setOrganization("ทั้งหมด");
    setStatus("ทั้งหมด");
    setInspectionResult("ทั้งหมด");
  };

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-4">
      <PageHeader
        title="รายงาน"
        description="สรุปข้อมูลครุภัณฑ์ตามปีงบประมาณ สถานะ หน่วยงาน และผลการตรวจสอบ"
        actions={permissions.canExport ? (
          <>
            <button onClick={() => exportAssetReport("pdf", reportType, exportColumns, exportRows, subtitle)} className="min-h-11 rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">ส่งออก PDF</button>
            <button onClick={() => exportAssetReport("word", reportType, exportColumns, exportRows, subtitle)} className="min-h-11 rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">ส่งออก Word</button>
            <button onClick={() => exportAssetReport("excel", reportType, exportColumns, exportRows, subtitle)} className="min-h-11 rounded-md bg-primary px-3 py-2 text-sm font-extrabold text-white transition hover:bg-primary-hover">ส่งออก Excel</button>
          </>
        ) : <p className="rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm text-muted">บัญชีนี้ไม่มีสิทธิ์ส่งออก</p>}
      />
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SelectField label="ประเภทรายงาน" value={reportType} onChange={handleReportTypeChange} options={reportTypes} />
          <SelectField label="ปีงบประมาณ" value={fiscalYear} onChange={setFiscalYear} options={fiscalYearOptions} />
          <SelectField label="ฝ่าย/ชมรม" value={organization} onChange={setOrganization} options={organizationOptions} />
          <SelectField label="สถานะครุภัณฑ์" value={status} onChange={setStatus} options={statusOptions} />
          <SelectField label="ผลตรวจสอบประจำปี" value={inspectionResult} onChange={setInspectionResult} options={inspectionOptions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm font-semibold text-muted">
            พบข้อมูล {displayRows.length.toLocaleString("th-TH")} รายการสำหรับรายงานนี้
          </p>
          {hasActiveReportFilters && (
            <button
              type="button"
              onClick={clearReportFilters}
              className="rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
        {hasActiveReportFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reportType !== reportTypes[0] && <FilterChip label="ประเภทรายงาน" value={reportType} onClear={() => { setReportType(reportTypes[0]); setStatus("ทั้งหมด"); }} />}
            {fiscalYear !== "ทั้งหมด" && <FilterChip label="ปีงบประมาณ" value={fiscalYear} onClear={() => setFiscalYear("ทั้งหมด")} />}
            {organization !== "ทั้งหมด" && <FilterChip label="ฝ่าย/ชมรม" value={organization} onClear={() => setOrganization("ทั้งหมด")} />}
            {status !== "ทั้งหมด" && <FilterChip label="สถานะ" value={status} onClear={() => setStatus("ทั้งหมด")} />}
            {inspectionResult !== "ทั้งหมด" && <FilterChip label="ผลตรวจ" value={inspectionResult} onClear={() => setInspectionResult("ทั้งหมด")} />}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 md:rounded-b-none md:border-b-0">
        <h3 className="font-bold text-ink">{reportType}</h3>
        <p className="text-sm text-muted">จำนวน {displayRows.length.toLocaleString("th-TH")} รายการ</p>
      </div>

      <div className="space-y-3 md:hidden">
        {displayRows.map((row, index) => (
          <article key={`${reportType}-card-${index}`} className="rounded-lg border border-line bg-surface p-4">
            <p className="text-xs font-semibold text-muted">ลำดับ {index + 1}</p>
            <dl className="mt-2 grid gap-2 text-sm">
              {displayColumns.map((column) => (
                <div key={`${index}-card-${column.key}`}>
                  <dt className="text-xs font-semibold text-muted">{column.label}</dt>
                  <dd className="mt-0.5 break-words text-ink">{getReportRowValue(row, column.key)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
        {displayRows.length === 0 && (
          <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center">
            <p className="text-base font-bold text-ink">{isInspectionReport ? "ยังไม่มีข้อมูลผลการตรวจสอบประจำปี" : "ไม่พบข้อมูล"}</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              {isInspectionReport ? "ยังไม่มีผลตรวจสอบของปีนี้ หรือตัวกรองที่เลือกยังไม่ตรงกับข้อมูล" : "ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข ลองล้างตัวกรองหรือเปลี่ยนเงื่อนไขใหม่"}
            </p>
            {hasActiveReportFilters && (
              <button
                type="button"
                onClick={clearReportFilters}
                className="mt-4 min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-lg rounded-t-none border border-line border-t-0 bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="bg-surfaceSoft text-ink">
              <tr>
                <th className="border-b border-line px-3 py-2.5">ลำดับ</th>
                {displayColumns.map((column) => (
                  <th key={column.key} className="border-b border-line px-3 py-2.5 font-semibold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
              {displayRows.map((row, index) => (
                <tr key={`${reportType}-${index}`} className="hover:bg-surfaceMuted">
                  <td className="px-3 py-3 text-muted">{index + 1}</td>
                  {displayColumns.map((column) => (
                    <td key={`${index}-${column.key}`} className="break-words px-3 py-3">{getReportRowValue(row, column.key)}</td>
                  ))}
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={displayColumns.length + 1} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-ink">{isInspectionReport ? "ยังไม่มีข้อมูลผลการตรวจสอบประจำปี" : "ไม่พบข้อมูล"}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {isInspectionReport ? "ยังไม่มีผลตรวจสอบของปีนี้ หรือตัวกรองที่เลือกยังไม่ตรงกับข้อมูล" : "ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข ลองล้างตัวกรองหรือเปลี่ยนเงื่อนไขใหม่"}
                      </p>
                      {hasActiveReportFilters && (
                        <button
                          type="button"
                          onClick={clearReportFilters}
                          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
                        >
                          ล้างตัวกรองทั้งหมด
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


export default function ReportsRoute() {
  const { permissions, assets, annualInspections } = useAppData();
  if (!permissions.canViewReports) return <PlaceholderPage title="ไม่มีสิทธิ์ดูรายงาน" />;
  return <ReportsPage assets={assets} annualInspections={annualInspections} permissions={permissions} />;
}
