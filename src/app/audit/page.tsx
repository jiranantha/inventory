"use client";

import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useMemo } from "react";
import { buttonColors, inspectionStatusColors } from "@/constants/colors";
import { CloseIconButton, Field, FilterChip, SelectField, StatusBadge, TextAreaField, ThaiDateField } from "@/components/ui";
import { formatThaiDate, getCurrentInspectionYear } from "@/lib/dates";
import { uploadImage } from "@/lib/image-upload";
import { uniqueSorted } from "@/lib/utils";
import { AnnualInspection, AssetListRow, EvidenceImage } from "@/types";
import { allowedAssetStatuses, ASSET_STATUS_FILTER_OPTIONS } from "@/constants/statuses";

function AuditPage({
  assets,
  annualInspections,
  onSaveAnnualInspection,
  onCancelAnnualInspection,
  onSaveInspectionStatus,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  onSaveAnnualInspection: (inspection: AnnualInspection) => void;
  onCancelAnnualInspection: (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => void;
  onSaveInspectionStatus: (asset: AssetListRow, status: string, inspectionDate: string, note: string) => void;
}) {
  const currentInspectionYear = getCurrentInspectionYear();
  const today = new Date().toISOString().slice(0, 10);
  const assetFiscalYearOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((row) => row.fiscalYear)).sort((a, b) => Number(a) - Number(b))];
  const organizationOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.organization))];
  const statusOptions = ASSET_STATUS_FILTER_OPTIONS;
  const inspectionStateOptions = ["ทั้งหมด", "ตรวจสอบแล้ว", "ยังไม่ได้ตรวจสอบ"];
  const modalStatusOptions = allowedAssetStatuses.filter((value) => value !== "รอตรวจสอบ");

  const [inspectionYear, setInspectionYear] = useState(String(currentInspectionYear));
  const [search, setSearch] = useState("");
  const [assetFiscalYear, setAssetFiscalYear] = useState("ทั้งหมด");
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [assetStatus, setAssetStatus] = useState("ทั้งหมด");
  const [inspectionResult, setInspectionResult] = useState("ทั้งหมด");
  const [selectedAsset, setSelectedAsset] = useState<AssetListRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ asset: AssetListRow; inspection: AnnualInspection } | null>(null);
  const [inspectionDate, setInspectionDate] = useState(today);
  const [foundLocation, setFoundLocation] = useState("");
  const [inspectorName, setInspectorName] = useState("คณะกรรมการตรวจสอบครุภัณฑ์");
  const [modalResult, setModalResult] = useState("ใช้งานได้");
  const [evidenceImages, setEvidenceImages] = useState<EvidenceImage[]>([]);
  const [evidenceError, setEvidenceError] = useState("");
  const [isMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  const [inspectionNote, setInspectionNote] = useState("");
  const [toast, setToast] = useState("");
  const [previewImage, setPreviewImage] = useState<EvidenceImage | null>(null);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    const inspectionByAsset = new Map(
      annualInspections
        .filter((item) => item.inspectionYear === inspectionYear)
        .map((item) => [item.assetId, item]),
    );
    return assets.map((asset) => {
      const inspection = inspectionByAsset.get(asset.id);
      return { asset, inspection };
    }).filter(({ asset, inspection }) => {
      const inspectionText = inspection ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจสอบ";
      const searchText = `${asset.assetNumber} ${asset.assetName} ${asset.organization} ${asset.location} ${asset.status} ${inspectionText}`.toLowerCase();
      const matchSearch = !cleanSearch || searchText.includes(cleanSearch);
      const matchAssetYear = assetFiscalYear === "ทั้งหมด" || asset.fiscalYear === assetFiscalYear;
      const matchOrganization = organization === "ทั้งหมด" || asset.organization === organization;
      const matchStatus = assetStatus === "ทั้งหมด" || asset.status === assetStatus;
      const matchInspection =
        inspectionResult === "ทั้งหมด" ||
        (inspectionResult === "ตรวจสอบแล้ว" && Boolean(inspection)) ||
        (inspectionResult === "ยังไม่ได้ตรวจสอบ" && !inspection);
      return matchSearch && matchAssetYear && matchOrganization && matchStatus && matchInspection;
    });
  }, [annualInspections, assetFiscalYear, assetStatus, assets, inspectionResult, inspectionYear, organization, search]);

  const totalCount = rows.length;
  const inspectedCount = rows.filter((row) => row.inspection).length;
  const pendingCount = totalCount - inspectedCount;
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasActiveAuditFilters = Boolean(search.trim()) || assetFiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || assetStatus !== "ทั้งหมด" || inspectionResult !== "ทั้งหมด";
  const clearAuditFilters = () => {
    setSearch("");
    setAssetFiscalYear("ทั้งหมด");
    setOrganization("ทั้งหมด");
    setAssetStatus("ทั้งหมด");
    setInspectionResult("ทั้งหมด");
    setPage(1);
  };
  const auditResultText = rows.length > 0
    ? `แสดง ${((safePage - 1) * pageSize + 1).toLocaleString("th-TH")}-${Math.min(safePage * pageSize, rows.length).toLocaleString("th-TH")} จากทั้งหมด ${rows.length.toLocaleString("th-TH")} รายการ`
    : "แสดง 0 รายการ";

  const openInspectionModal = (asset: AssetListRow) => {
    const activeInspectionYear = String(getCurrentInspectionYear());
    const existing = annualInspections.find((item) => item.assetId === asset.id && item.inspectionYear === activeInspectionYear);
    setInspectionYear(activeInspectionYear);
    setSelectedAsset(asset);
    setInspectionDate(new Date().toISOString().slice(0, 10));
    setFoundLocation(existing?.foundLocation ?? asset.location);
    setInspectorName(existing?.inspectorName ?? "คณะกรรมการตรวจสอบครุภัณฑ์");
    setModalResult(existing?.result && modalStatusOptions.includes(existing.result)
      ? existing.result
      : modalStatusOptions.includes(asset.status)
        ? asset.status
        : "ใช้งานได้");
    setEvidenceImages(existing?.evidenceImages ?? []);
    setEvidenceError(existing?.evidenceImages?.length ? "" : "กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ");
    setInspectionNote(existing?.note ?? "");
  };

  const readEvidenceFile = (file: File) => uploadImage(file, "evidence");

  const handleEvidenceImageChange = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const maxEvidence = 3;
    const remaining = maxEvidence - evidenceImages.length;
    if (remaining <= 0) return;

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    const errors: string[] = [];

    if (selectedFiles.length > remaining) {
      errors.push(`เลือกได้อีก ${remaining} รูป (ครบ ${maxEvidence} รูปแล้ว ใช้ได้ ${remaining} รูปแรกเท่านั้น)`);
    }
    const limitedFiles = selectedFiles.slice(0, remaining);
    const validFiles = limitedFiles.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isAcceptedImage =
        acceptedTypes.includes(file.type) ||
        ["jpg", "jpeg", "png", "webp"].includes(extension ?? "");
      if (!isAcceptedImage) {
        errors.push("รองรับเฉพาะไฟล์รูปภาพเท่านั้น");
        return false;
      }
      if (file.size > maxSize) {
        errors.push("ขนาดไฟล์ต้องไม่เกิน 5MB ต่อรูป");
        return false;
      }
      return true;
    });

    if (errors.length > 0) {
      setEvidenceError(errors[0]);
      setToast(errors[0]);
      window.setTimeout(() => setToast(""), 3500);
    }

    if (validFiles.length === 0) {
      // Do not clear existing images — just report the error.
      if (errors.length === 0 && evidenceImages.length === 0) {
        setEvidenceError("กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ");
      }
      return;
    }

    try {
      const newImages = await Promise.all(validFiles.map(readEvidenceFile));
      // Append to existing — never replace.
      setEvidenceImages((prev) => [...prev, ...newImages].slice(0, maxEvidence));
      if (errors.length === 0) setEvidenceError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถอ่านรูปหลักฐานได้";
      setEvidenceError(message);
      setToast(message);
      window.setTimeout(() => setToast(""), 3500);
    }
  };

  const removeEvidenceImage = (imageUrl: string) => {
    setEvidenceImages((items) => {
      const nextItems = items.filter((image) => image.url !== imageUrl);
      if (nextItems.length === 0) {
        setEvidenceError("กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ");
      } else {
        setEvidenceError("");
      }
      return nextItems;
    });
  };

  const confirmCancelInspection = () => {
    if (!cancelTarget) return;
    // Cancel the year of the inspection actually targeted, not whatever the audit-year
    // selector happens to show now (they can differ if the selector changed meanwhile).
    const targetYear = cancelTarget.inspection.inspectionYear;
    onCancelAnnualInspection(cancelTarget.asset, targetYear, cancelTarget.inspection);
    setCancelTarget(null);
    setToast(`ยกเลิกผลตรวจสอบปี ${targetYear} เรียบร้อยแล้ว`);
    window.setTimeout(() => setToast(""), 3000);
  };

  const saveInspection = () => {
    if (!selectedAsset) return;
    if (!inspectionYear || !inspectionDate || !foundLocation.trim() || !inspectorName.trim() || !modalResult || evidenceImages.length === 0) {
      const message = evidenceImages.length === 0
        ? "กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ"
        : "กรุณากรอกข้อมูลการตรวจสอบให้ครบก่อนบันทึก";
      setEvidenceError(message);
      setToast(message);
      window.setTimeout(() => setToast(""), 3500);
      return;
    }
    const displayDate = formatThaiDate(inspectionDate);
    const existing = annualInspections.find((item) => item.assetId === selectedAsset.id && item.inspectionYear === inspectionYear);
    const savedAt = new Date().toISOString();
    const nextInspection: AnnualInspection = {
      id: existing?.id ?? `inspection-${selectedAsset.id}-${inspectionYear}`,
      assetId: selectedAsset.id,
      assetCode: selectedAsset.assetCode,
      inspectionYear,
      inspectionDate: displayDate,
      foundLocation,
      inspectorName,
      result: modalResult,
      evidenceFileNames: evidenceImages.map((image) => image.name),
      evidenceImages,
      note: inspectionNote,
      previousStatus: existing ? (existing.previousStatus ?? undefined) : selectedAsset.status,
      createdAt: existing?.createdAt ?? savedAt,
      updatedAt: savedAt,
    };
    onSaveAnnualInspection(nextInspection);
    onSaveInspectionStatus(selectedAsset, modalResult, displayDate, inspectionNote);
    setSelectedAsset(null);
    setToast(`บันทึกผลตรวจสอบปี ${inspectionYear} เรียบร้อยแล้ว`);
    window.setTimeout(() => setToast(""), 3000);
  };

  const summaryItems = [
    {
      label: "ครุภัณฑ์ทั้งหมด",
      value: totalCount,
      subtitle: "ตามเงื่อนไขที่เลือก",
      cardClass: "border-[#BFDBFE] bg-[#EFF6FF] shadow-glow",
      accentClass: "bg-[#2563EB]",
      subtitleClass: "text-[#64748B]",
    },
    {
      label: "ตรวจสอบแล้ว",
      value: inspectedCount,
      subtitle: `มีผลตรวจของปี ${inspectionYear}`,
      cardClass: "border-[#A7F3D0] bg-[#ECFDF5] shadow-glow",
      accentClass: "bg-[#059669]",
      subtitleClass: "text-[#64748B]",
    },
    {
      label: "ยังไม่ได้ตรวจสอบ",
      value: pendingCount,
      subtitle: `ยังไม่มีผลตรวจของปี ${inspectionYear}`,
      cardClass: "border-[#FEF08A] bg-[#FEFCE8] shadow-glow",
      accentClass: "bg-[#CA8A04]",
      subtitleClass: "text-[#64748B]",
    },
  ];
  const canSaveInspection = Boolean(
    inspectionYear &&
    inspectionDate &&
    foundLocation.trim() &&
    inspectorName.trim() &&
    modalResult &&
    evidenceImages.length > 0,
  );

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-primary/30 bg-surfaceSoft px-5 py-3 text-sm font-semibold text-primary shadow-glow">
          {toast}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {summaryItems.map((item) => (
          <article key={item.label} className={`relative overflow-hidden rounded-lg border bg-surface p-4 ${item.cardClass}`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${item.accentClass}`} aria-hidden="true" />
            <p className="text-xs font-semibold text-ink">{item.label}</p>
            <strong className="mt-2 block text-2xl font-extrabold text-ink">{item.value.toLocaleString("th-TH")}</strong>
            <p className={`mt-1 text-xs ${item.subtitleClass}`}>{item.subtitle}</p>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <label className="block md:col-span-2 xl:col-span-1">
            <span className="text-sm font-semibold text-ink">ค้นหา</span>
            <div className="relative mt-2">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                placeholder="ค้นหาครุภัณฑ์"
                className="h-12 w-full rounded-lg border border-lineStrong bg-surface py-3 pl-9 pr-10 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-muted hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ล้างคำค้นหา"
                >
                  x
                </button>
              )}
            </div>
          </label>
          <SelectField label="ปีงบประมาณ" value={assetFiscalYear} onChange={(v) => { setAssetFiscalYear(v); setPage(1); }} options={assetFiscalYearOptions} />
          <SelectField label="หน่วยงาน" value={organization} onChange={(v) => { setOrganization(v); setPage(1); }} options={organizationOptions} />
          <SelectField label="สถานะ" value={assetStatus} onChange={(v) => { setAssetStatus(v); setPage(1); }} options={statusOptions} />
          <SelectField label="ผลการตรวจสอบ" value={inspectionResult} onChange={(v) => { setInspectionResult(v); setPage(1); }} options={inspectionStateOptions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm font-normal text-muted">
            {auditResultText}
          </p>
          {hasActiveAuditFilters && (
            <button
              type="button"
              onClick={clearAuditFilters}
              className="rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
        {hasActiveAuditFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search.trim() && <FilterChip label="คำค้นหา" value={search.trim()} onClear={() => setSearch("")} />}
            {assetFiscalYear !== "ทั้งหมด" && <FilterChip label="ปีงบประมาณ" value={assetFiscalYear} onClear={() => setAssetFiscalYear("ทั้งหมด")} />}
            {organization !== "ทั้งหมด" && <FilterChip label="หน่วยงาน" value={organization} onClear={() => setOrganization("ทั้งหมด")} />}
            {assetStatus !== "ทั้งหมด" && <FilterChip label="สถานะ" value={assetStatus} onClear={() => setAssetStatus("ทั้งหมด")} />}
            {inspectionResult !== "ทั้งหมด" && <FilterChip label="ผลตรวจ" value={inspectionResult} onClear={() => setInspectionResult("ทั้งหมด")} />}
          </div>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {visibleRows.map(({ asset, inspection }, index) => (
          <article key={asset.assetCode} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted">ลำดับ {(safePage - 1) * pageSize + index + 1}</p>
                <p className="mt-1 break-words text-sm font-bold text-primary">{asset.assetNumber}</p>
                <h3 className="mt-1 break-words text-base font-extrabold text-ink">{asset.assetName}</h3>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${inspection ? inspectionStatusColors.inspected.badge : inspectionStatusColors.pending.badge}`}>{inspection ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจ"}</span>
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs font-semibold text-muted">องค์กร/ฝ่าย/ชมรม</dt><dd className="mt-1 break-words text-ink">{asset.organization}</dd></div>
              <div><dt className="text-xs font-semibold text-muted">สถานที่จัดเก็บ</dt><dd className="mt-1 text-ink">{asset.location}</dd></div>
              <div><dt className="text-xs font-semibold text-muted">สถานะครุภัณฑ์</dt><dd className="mt-1"><StatusBadge value={asset.status} /></dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => openInspectionModal(asset)} className="min-h-12 rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white">ตรวจสอบ</button>
              <button type="button" disabled={!inspection} onClick={() => inspection && setCancelTarget({ asset, inspection })} className={`min-h-12 rounded-md border px-4 py-2 text-sm font-semibold ${inspection ? buttonColors.cancelEnabled : `cursor-not-allowed ${buttonColors.cancelDisabled}`}`}>ยกเลิก</button>
            </div>
          </article>
        ))}
        {visibleRows.length === 0 && <div className="rounded-lg border border-line bg-surface px-4 py-10 text-center"><p className="font-bold text-ink">ไม่พบข้อมูลครุภัณฑ์</p><p className="mt-2 text-sm text-muted">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p></div>}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface p-3 text-sm">
          <button onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={safePage === 1} className="min-h-11 rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:opacity-40">ก่อนหน้า</button>
          <span className="text-center font-bold text-ink">หน้า {safePage}/{pageCount}</span>
          <button onClick={() => setPage((v) => Math.min(pageCount, v + 1))} disabled={safePage === pageCount} className="min-h-11 rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:opacity-40">ถัดไป</button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-line bg-surface md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[40px]" />
              <col className="w-[50px]" />
              <col className="w-[150px]" />
              <col className="w-[210px]" />
              <col className="w-[145px]" />
              <col className="w-[130px]" />
              <col className="w-[100px]" />
              <col className="w-[135px]" />
              <col className="w-[125px]" />
            </colgroup>
            <thead className="bg-surfaceSoft text-ink">
              <tr>
                {["ผล", "ลำดับ", "หมายเลขครุภัณฑ์", "ชื่อครุภัณฑ์", "หน่วยงาน", "สถานที่จัดเก็บ", "สถานะ", "ผลการตรวจสอบ", "จัดการ"].map((heading) => (
                  <th key={heading} className="border-b border-line px-2 py-2.5 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
              {visibleRows.map(({ asset, inspection }, index) => (
                <tr key={asset.assetCode} className="align-middle hover:bg-white/[0.03]">
                  <td className="px-2 py-3 text-center align-middle">
                    <span
                      title={inspection ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจสอบ"}
                      className={`mx-auto block h-3 w-3 rounded-full ring-2 ring-surface ${inspection ? inspectionStatusColors.inspected.dot : inspectionStatusColors.pending.dot}`}
                    />
                  </td>
                  <td className="px-2 py-3 text-muted">{(safePage - 1) * pageSize + index + 1}</td>
                  <td className="px-2 py-3 font-semibold text-primary" title={asset.assetNumber}>
                    <div className="line-clamp-2 break-words">{asset.assetNumber}</div>
                  </td>
                  <td className="px-2 py-3 font-semibold text-ink" title={asset.assetName}>
                    <div className="truncate">{asset.assetName}</div>
                  </td>
                  <td className="px-2 py-3 text-ink" title={asset.organization}>
                    <div className="truncate">{asset.organization}</div>
                  </td>
                  <td className="px-2 py-3 text-ink" title={asset.location}>
                    <div className="truncate">{asset.location}</div>
                  </td>
                  <td className="px-2 py-3"><StatusBadge value={asset.status} /></td>
                  <td className="px-2 py-3">
                    {inspection ? (
                      <span title={`ตรวจสอบแล้ว (ปี ${inspectionYear})`} className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${inspectionStatusColors.inspected.badge}`}>
                        ตรวจสอบแล้ว ({inspectionYear})
                      </span>
                    ) : (
                      <span title={`ยังไม่ได้ตรวจสอบ (ปี ${inspectionYear})`} className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${inspectionStatusColors.pending.badge}`}>
                        ยังไม่ได้ตรวจ ({inspectionYear})
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openInspectionModal(asset)} className="whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs font-extrabold text-white hover:bg-primary-hover">
                        ตรวจสอบ
                      </button>
                      <button
                        type="button"
                        disabled={!inspection}
                        title={inspection ? "ยกเลิกผลตรวจสอบประจำปี" : "ยังไม่มีผลตรวจสอบของปีนี้ให้ยกเลิก"}
                        onClick={() => inspection && setCancelTarget({ asset, inspection })}
                        className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold ${
                          inspection
                            ? `cursor-pointer ${buttonColors.cancelEnabled}`
                            : `cursor-not-allowed ${buttonColors.cancelDisabled}`
                        }`}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-ink">ไม่พบข้อมูลครุภัณฑ์</p>
                      <p className="mt-2 text-sm leading-6 text-muted">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองที่เลือกอยู่</p>
                      {hasActiveAuditFilters && (
                        <button
                          type="button"
                          onClick={clearAuditFilters}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink">
          <span>{auditResultText}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <span className="rounded-md bg-surfaceSoft px-3 py-2 font-bold text-ink">
              หน้า {safePage}/{pageCount}
            </span>
            <button
              onClick={() => setPage((v) => Math.min(pageCount, v + 1))}
              disabled={safePage === pageCount}
              className="rounded-md border border-line px-3 py-2 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-2 sm:p-4">
          <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-line bg-surface p-4 shadow-2xl sm:max-h-[90vh] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-ink">บันทึกผลตรวจสอบ</h3>
                <p className="mt-3 text-base font-extrabold text-ink">{selectedAsset.assetName}</p>
                <p className="mt-1 text-sm font-semibold text-primary">{selectedAsset.assetNumber}</p>
              </div>
              <CloseIconButton onClick={() => setSelectedAsset(null)} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-ink">ปีที่ตรวจสอบ</span>
                <div className="mt-2 min-h-12 w-full rounded-lg border border-lineStrong bg-surface px-4 py-3 text-sm font-semibold text-ink">
                  {inspectionYear}
                </div>
              </label>
              <ThaiDateField label="วันที่ตรวจสอบ" value={inspectionDate} onChange={setInspectionDate} />
              <Field label="สถานที่ที่พบครุภัณฑ์" value={foundLocation} onChange={(event) => setFoundLocation(event.target.value)} placeholder="ระบุสถานที่ที่พบครุภัณฑ์" />
              <Field label="ผู้ตรวจสอบ" value={inspectorName} onChange={(event) => setInspectorName(event.target.value)} placeholder="ชื่อผู้ตรวจสอบ" />
              <SelectField label="สถานะครุภัณฑ์" value={modalResult} onChange={setModalResult} options={modalStatusOptions} />
              <div className="space-y-3 md:col-span-2">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    รูปหลักฐาน{" "}
                    <span className="font-normal text-muted">
                      ({evidenceImages.length}/3 รูป)
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {isMobile
                      ? "ถ่ายรูปหรือเลือกจากคลังภาพ สูงสุด 3 รูป ไม่เกิน 5MB ต่อรูป"
                      : "เลือกรูปภาพจากคอมพิวเตอร์ สูงสุด 3 รูป ไม่เกิน 5MB ต่อรูป"}
                  </p>
                  {evidenceImages.length < 3 ? (
                    isMobile ? (
                      <div className="mt-2 flex gap-2">
                        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 bg-slate-950/40 px-3 py-3 hover:border-primary">
                          <span className="text-sm font-semibold text-gold">ถ่ายรูป</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            onChange={(event) => {
                              void handleEvidenceImageChange(event.target.files);
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <label className="flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/40 bg-slate-950/40 px-3 py-3 hover:border-primary">
                          <span className="text-sm font-semibold text-gold">เลือกรูปภาพ</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="sr-only"
                            onChange={(event) => {
                              void handleEvidenceImageChange(event.target.files);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-slate-950/40 px-4 py-3 hover:border-primary">
                        <span className="text-sm font-semibold text-gold">เลือกรูปภาพ</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            void handleEvidenceImageChange(event.target.files);
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )
                  ) : (
                    <p className="mt-2 rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm text-muted">
                      เพิ่มรูปภาพครบ 3 รูปแล้ว หากต้องการเปลี่ยน ให้ลบรูปที่ไม่ต้องการก่อน
                    </p>
                  )}
                  {(evidenceError || evidenceImages.length === 0) && (
                    <p className="mt-2 text-xs font-semibold text-rose-200">
                      {evidenceError || "กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ"}
                    </p>
                  )}
                </div>
                {evidenceImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {evidenceImages.map((image, index) => (
                      <figure
                        key={image.url}
                        className="relative overflow-hidden rounded-md border border-line bg-slate-950/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={image.url}
                          alt={image.name}
                          className="h-24 w-full cursor-pointer object-cover"
                          onClick={() => setPreviewImage(image)}
                        />
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); removeEvidenceImage(image.url); }}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-sm font-bold leading-none text-danger shadow hover:bg-red-100"
                          aria-label="ลบรูปภาพ"
                        >
                          ×
                        </button>
                        <div className="p-2">
                          <p className="text-xs font-semibold text-muted">รูปที่ {index + 1}</p>
                          <p className="truncate text-[11px] text-ink" title={image.name}>
                            {image.name}
                          </p>
                        </div>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <TextAreaField label="หมายเหตุ" value={inspectionNote} onChange={(event) => setInspectionNote(event.target.value)} placeholder="หมายเหตุการตรวจสอบ" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button onClick={() => setSelectedAsset(null)} className="min-h-12 rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ยกเลิก</button>
              <button
                onClick={saveInspection}
                disabled={!canSaveInspection}
                title={canSaveInspection ? "บันทึกผลตรวจสอบ" : "กรุณากรอกข้อมูลให้ครบและอัปโหลดรูปหลักฐานอย่างน้อย 1 รูป"}
                className="min-h-12 rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-gold"
              >
                บันทึกผลตรวจสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow hover:bg-slate-100"
              aria-label="ปิด"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-2 text-center text-sm text-white/80">{previewImage.name}</p>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg rounded-lg border border-rose-300/20 bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-white">ยกเลิกผลตรวจสอบประจำปี</h3>
              <CloseIconButton onClick={() => setCancelTarget(null)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">
              ต้องการยกเลิกผลตรวจสอบของครุภัณฑ์รายการนี้ในปี {inspectionYear} ใช่หรือไม่?
            </p>
            <div className="mt-4 rounded-lg border border-line bg-slate-950/30 p-4 text-sm">
              <p className="text-muted">หมายเลขครุภัณฑ์</p>
              <p className="mt-1 font-semibold text-primary">{cancelTarget.asset.assetNumber}</p>
              <p className="mt-3 text-muted">ชื่อครุภัณฑ์</p>
              <p className="mt-1 font-semibold text-white">{cancelTarget.asset.assetName}</p>
              <p className="mt-3 text-muted">ปีที่ตรวจสอบ</p>
              <p className="mt-1 font-semibold text-white">{inspectionYear}</p>
            </div>
            <p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100">
              การยกเลิกนี้จะลบเฉพาะผลตรวจสอบประจำปี ไม่ได้ลบข้อมูลครุภัณฑ์หลัก
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={confirmCancelInspection}
                className="rounded-md bg-rose-500 px-4 py-2 text-sm font-extrabold text-white hover:bg-rose-400"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


export default function AuditRoute() {
  const { permissions, assets, annualInspections, onSaveAnnualInspection, onCancelAnnualInspection, onSaveInspectionStatus } = useAppData();
  if (!permissions.canInspect) return <PlaceholderPage title="ไม่มีสิทธิ์ตรวจสอบประจำปี" />;
  return (
    <AuditPage
      assets={assets}
      annualInspections={annualInspections}
      onSaveAnnualInspection={onSaveAnnualInspection}
      onCancelAnnualInspection={onCancelAnnualInspection}
      onSaveInspectionStatus={onSaveInspectionStatus}
    />
  );
}
