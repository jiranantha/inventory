"use client";

import { useMemo, useRef, useState } from "react";
import { CloseIconButton, DetailInfoItem, Field, PhoneField, SelectField, TextAreaField } from "@/components/ui";
import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";
import { AppUser, Permissions, RoleDefinition, UserRole, getPermissionLabel, getRoleDefinition, noPermissions } from "@/lib/permissions";
import { ADMIN_IMPORT_FIELD_DEFINITIONS, buildAdminAssetImportPreview, buildUnitResponsibleLookup, getLatestAssetSequenceForYear, guessColumnMapping, summarizeAdminAssetImport } from "@/lib/assets";
import { normalizeOrganizationName } from "@/lib/organizations";
import { readExcelWorkbookForMapping } from "@/lib/import-export";
import { uniqueSorted } from "@/lib/utils";
import { AdminAssetImportRow, AdminImportColumnMapping, AssetImportInsertSummary, AssetListRow, DetectedExcelWorkbook, MasterDataItem, UnitResponsiblePerson, UnitResponsibleUpdateHistory } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

function ActiveToggle({ checked, onChange, disabled, ariaLabel }: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? "Toggle active status"}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className="flex min-h-[44px] w-14 shrink-0 cursor-pointer items-center justify-center bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className={`relative inline-flex h-6 w-14 shrink-0 rounded-full border transition-colors duration-200 ${checked ? "border-primary bg-primary-soft" : "border-line bg-transparent"}`}>
        <span className={`pointer-events-none absolute inset-0 flex items-center text-[9px] font-extrabold ${checked ? "justify-start pl-1.5 text-primary" : "justify-end pr-1.5 text-muted"}`}>
          {checked ? "ON" : "OFF"}
        </span>
        <span className={`pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-8" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function normalizeMasterDataName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function MasterDataPanel({ title, description, items, onChange, addLabel, searchPlaceholder }: { title: string; description: string; items: MasterDataItem[]; onChange: (items: MasterDataItem[]) => void; addLabel: string; searchPlaceholder: string }) {
  const { showToast } = useAppData();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  // No createdAt column exists on master_data/organizations (and we're not adding one
  // just for ordering), so "newest first" is tracked purely client-side for this
  // session — normalized names, most-recently-added first.
  const [recentNames, setRecentNames] = useState<string[]>([]);

  const save = () => {
    const name = draft.trim();
    if (!name) {
      showToast("กรุณากรอกชื่อรายการ");
      return;
    }
    const normalized = normalizeMasterDataName(name);
    const duplicate = items.find((item) => item.id !== editingId && normalizeMasterDataName(item.name) === normalized);
    if (duplicate) {
      showToast(duplicate.active ? "มีรายการนี้อยู่ในระบบแล้ว" : "มีรายการนี้อยู่แล้ว แต่ถูกปิดใช้งานอยู่ กรุณาเปิดใช้งานรายการเดิม");
      return;
    }
    if (editingId === null) {
      onChange([...items, { id: Date.now(), name, active: true }]);
      setRecentNames((names) => [normalized, ...names]);
      showToast("เพิ่มรายการเรียบร้อยแล้ว");
    } else {
      onChange(items.map((item) => item.id === editingId ? { ...item, name } : item));
    }
    setDraft("");
    setEditingId(null);
  };

  const visibleItems = useMemo(() => {
    const recentIndex = new Map(recentNames.map((name, index) => [name, index]));
    const sorted = [...items].sort((a, b) => {
      const rankA = recentIndex.get(normalizeMasterDataName(a.name)) ?? Number.POSITIVE_INFINITY;
      const rankB = recentIndex.get(normalizeMasterDataName(b.name)) ?? Number.POSITIVE_INFINITY;
      return rankA - rankB;
    });
    const cleanSearch = normalizeMasterDataName(search);
    if (!cleanSearch) return sorted;
    return sorted.filter((item) => normalizeMasterDataName(item.name).includes(cleanSearch));
  }, [items, recentNames, search]);

  return (
    <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-line bg-surface p-6">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="relative sm:flex-[1_1_45%]">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-h-11 w-full rounded-lg border border-lineStrong bg-surface py-2 pl-9 pr-10 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
          />
          {search.trim() && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-muted hover:text-ink"
              aria-label="ล้างคำค้นหา"
            >
              x
            </button>
          )}
        </div>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={addLabel} className="min-h-11 rounded-lg border border-lineStrong bg-surface px-4 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-primary sm:flex-[1_1_40%]" />
        <button type="button" onClick={save} className="min-h-11 shrink-0 whitespace-nowrap rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-hover">{editingId === null ? "เพิ่มรายการ" : "บันทึก"}</button>
        {editingId !== null && <button type="button" onClick={() => { setEditingId(null); setDraft(""); }} className="min-h-11 shrink-0 whitespace-nowrap rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink">ยกเลิก</button>}
      </div>
      <div className="mt-5 divide-y divide-line overflow-hidden rounded-lg border border-line">
        {visibleItems.length === 0 && search.trim() && (
          <p className="bg-surfaceSoft px-5 py-6 text-center text-sm text-muted">ไม่พบรายการที่ค้นหา</p>
        )}
        {visibleItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 bg-surfaceSoft px-5 py-4">
            <div className="min-w-0"><p className={`break-words font-semibold ${item.active ? "text-ink" : "text-muted"}`}>{item.name}</p><p className="mt-1 text-xs text-muted">{item.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</p></div>
            <div className="flex shrink-0 items-center gap-3">
              <button type="button" onClick={() => { setEditingId(item.id); setDraft(item.name); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950">แก้ไข</button>
              <ActiveToggle checked={item.active} onChange={() => onChange(items.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry))} ariaLabel="Toggle item active status" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const ADMIN_IMPORT_TEMPLATE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1KkhtOcCl9N9OPIUkzt1KnnsBl4qEmkvC64SyedcEfNY/edit?usp=sharing";

const IMPORT_STATUS_BADGE_CLASS: Record<AdminAssetImportRow["statusKind"], string> = {
  ready: "border-emerald-300/40 bg-emerald-400/10 text-emerald-200",
  duplicate: "border-amber-300/40 bg-amber-400/10 text-amber-200",
  incomplete: "border-red-300/40 bg-red-400/10 text-red-200",
  invalid: "border-red-300/40 bg-red-400/10 text-red-200",
};

// Split once, outside the component, since ADMIN_IMPORT_FIELD_DEFINITIONS is a
// static module-level list — required fields render up front, the rest sit in
// a collapsible "เพิ่มเติม" section so the mapping UI isn't overwhelming.
const requiredImportFields = ADMIN_IMPORT_FIELD_DEFINITIONS.filter((field) => field.required);
const optionalImportFields = ADMIN_IMPORT_FIELD_DEFINITIONS.filter((field) => !field.required);

function ExcelImportPanel({ assets, onImportAssets, unitResponsiblePersons }: { assets: AssetListRow[]; onImportAssets: (rows: AssetListRow[]) => Promise<AssetImportInsertSummary>; unitResponsiblePersons: UnitResponsiblePerson[] }) {
  const { showToast } = useAppData();
  const unitResponsibleLookup = useMemo(() => buildUnitResponsibleLookup(unitResponsiblePersons), [unitResponsiblePersons]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentThaiYear = new Date().getFullYear() + 543;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [defaultFiscalYear, setDefaultFiscalYear] = useState(String(currentThaiYear));
  const [workbook, setWorkbook] = useState<DetectedExcelWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<AdminImportColumnMapping>({});
  const [previewRows, setPreviewRows] = useState<AdminAssetImportRow[] | null>(null);
  const [checkError, setCheckError] = useState("");
  const [mappingError, setMappingError] = useState("");
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [insertSummary, setInsertSummary] = useState<AssetImportInsertSummary | null>(null);

  const activeSheet = workbook?.sheets[sheetIndex] ?? null;
  const previewSummary = useMemo(() => (previewRows ? summarizeAdminAssetImport(previewRows) : null), [previewRows]);
  const readyRows = useMemo(() => previewRows?.filter((row) => row.statusKind === "ready" && row.asset) ?? [], [previewRows]);

  const resetAll = () => {
    setWorkbook(null);
    setSheetIndex(0);
    setMapping({});
    setPreviewRows(null);
    setCheckError("");
    setMappingError("");
    setShowOptionalFields(false);
    setInsertSummary(null);
  };

  const handleFileChange = (file: File | null) => {
    setSelectedFile(file);
    resetAll();
  };

  const handleCheckFile = async () => {
    if (!selectedFile) {
      showToast("กรุณาเลือกไฟล์ Excel ก่อน");
      return;
    }
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setCheckError("รองรับเฉพาะไฟล์ .xlsx และ .xls เท่านั้น");
      return;
    }
    if (!/^[0-9]{4}$/.test(defaultFiscalYear)) {
      setCheckError("กรุณาระบุปีงบประมาณเริ่มต้นเป็นตัวเลข 4 หลัก");
      return;
    }
    setChecking(true);
    resetAll();
    try {
      const parsed = await readExcelWorkbookForMapping(selectedFile);
      if (!parsed.sheets.length || parsed.sheets.every((sheet) => sheet.rows.length === 0)) {
        setCheckError("ไม่พบข้อมูลในไฟล์ Excel กรุณาตรวจสอบไฟล์อีกครั้ง");
        return;
      }
      setWorkbook(parsed);
      setSheetIndex(0);
      setMapping(guessColumnMapping(parsed.sheets[0].columns));
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ Excel ได้");
    } finally {
      setChecking(false);
    }
  };

  const handleSheetChange = (index: number) => {
    setSheetIndex(index);
    setMapping(guessColumnMapping(workbook?.sheets[index]?.columns ?? []));
    setPreviewRows(null);
    setMappingError("");
    setInsertSummary(null);
  };

  const handleMappingChange = (field: (typeof ADMIN_IMPORT_FIELD_DEFINITIONS)[number]["key"], columnId: string) => {
    // A blank selection (columnId === "") means the field is simply unused —
    // there is no separate "ไม่ใช้คอลัมน์นี้" sentinel value.
    setMapping((current) => ({ ...current, [field]: columnId || null }));
    setPreviewRows(null);
    setMappingError("");
    setInsertSummary(null);
  };

  const handleShowPreview = () => {
    if (!activeSheet) return;
    if (!mapping.assetName) {
      setMappingError("กรุณาจับคู่คอลัมน์ชื่อรายการครุภัณฑ์ก่อนแสดงตัวอย่างข้อมูล");
      return;
    }
    if (!mapping.assetNumber && !mapping.universityAssetNumber) {
      setMappingError("กรุณาจับคู่เลขครุภัณฑ์อย่างน้อย 1 ประเภท");
      return;
    }
    setMappingError("");
    const preview = buildAdminAssetImportPreview(activeSheet.rows, mapping, assets, defaultFiscalYear, unitResponsibleLookup);
    setPreviewRows(preview);
    setInsertSummary(null);
  };

  const handleConfirmImport = async () => {
    if (readyRows.length === 0) return;
    setImporting(true);
    try {
      const summary = await onImportAssets(readyRows.map((row) => row.asset as AssetListRow));
      setInsertSummary(summary);
      setPreviewRows(null);
      setSelectedFile(null);
      resetAll();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      showToast(error instanceof Error ? error.message : "นำเข้าข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">นำเข้าข้อมูล Excel</h2>
        <p className="mt-2 text-sm text-muted">นำเข้าข้อมูลครุภัณฑ์จำนวนมากจากไฟล์ Excel เข้าสู่ระบบโดยตรง เฉพาะผู้ดูแลระบบเท่านั้น</p>
        <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          การนำเข้าข้อมูลจะเพิ่มข้อมูลใหม่เข้าสู่ระบบจริง กรุณาตรวจสอบข้อมูลก่อนยืนยัน
        </p>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">คำแนะนำการนำเข้า</h3>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>รองรับเฉพาะไฟล์ .xlsx และ .xls เท่านั้น</li>
          <li>ระบบไม่บังคับชื่อคอลัมน์ในไฟล์ Excel ผู้ดูแลระบบสามารถเลือกจับคู่คอลัมน์จากไฟล์กับข้อมูลในระบบก่อนนำเข้าได้</li>
          <li>ไฟล์นำเข้าควรมีเลขครุภัณฑ์อย่างน้อยหนึ่งประเภท ได้แก่ เลขทะเบียนควบคุมกิจกรรมนักศึกษา หรือเลขครุภัณฑ์มหาวิทยาลัย ระบบจะใช้เลขจากไฟล์โดยตรงและจะไม่รันเลขใหม่ระหว่างนำเข้า</li>
          <li>หากไม่จับคู่คอลัมน์ปีงบประมาณ ระบบจะใช้ปีงบประมาณเริ่มต้นที่กำหนดไว้ด้านล่าง</li>
          <li>ข้อมูลที่ซ้ำกับระบบ หรือข้อมูลไม่ครบ จะไม่ถูกนำเข้า</li>
          <li className="font-semibold text-ink">กรุณาตรวจสอบตัวอย่างข้อมูลก่อนกดยืนยันนำเข้า เพราะข้อมูลจะถูกเพิ่มเข้าสู่ฐานข้อมูลจริง</li>
        </ul>
        <a
          href={ADMIN_IMPORT_TEMPLATE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
        >
          เปิดแบบฟอร์ม Google Sheet
        </a>
      </div>

      <div className="rounded-lg border border-line bg-surface p-6">
        <h3 className="text-base font-bold text-ink">เลือกไฟล์ Excel</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block sm:flex-[1_1_50%]">
            <span className="text-sm font-semibold text-ink">ไฟล์ Excel (.xlsx, .xls)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-lineStrong bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-bold file:text-white"
            />
          </label>
          <label className="block sm:w-48">
            <span className="text-sm font-semibold text-ink">ปีงบประมาณเริ่มต้น (ถ้าไม่จับคู่คอลัมน์)</span>
            <input
              value={defaultFiscalYear}
              onChange={(event) => setDefaultFiscalYear(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
              inputMode="numeric"
              className="mt-2 min-h-11 w-full rounded-lg border border-lineStrong bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            onClick={handleCheckFile}
            disabled={!selectedFile || checking}
            className="min-h-11 shrink-0 whitespace-nowrap rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "กำลังตรวจสอบ..." : "ตรวจสอบไฟล์"}
          </button>
        </div>
        {checkError && <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm font-semibold text-red-200">{checkError}</p>}
      </div>

      {workbook && activeSheet && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">จับคู่คอลัมน์</h3>
          <p className="mt-2 rounded-md border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100">
            กรุณาจับคู่คอลัมน์จากไฟล์ Excel กับข้อมูลในระบบก่อนนำเข้า
          </p>

          {workbook.sheets.length > 1 && (
            <label className="mt-4 block sm:w-72">
              <span className="text-sm font-semibold text-ink">เลือกชีตข้อมูล</span>
              <select
                value={sheetIndex}
                onChange={(event) => handleSheetChange(Number(event.target.value))}
                className="mt-2 min-h-11 w-full rounded-lg border border-lineStrong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              >
                {workbook.sheets.map((sheet, index) => (
                  <option key={sheet.name + index} value={index}>{sheet.name} ({sheet.rows.length} แถว)</option>
                ))}
              </select>
            </label>
          )}

          <div className="mt-4">
            <p className="text-sm font-semibold text-ink">ตัวอย่างข้อมูลดิบจากไฟล์</p>
            <p className="mt-1 text-xs text-muted">เลื่อนซ้าย-ขวา และบน-ล่าง เพื่อดูข้อมูลทั้งหมด</p>
            <div className="mt-2 h-[480px] overflow-auto rounded-lg border border-line">
              <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-surfaceSoft text-ink">
                  <tr>
                    {activeSheet.columns.map((column) => (
                      <th key={column.id} className="border-b border-line px-3 py-2.5 font-semibold">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
                  {activeSheet.rows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      {activeSheet.columns.map((column) => (
                        <td key={column.id} className="px-3 py-2.5" title={row[column.id]}>{row[column.id] || "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <h4 className="text-sm font-bold text-ink">ฟิลด์ที่จำเป็น</h4>
            <p className="mt-1 text-xs text-muted">
              ต้องจับคู่ &quot;ชื่อรายการครุภัณฑ์&quot; และเลขครุภัณฑ์อย่างน้อย 1 ประเภท (เลขทะเบียนควบคุมกิจกรรมนักศึกษา หรือ เลขครุภัณฑ์มหาวิทยาลัย)
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {requiredImportFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-semibold text-ink">
                    {field.label}
                    <span className="text-red-300"> *</span>
                  </span>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(event) => handleMappingChange(field.key, event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-lg border border-lineStrong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                  >
                    <option value="">เลือกคอลัมน์จาก Excel</option>
                    {activeSheet.columns.map((column) => (
                      <option key={column.id} value={column.id}>{column.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          {mappingError && <p className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">{mappingError}</p>}

          <div className="mt-5 border-t border-line pt-4">
            <button
              type="button"
              onClick={() => setShowOptionalFields((value) => !value)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {showOptionalFields ? "ซ่อนตัวเลือกเพิ่มเติม" : "แสดงตัวเลือกเพิ่มเติม"}
            </button>
            {showOptionalFields && (
              <div className="mt-4">
                <p className="text-xs text-muted">ฟิลด์เพิ่มเติมเป็นทางเลือก เว้นว่างได้หากไม่มีคอลัมน์นี้ในไฟล์ ระบบจะใช้ค่าเริ่มต้นให้อัตโนมัติ</p>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {optionalImportFields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-sm font-semibold text-ink">{field.label}</span>
                      <select
                        value={mapping[field.key] ?? ""}
                        onChange={(event) => handleMappingChange(field.key, event.target.value)}
                        className="mt-2 min-h-11 w-full rounded-lg border border-lineStrong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
                      >
                        <option value="">เลือกคอลัมน์จาก Excel</option>
                        {activeSheet.columns.map((column) => (
                          <option key={column.id} value={column.id}>{column.label}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end border-t border-line pt-4">
            <button
              type="button"
              onClick={handleShowPreview}
              className="min-h-11 rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-hover"
            >
              แสดงตัวอย่างข้อมูล
            </button>
          </div>
        </div>
      )}

      {previewSummary && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">สรุปผลการตรวจสอบไฟล์</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-line bg-surfaceSoft p-3 text-center">
              <p className="text-xs text-muted">จำนวนแถวทั้งหมด</p>
              <p className="mt-1 text-xl font-extrabold text-ink">{previewSummary.totalRows}</p>
            </div>
            <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-3 text-center">
              <p className="text-xs text-emerald-200">พร้อมนำเข้า</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-100">{previewSummary.ready}</p>
            </div>
            <div className="rounded-lg border border-amber-300/30 bg-amber-400/10 p-3 text-center">
              <p className="text-xs text-amber-200">ข้อมูลซ้ำในระบบ</p>
              <p className="mt-1 text-xl font-extrabold text-amber-100">{previewSummary.duplicate}</p>
            </div>
            <div className="rounded-lg border border-red-300/30 bg-red-400/10 p-3 text-center">
              <p className="text-xs text-red-200">ข้อมูลไม่ครบ</p>
              <p className="mt-1 text-xl font-extrabold text-red-100">{previewSummary.incomplete}</p>
            </div>
          </div>
          {previewSummary.duplicate > 0 && (
            <p className="mt-3 text-sm font-semibold text-amber-200">ข้อมูลซ้ำในระบบ จะไม่ถูกนำเข้า</p>
          )}
        </div>
      )}

      {previewRows && previewRows.length > 0 && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">ตัวอย่างข้อมูลก่อนนำเข้า</h3>
          <div className="mt-3 max-h-[480px] overflow-auto rounded-lg border border-line">
            <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-surfaceSoft text-ink">
                <tr>
                  {["ลำดับ", "ประเภทการขึ้นทะเบียน", "เลขทะเบียนควบคุมกิจกรรมนักศึกษา", "เลขครุภัณฑ์มหาวิทยาลัย", "ตำแหน่งที่ติด/ประทับหมายเลขครุภัณฑ์", "ชื่อรายการครุภัณฑ์", "ลักษณะครุภัณฑ์", "ประเภทครุภัณฑ์", "ปีงบประมาณที่จัดซื้อ", "สถานะการใช้งาน", "องค์กรนักศึกษา/หน่วยงานที่รับผิดชอบ", "สถานที่จัดเก็บ", "ผลการตรวจสอบข้อมูล"].map((label) => (
                    <th key={label} className="border-b border-line px-3 py-2 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
                {previewRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="px-3 py-2 text-muted">{row.rowNumber - 1}</td>
                    <td className="px-3 py-2">{row.registrationType}</td>
                    <td className="px-3 py-2" title={row.assetNumber}>{row.assetNumber}</td>
                    <td className="px-3 py-2" title={row.universityAssetNumber}>{row.universityAssetNumber}</td>
                    <td className="px-3 py-2" title={row.numberPlacement}>{row.numberPlacement}</td>
                    <td className="px-3 py-2" title={row.assetName}>{row.assetName}</td>
                    <td className="px-3 py-2">{row.assetStructureType}</td>
                    <td className="px-3 py-2">{row.assetType}</td>
                    <td className="px-3 py-2">{row.fiscalYear}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2" title={row.organization}>{row.organization}</td>
                    <td className="px-3 py-2">{row.location}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${IMPORT_STATUS_BADGE_CLASS[row.statusKind]}`} title={row.reasons.join(", ")}>
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-line pt-4">
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={readyRows.length === 0 || importing}
              className="min-h-11 rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? "กำลังนำเข้าข้อมูล..." : `ยืนยันนำเข้าข้อมูล (${readyRows.length} รายการ)`}
            </button>
          </div>
        </div>
      )}

      {insertSummary && (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-6">
          <h3 className="text-base font-bold text-emerald-100">ผลการนำเข้าข้อมูล</h3>
          <ul className="mt-3 space-y-1 text-sm text-emerald-100">
            <li>นำเข้าสำเร็จ {insertSummary.insertedCount} รายการ</li>
            <li>ข้อมูลซ้ำ {insertSummary.duplicateCount} รายการ</li>
            <li>ข้อมูลไม่ถูกต้อง {insertSummary.invalidCount} รายการ</li>
            <li>ข้ามรายการ {insertSummary.duplicateCount + insertSummary.invalidCount} รายการ</li>
            <li>ข้อผิดพลาด {insertSummary.errorCount} รายการ</li>
          </ul>
        </div>
      )}
    </section>
  );
}

// /setting > เปลี่ยนผู้รับผิดชอบของหน่วยงาน (admin-only). Sets the unit's new
// "current" responsible person and, on confirm, rewrites responsiblePerson/
// responsiblePhone on every asset under that unit across all fiscal years —
// see onBulkUpdateResponsible in AppDataProvider for the actual API call.
function BulkUpdateResponsiblePanel({ assets, unitResponsiblePersons, onBulkUpdateResponsible, history, onRollbackUnitResponsibleUpdate }: {
  assets: AssetListRow[];
  unitResponsiblePersons: UnitResponsiblePerson[];
  onBulkUpdateResponsible: (payload: { organization: string; responsiblePerson: string; responsiblePhone: string; note: string }) => Promise<number>;
  history: UnitResponsibleUpdateHistory[];
  onRollbackUnitResponsibleUpdate: (historyId: number) => Promise<void>;
}) {
  const { showToast } = useAppData();
  const [organization, setOrganization] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [note, setNote] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ organization: string; count: number } | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<UnitResponsibleUpdateHistory | null>(null);
  const [rollbackAcknowledged, setRollbackAcknowledged] = useState(false);
  const [rollbackSubmitting, setRollbackSubmitting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<UnitResponsibleUpdateHistory | null>(null);

  // Requirement: this dropdown lists units that actually have asset records —
  // not the full master unit list — since the whole point of this feature is
  // to bulk-update the assets under a selected unit. A unit with zero assets
  // would just be dead weight here (and its affected count would always be 0).
  const organizationOptions = useMemo(
    () => uniqueSorted(assets.map((asset) => asset.organization.trim()).filter((name) => name && name !== "-")),
    [assets],
  );
  const normalizedOrganization = organization ? normalizeOrganizationName(organization) : "";
  const affectedCount = useMemo(
    () => (normalizedOrganization ? assets.filter((asset) => asset.organization === normalizedOrganization).length : 0),
    [assets, normalizedOrganization],
  );
  const currentResponsible = useMemo(
    () => unitResponsiblePersons.find((item) => item.organization === normalizedOrganization) ?? null,
    [unitResponsiblePersons, normalizedOrganization],
  );

  const canSubmit = Boolean(normalizedOrganization) && responsiblePerson.trim().length > 0 && !phoneError;

  const resetForm = () => {
    setResponsiblePerson("");
    setResponsiblePhone("");
    setNote("");
    setPhoneError("");
  };

  const handleOpenConfirm = () => {
    if (!canSubmit) {
      showToast("กรุณาเลือกหน่วยงานและระบุชื่อผู้รับผิดชอบใหม่");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const count = await onBulkUpdateResponsible({
        organization: normalizedOrganization,
        responsiblePerson: responsiblePerson.trim(),
        responsiblePhone: responsiblePhone.trim(),
        note: note.trim(),
      });
      setLastResult({ organization: normalizedOrganization, count });
      setConfirmOpen(false);
      resetForm();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "อัปเดตผู้รับผิดชอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  // Requirement 5: warn (not block) when an affected asset no longer matches
  // this batch's "new" value — meaning it was edited manually since the bulk
  // update, so blindly restoring the old value could clobber that later edit.
  const rollbackMismatchCount = useMemo(() => {
    if (!rollbackTarget) return 0;
    const affectedIds = new Set(rollbackTarget.affectedAssetIds);
    return assets.filter(
      (asset) =>
        affectedIds.has(asset.id) &&
        (asset.responsiblePerson !== rollbackTarget.newResponsiblePerson || (asset.responsiblePhone ?? "-") !== rollbackTarget.newPhoneNumber),
    ).length;
  }, [assets, rollbackTarget]);

  const openRollback = (record: UnitResponsibleUpdateHistory) => {
    setRollbackTarget(record);
    setRollbackAcknowledged(false);
  };

  const handleConfirmRollback = async () => {
    if (!rollbackTarget) return;
    if (rollbackMismatchCount > 0 && !rollbackAcknowledged) return;
    setRollbackSubmitting(true);
    try {
      await onRollbackUnitResponsibleUpdate(rollbackTarget.id);
      setRollbackTarget(null);
      setRollbackAcknowledged(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "คืนค่าก่อนหน้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setRollbackSubmitting(false);
    }
  };

  const currentResponsiblePersonLabel = currentResponsible?.responsiblePerson || "ยังไม่มีข้อมูลผู้รับผิดชอบปัจจุบัน";
  const currentResponsiblePhoneLabel = currentResponsible?.responsiblePhone && currentResponsible.responsiblePhone !== "-" ? currentResponsible.responsiblePhone : "-";

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      {/* Step 1: pick the unit — everything below only appears once one is selected, so it's always clear what's being edited. */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">อัปเดตผู้รับผิดชอบของครุภัณฑ์ในหน่วยงาน</h2>
        <p className="mt-2 text-sm font-semibold text-ink">
          การอัปเดตนี้จะเปลี่ยนชื่อผู้รับผิดชอบและเบอร์โทรของครุภัณฑ์ทุกชิ้นในหน่วยงานนี้
        </p>
        <p className="mt-2 text-sm text-muted">
          ใช้เมื่อประธานชมรม/หัวหน้าหน่วยงานเปลี่ยน กรอกชื่อผู้รับผิดชอบใหม่เพียงครั้งเดียว ระบบจะอัปเดตให้ทุกรายการในหน่วยงานนี้ทันที ไม่ว่าครุภัณฑ์จะจัดซื้อในปีงบประมาณใดก็ตาม
        </p>
        <div className="mt-4 max-w-md">
          <SelectField
            label="หน่วยงาน"
            required
            value={organization}
            onChange={(value) => setOrganization(value)}
            options={organizationOptions}
            placeholder="เลือกหน่วยงาน"
          />
        </div>
      </div>

      {/* Step 2: show what's true right now, before anything changes. */}
      {normalizedOrganization && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">ข้อมูลปัจจุบันของหน่วยงานนี้</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailInfoItem label="หน่วยงาน" value={normalizedOrganization} />
            <DetailInfoItem label="ผู้รับผิดชอบปัจจุบัน" value={currentResponsiblePersonLabel} />
            <DetailInfoItem label="หมายเลขโทรศัพท์ปัจจุบัน" value={currentResponsiblePhoneLabel} />
            <DetailInfoItem label="จำนวนครุภัณฑ์ทั้งหมดของหน่วยงานนี้" value={`${affectedCount.toLocaleString("th-TH")} รายการ`} />
          </div>
          <p className="mt-4 rounded-md border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100">
            พบครุภัณฑ์ของหน่วยงานนี้จำนวน {affectedCount.toLocaleString("th-TH")} รายการ
          </p>
        </div>
      )}

      {/* Step 3: the actual edit — new values only, kept separate from the current-data card above. */}
      {normalizedOrganization && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <h3 className="text-base font-bold text-ink">ระบุผู้รับผิดชอบคนใหม่</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="ชื่อผู้รับผิดชอบใหม่"
              required
              value={responsiblePerson}
              onChange={(event) => setResponsiblePerson(event.target.value)}
              placeholder="เช่น นาย ก"
            />
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => { setResponsiblePhone(value); setPhoneError(""); }}
              onInvalidInput={() => setPhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น")}
              onBlur={() => {
                if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) setPhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
              }}
              error={phoneError}
              label="หมายเลขโทรศัพท์"
            />
            <TextAreaField
              label="หมายเหตุ"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="เช่น ประธานชมรมปี 2569"
              compact
            />
          </div>

          <div className="mt-5 flex justify-end border-t border-line pt-4">
            <button
              type="button"
              onClick={handleOpenConfirm}
              className="min-h-11 rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-white hover:bg-primary-hover"
            >
              อัปเดตผู้รับผิดชอบของหน่วยงาน
            </button>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 p-6">
          <h3 className="text-base font-bold text-emerald-100">อัปเดตสำเร็จ</h3>
          <p className="mt-2 text-sm text-emerald-100">
            อัปเดตผู้รับผิดชอบของหน่วยงาน &quot;{lastResult.organization}&quot; แล้ว {lastResult.count.toLocaleString("th-TH")} รายการ
          </p>
        </div>
      )}

      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">ประวัติการอัปเดตผู้รับผิดชอบ</h2>
        <p className="mt-2 text-sm text-muted">รายการอัปเดตผู้รับผิดชอบของหน่วยงานที่ผ่านมา กด &quot;ดูรายละเอียด&quot; เพื่อดูข้อมูลทั้งหมด หรือ &quot;คืนค่าก่อนหน้า&quot; เพื่อคืนค่ารายการที่ยังไม่ถูกคืนค่า</p>
        {history.length === 0 ? (
          <p className="mt-5 rounded-lg border border-line bg-surfaceSoft px-4 py-6 text-center text-sm text-muted">ยังไม่มีประวัติการอัปเดตผู้รับผิดชอบ</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-surfaceSoft text-ink">
                <tr>
                  {["วันที่อัปเดต", "หน่วยงาน", "ผู้รับผิดชอบใหม่", "จำนวนรายการ", "หมายเหตุ/วาระ", "จัดการ"].map((label) => (
                    <th key={label} className="border-b border-line px-4 py-3 font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-4 py-3 align-top">
                      <p>{record.updatedAt}</p>
                      {record.updatedBy && <p className="mt-0.5 text-xs text-muted">โดย {record.updatedBy}</p>}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 align-top" title={record.unitName}>{record.unitName}</td>
                    <td className="max-w-[170px] px-4 py-3 align-top">
                      <p className="truncate" title={record.newResponsiblePerson}>{record.newResponsiblePerson}</p>
                      <p className="mt-0.5 truncate text-xs text-muted" title={record.newPhoneNumber}>{record.newPhoneNumber}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top">{record.affectedAssetCount.toLocaleString("th-TH")} รายการ</td>
                    <td className="max-w-[180px] truncate px-4 py-3 align-top" title={record.note}>{record.note || "-"}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailTarget(record)}
                          className="whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:border-primary hover:text-primary"
                        >
                          ดูรายละเอียด
                        </button>
                        {record.rolledBack ? (
                          <span className="inline-flex whitespace-nowrap rounded-full border border-slate-300/30 bg-slate-500/10 px-2.5 py-1 text-xs font-bold text-muted" title={record.rolledBackBy ? `คืนค่าโดย ${record.rolledBackBy} เมื่อ ${record.rolledBackAt}` : undefined}>
                            คืนค่าแล้ว
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRollback(record)}
                            className="whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:border-primary hover:text-primary"
                          >
                            คืนค่าก่อนหน้า
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-bold text-white">ยืนยันการอัปเดตผู้รับผิดชอบ</h3>
                <p className="mt-1 text-sm text-muted">โปรดตรวจสอบข้อมูลก่อนยืนยัน</p>
              </div>
              <CloseIconButton onClick={() => setConfirmOpen(false)} />
            </div>
            <div className="space-y-3 p-5">
              <div className="space-y-1 rounded-lg border border-line bg-slate-950/30 px-4 py-3 text-sm">
                <p><span className="text-muted">หน่วยงาน: </span><span className="font-semibold text-white">{normalizedOrganization}</span></p>
                <p><span className="text-muted">ผู้รับผิดชอบเดิม: </span><span className="font-semibold text-white">{currentResponsiblePersonLabel}</span></p>
                <p><span className="text-muted">เบอร์เดิม: </span><span className="font-semibold text-white">{currentResponsiblePhoneLabel}</span></p>
                <p><span className="text-muted">ผู้รับผิดชอบใหม่: </span><span className="font-semibold text-white">{responsiblePerson.trim()}</span></p>
                <p><span className="text-muted">เบอร์ใหม่: </span><span className="font-semibold text-white">{responsiblePhone.trim() || "-"}</span></p>
                <p><span className="text-muted">จำนวนครุภัณฑ์ที่ได้รับผลกระทบ: </span><span className="font-semibold text-white">{affectedCount.toLocaleString("th-TH")} รายการ</span></p>
              </div>
              <p className="rounded-md border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
                การอัปเดตนี้จะมีผลกับครุภัณฑ์ทุกรายการในหน่วยงานนี้ กรุณาตรวจสอบก่อนยืนยัน
              </p>
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ยกเลิก</button>
                <button type="button" onClick={handleConfirm} disabled={submitting} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
                  {submitting ? "กำลังอัปเดต..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rollbackTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-bold text-white">ยืนยันคืนค่าก่อนหน้า</h3>
                <p className="mt-1 text-sm text-muted">
                  ระบบจะคืนค่าผู้รับผิดชอบและเบอร์โทรกลับเป็นข้อมูลเดิมของรายการอัปเดตรอบนี้เท่านั้น
                </p>
              </div>
              <CloseIconButton onClick={() => setRollbackTarget(null)} />
            </div>
            <div className="space-y-3 p-5">
              <div className="space-y-1 rounded-lg border border-line bg-slate-950/30 px-4 py-3 text-sm">
                <p><span className="text-muted">หน่วยงาน: </span><span className="font-semibold text-white">{rollbackTarget.unitName}</span></p>
                <p><span className="text-muted">ผู้รับผิดชอบเดิม: </span><span className="font-semibold text-white">{rollbackTarget.oldResponsiblePerson}</span></p>
                <p><span className="text-muted">เบอร์เดิม: </span><span className="font-semibold text-white">{rollbackTarget.oldPhoneNumber}</span></p>
                <p><span className="text-muted">ผู้รับผิดชอบใหม่: </span><span className="font-semibold text-white">{rollbackTarget.newResponsiblePerson}</span></p>
                <p><span className="text-muted">เบอร์ใหม่: </span><span className="font-semibold text-white">{rollbackTarget.newPhoneNumber}</span></p>
                <p><span className="text-muted">จำนวนครุภัณฑ์ที่จะถูกคืนค่า: </span><span className="font-semibold text-white">{rollbackTarget.affectedAssetCount.toLocaleString("th-TH")} รายการ</span></p>
                {rollbackTarget.note && rollbackTarget.note !== "-" && (
                  <p><span className="text-muted">หมายเหตุ/วาระ: </span><span className="font-semibold text-white">{rollbackTarget.note}</span></p>
                )}
              </div>
              {rollbackMismatchCount > 0 && (
                <div className="space-y-2 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
                  <p>มีครุภัณฑ์บางรายการที่ถูกแก้ไขผู้รับผิดชอบหลังจากการอัปเดตนี้ กรุณาตรวจสอบก่อนคืนค่า ({rollbackMismatchCount.toLocaleString("th-TH")} รายการ)</p>
                  <label className="flex items-start gap-2 text-xs font-semibold text-amber-100">
                    <input
                      type="checkbox"
                      checked={rollbackAcknowledged}
                      onChange={(event) => setRollbackAcknowledged(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-amber-400"
                    />
                    ฉันตรวจสอบแล้วและต้องการคืนค่าต่อไป
                  </label>
                </div>
              )}
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" onClick={() => setRollbackTarget(null)} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ยกเลิก</button>
                <button
                  type="button"
                  onClick={handleConfirmRollback}
                  disabled={rollbackSubmitting || (rollbackMismatchCount > 0 && !rollbackAcknowledged)}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {rollbackSubmitting ? "กำลังคืนค่า..." : "ยืนยันคืนค่าก่อนหน้า"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-bold text-white">รายละเอียดการอัปเดตผู้รับผิดชอบ</h3>
                <p className="mt-1 text-sm text-muted">ข้อมูลทั้งหมดของการอัปเดตครั้งนี้</p>
              </div>
              <CloseIconButton onClick={() => setDetailTarget(null)} />
            </div>
            <div className="grid grid-cols-1 gap-x-6 p-5 sm:grid-cols-2">
              <DetailInfoItem label="วันที่อัปเดต" value={detailTarget.updatedAt} />
              <DetailInfoItem label="หน่วยงาน" value={detailTarget.unitName} />
              <DetailInfoItem label="ผู้รับผิดชอบเดิม" value={detailTarget.oldResponsiblePerson} />
              <DetailInfoItem label="เบอร์เดิม" value={detailTarget.oldPhoneNumber} />
              <DetailInfoItem label="ผู้รับผิดชอบใหม่" value={detailTarget.newResponsiblePerson} />
              <DetailInfoItem label="เบอร์ใหม่" value={detailTarget.newPhoneNumber} />
              <DetailInfoItem label="จำนวนครุภัณฑ์ที่ถูกอัปเดต" value={`${detailTarget.affectedAssetCount.toLocaleString("th-TH")} รายการ`} />
              <DetailInfoItem label="หมายเหตุ/วาระ" value={detailTarget.note || "-"} />
              <DetailInfoItem label="ผู้ดำเนินการ" value={detailTarget.updatedBy || "-"} />
              <DetailInfoItem label="สถานะการคืนค่า" value={detailTarget.rolledBack ? "คืนค่าแล้ว" : "ยังไม่คืนค่า"} />
              {detailTarget.rolledBack && (
                <>
                  <DetailInfoItem label="วันที่คืนค่า" value={detailTarget.rolledBackAt || "-"} />
                  <DetailInfoItem label="ผู้ที่กดคืนค่า" value={detailTarget.rolledBackBy || "-"} />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-line p-5">
              <button type="button" onClick={() => setDetailTarget(null)} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ปิด</button>
              {!detailTarget.rolledBack && (
                <button
                  type="button"
                  onClick={() => {
                    const record = detailTarget;
                    setDetailTarget(null);
                    openRollback(record);
                  }}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover"
                >
                  คืนค่าก่อนหน้า
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function UserManagementPage({ users, onAddUser, onUpdateUser, onDeleteUser, currentUser, roles, onRolesChange, permissions, organizationItems, onOrganizationItemsChange, locationItems, onLocationItemsChange, equipmentTypeItems, onEquipmentTypeItemsChange, assets, onImportAssets, unitResponsiblePersons, onBulkUpdateResponsible, unitResponsibleHistory, onRollbackUnitResponsibleUpdate }: {
  users: AppUser[];
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: AppUser;
  roles: RoleDefinition[];
  onRolesChange: (roles: RoleDefinition[]) => void;
  permissions: Permissions;
  organizationItems: MasterDataItem[];
  onOrganizationItemsChange: (items: MasterDataItem[]) => void;
  locationItems: MasterDataItem[];
  onLocationItemsChange: (items: MasterDataItem[]) => void;
  equipmentTypeItems: MasterDataItem[];
  onEquipmentTypeItemsChange: (items: MasterDataItem[]) => void;
  assets: AssetListRow[];
  onImportAssets: (rows: AssetListRow[]) => Promise<AssetImportInsertSummary>;
  unitResponsiblePersons: UnitResponsiblePerson[];
  onBulkUpdateResponsible: (payload: { organization: string; responsiblePerson: string; responsiblePhone: string; note: string }) => Promise<number>;
  unitResponsibleHistory: UnitResponsibleUpdateHistory[];
  onRollbackUnitResponsibleUpdate: (historyId: number) => Promise<void>;
}) {
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("edit");
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleModalMode, setRoleModalMode] = useState<"add" | "edit">("edit");
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "organizations" | "locations" | "types" | "numbers" | "import" | "bulkUpdate">("users");
  const [deleteCandidate, setDeleteCandidate] = useState<AppUser | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const { t } = useLanguage();

  const closeDeleteDialog = () => { setDeleteCandidate(null); setDeleteError(""); };
  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    if (deleteCandidate.id === currentUser.id) { setDeleteError(t("set.errSelfDelete")); return; }
    if (deleteCandidate.role === "Admin" && users.filter((u) => u.role === "Admin").length <= 1) { setDeleteError(t("set.errLastAdmin")); return; }
    onDeleteUser(deleteCandidate.id);
    closeDeleteDialog();
  };

  if (!permissions.canManageUsers) {
    return (
      <section className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-xl font-bold text-ink">ไม่มีสิทธิ์จัดการผู้ใช้งาน</h2>
        <p className="mt-2 text-sm text-muted">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขบทบาท องค์กร และสิทธิ์ส่งออกได้</p>
      </section>
    );
  }

  const saveEditingUser = () => {
    if (!editingUser) return;
    if (!editingUser.name.trim() || !editingUser.email.trim() || !editingUser.role) return;
    if (userModalMode === "add") onAddUser(editingUser);
    else onUpdateUser(editingUser);
    setEditingUser(null);
  };

  const openAddUser = () => {
    setUserModalMode("add");
    setEditingUser({ id: `new-${Date.now()}`, name: "", email: "", role: roles.find((role) => role.active && role.key !== "Admin")?.key ?? "Staff", organization: "-", viewerCanExport: false, active: true });
  };

  const openAddRole = () => {
    setRoleModalMode("add");
    setEditingRole({ key: `custom-${Date.now()}`, name: "", description: "", permissions: { ...noPermissions }, allowExport: false, active: true });
  };

  const saveRole = () => {
    if (!editingRole?.name.trim()) return;
    const nextRole = { ...editingRole, permissions: { ...editingRole.permissions, canExport: editingRole.allowExport } };
    if (roleModalMode === "add") onRolesChange([...roles, nextRole]);
    else onRolesChange(roles.map((role) => role.key === nextRole.key ? nextRole : role));
    setEditingRole(null);
  };

  const organizationOptions = ["กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", "-", ...organizationItems.map((item) => item.name)];
  const currentThaiYear = new Date().getFullYear() + 543;
  const latestSequence = getLatestAssetSequenceForYear(assets, String(currentThaiYear));
  type TabKey = "users" | "roles" | "organizations" | "locations" | "types" | "numbers" | "import" | "bulkUpdate";
  const tabs: [TabKey, string][] = [
    ["users", t("set.tabUsers")], ["roles", t("set.tabRoles")], ["organizations", t("set.tabOrgs")], ["locations", t("set.tabLocations")], ["types", t("set.tabTypes")], ["numbers", t("set.tabNumbers")],
    // Admin-only — hidden from the tab bar (not just disabled) for every other role.
    // The server independently re-checks this via requirePermission("bulkUpdateResponsible")
    // on /api/unit-responsible-persons, so hiding the tab is a UX nicety, not the real gate.
    ...(permissions.canBulkUpdateResponsible ? [["bulkUpdate", "ผู้รับผิดชอบของหน่วยงาน"] as [TabKey, string]] : []),
    // Admin-only — same doctrine as above; server re-checks via
    // requirePermission("importAssets") on /api/assets/import.
    ...(permissions.canImportAssets ? [["import", "นำเข้าข้อมูล Excel"] as [TabKey, string]] : []),
  ];

  return (
    <>
      <div className="mx-auto mb-4 w-full max-w-screen-2xl rounded-lg border border-line bg-surface p-4">
        <p className="px-2 text-sm text-muted">จัดการข้อมูลกลาง ผู้ใช้งาน และสิทธิ์การใช้งานระบบ</p>
        <div className="mt-3 flex flex-wrap gap-2">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`min-h-11 flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold ${activeTab === key ? "bg-gold text-white" : "bg-surfaceSoft text-ink hover:text-primary"}`}>{label}</button>)}</div>
      </div>
      {activeTab === "users" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">{t("set.tabUsers")}</h2><p className="mt-2 text-sm text-muted">ตรวจสอบบัญชี บทบาท องค์กร และสิทธิ์การใช้งานของผู้ใช้ในระบบ</p></div><button type="button" onClick={openAddUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover">{t("set.addUser")}</button></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-surfaceSoft text-ink">
              <tr>
                {[
                    { label: "ชื่อ" },
                    { label: "อีเมล" },
                    { label: "บทบาท" },
                    { label: "องค์กร" },
                    { label: "อนุญาตส่งออก" },
                    { label: "จัดการ", cls: "w-px whitespace-nowrap" },
                  ].map(({ label, cls = "" }) => (
                    <th key={label} className={`border-b border-line px-4 py-3 ${cls}`.trim()}>{label}</th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-slate-950/20 text-ink">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3 font-semibold text-white">{user.name}</td>
                  <td className="px-4 py-3 text-ink">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-200">{getRoleDefinition(user.role, roles).name}</span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-ink" title={user.organization}>{user.organization || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.viewerCanExport ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-700/60 text-ink"}`}>
                      {user.viewerCanExport ? "อนุญาต" : "ไม่อนุญาต"}
                    </span>
                  </td>
                  <td className="w-px whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => { setUserModalMode("edit"); setEditingUser({ ...user }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-primary-hover">แก้ไข</button>
                      <ActiveToggle checked={user.active} onChange={() => onUpdateUser({ ...user, active: !user.active })} disabled={user.role === "Admin"} ariaLabel="Toggle user active status" />
                      <button type="button" onClick={() => setDeleteCandidate(user)} title={t("set.deleteUser")} aria-label={t("set.deleteUser")} className="rounded-md border border-red-400/40 px-2 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-400/10 hover:text-red-300">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {activeTab === "roles" && (
        <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">{t("set.tabRoles")}</h2>
              <p className="mt-2 text-sm text-muted">กำหนดบทบาทและสิทธิ์การใช้งานสำหรับผู้ใช้งานในระบบ</p>
            </div>
            <button type="button" onClick={openAddRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover">{t("set.addRole")}</button>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-surfaceSoft text-ink">
                <tr>
                  {[
                    { label: "ชื่อบทบาท" },
                    { label: "คำอธิบาย" },
                    { label: "สิทธิ์การใช้งาน" },
                    { label: "อนุญาตส่งออก" },
                    { label: "สถานะ", cls: "w-[110px]" },
                    { label: "จัดการ", cls: "w-px whitespace-nowrap" },
                  ].map(({ label, cls = "" }) => (
                    <th key={label} className={`border-b border-line px-4 py-3 ${cls}`.trim()}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-slate-950/20 text-ink">
                {roles.map((role) => (
                  <tr key={role.key}>
                    <td className="px-4 py-3 font-semibold text-white">{role.name}</td>
                    <td className="px-4 py-3 text-ink">{role.description || "-"}</td>
                    <td className="max-w-[300px] px-4 py-3 text-ink">{getPermissionLabel(role.permissions)}</td>
                    <td className="px-4 py-3">{role.allowExport ? "อนุญาต" : "ไม่อนุญาต"}</td>
                    <td className="px-4 py-3">{role.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => { setRoleModalMode("edit"); setEditingRole({ ...role, permissions: { ...role.permissions } }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950">แก้ไข</button>
                        <ActiveToggle checked={role.active} onChange={() => onRolesChange(roles.map((item) => item.key === role.key ? { ...item, active: !item.active } : item))} disabled={role.protected} ariaLabel="Toggle role active status" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "organizations" && <MasterDataPanel title="จัดการองค์กร/หน่วยงาน" description="จัดการรายชื่อองค์กร หน่วยงาน ฝ่าย และชมรมที่ใช้ในระบบ" items={organizationItems} onChange={onOrganizationItemsChange} addLabel="ระบุชื่อองค์กรหรือหน่วยงาน" searchPlaceholder="ค้นหาหน่วยงาน" />}
      {activeTab === "locations" && <MasterDataPanel title="จัดการสถานที่จัดเก็บ" description="จัดการสถานที่จัดเก็บครุภัณฑ์ที่ใช้ในฟอร์มบันทึกข้อมูลและการตรวจสอบ" items={locationItems} onChange={onLocationItemsChange} addLabel="ระบุสถานที่จัดเก็บ" searchPlaceholder="ค้นหาสถานที่จัดเก็บ" />}
      {activeTab === "types" && <MasterDataPanel title="จัดการประเภทครุภัณฑ์" description="จัดการหมวดหมู่ครุภัณฑ์ที่ใช้ในฟอร์ม ตาราง รายงาน และตัวกรองข้อมูล" items={equipmentTypeItems} onChange={onEquipmentTypeItemsChange} addLabel="ระบุประเภทครุภัณฑ์" searchPlaceholder="ค้นหาประเภทครุภัณฑ์" />}
      {activeTab === "numbers" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-line bg-surface p-6"><h2 className="text-xl font-bold text-white">ตั้งค่าการออกเลขครุภัณฑ์</h2><p className="mt-2 text-sm text-muted">กำหนดรูปแบบและเลขลำดับล่าสุดสำหรับการออกหมายเลขครุภัณฑ์อัตโนมัติ</p><div className="mt-5 grid gap-4 md:grid-cols-3"><DetailInfoItem label="คำนำหน้าเลขครุภัณฑ์" value="ค.อ.มช." /><DetailInfoItem label="เลขลำดับล่าสุด" value={String(latestSequence).padStart(4, "0")} /><DetailInfoItem label="ตัวอย่างรูปแบบหมายเลขครุภัณฑ์" value={`ค.อ.มช.${String(latestSequence + 1).padStart(4, "0")}/${currentThaiYear}`} /></div><p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">ข้อมูลส่วนนี้เป็นแบบอ่านอย่างเดียว เพื่อป้องกันหมายเลขครุภัณฑ์ซ้ำหรือผิดลำดับ</p></section>}
      {activeTab === "import" && permissions.canImportAssets && <ExcelImportPanel assets={assets} onImportAssets={onImportAssets} unitResponsiblePersons={unitResponsiblePersons} />}
      {activeTab === "bulkUpdate" && permissions.canBulkUpdateResponsible && (
        <BulkUpdateResponsiblePanel
          assets={assets}
          unitResponsiblePersons={unitResponsiblePersons}
          onBulkUpdateResponsible={onBulkUpdateResponsible}
          history={unitResponsibleHistory}
          onRollbackUnitResponsibleUpdate={onRollbackUnitResponsibleUpdate}
        />
      )}

      {editingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-bold text-white">{userModalMode === "add" ? t("set.addUser") : "แก้ไขข้อมูลผู้ใช้งาน"}</h3>
                <p className="mt-1 text-sm text-muted">ระบุข้อมูลบัญชีและบทบาทของผู้ใช้งาน</p>
              </div>
              <CloseIconButton onClick={() => setEditingUser(null)} />
            </div>
            <div className="space-y-4 p-5">
              <Field label="ชื่อผู้ใช้งาน" value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} />
              <Field label="อีเมล" type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} />
              <SelectField
                label="บทบาท"
                value={editingUser.role}
                onChange={(value) => setEditingUser({ ...editingUser, role: value as UserRole })}
                options={roles.filter((role) => role.active || role.key === editingUser.role).map((role) => role.key)}
                getOptionLabel={(value) => getRoleDefinition(value, roles).name}
              />
              <SelectField label="องค์กร" value={editingUser.organization} onChange={(value) => setEditingUser({ ...editingUser, organization: value })} options={uniqueSorted(organizationOptions)} />
              <label className="flex items-center justify-between gap-4 rounded-lg border border-line bg-slate-950/30 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-white">อนุญาตส่งออก</span>
                  <span className="mt-1 block text-xs text-muted">อนุญาตให้ผู้ใช้นี้ส่งออกรายงานจากระบบ</span>
                </span>
                <input type="checkbox" checked={editingUser.viewerCanExport} onChange={(event) => setEditingUser({ ...editingUser, viewerCanExport: event.target.checked })} className="h-5 w-5 accent-yellow-400" />
              </label>
              <div className="flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ยกเลิก</button>
                <button type="button" onClick={saveEditingUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-primary-hover">บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingRole && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4"><div className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-line p-5"><div><h3 className="text-xl font-bold text-white">{roleModalMode === "add" ? "เพิ่มบทบาท" : "แก้ไขบทบาท"}</h3><p className="mt-1 text-sm text-muted">กำหนดชื่อ คำอธิบาย และสิทธิ์การใช้งาน</p></div><CloseIconButton onClick={() => setEditingRole(null)} /></div><div className="space-y-4 p-5"><Field label="ชื่อบทบาท" value={editingRole.name} onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })} /><Field label="คำอธิบายบทบาท" value={editingRole.description} onChange={(event) => setEditingRole({ ...editingRole, description: event.target.value })} /><div><p className="text-sm font-semibold text-white">สิทธิ์การใช้งาน</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{([{ key: "canViewDashboard", label: "หน้าภาพรวม" }, { key: "canViewList", label: "แสดงรายการ" }, { key: "canInspect", label: "ตรวจสอบประจำปี" }, { key: "canCreate", label: "บันทึกข้อมูล" }, { key: "canViewReports", label: "รายงาน" }, { key: "canManageUsers", label: "ตั้งค่า" }, { key: "canImportAssets", label: "นำเข้าข้อมูล Excel" }, { key: "canBulkUpdateResponsible", label: "เปลี่ยนผู้รับผิดชอบของหน่วยงาน" }, { key: "canEdit", label: "แก้ไขข้อมูลครุภัณฑ์" }, { key: "canDelete", label: "ลบข้อมูลครุภัณฑ์" }] as { key: keyof Permissions; label: string }[]).map((option) => <label key={option.key} className="flex items-center gap-3 rounded-lg border border-line bg-slate-950/30 px-3 py-2 text-sm text-ink"><input type="checkbox" checked={Boolean(editingRole.permissions[option.key])} onChange={(event) => setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [option.key]: event.target.checked } })} className="h-4 w-4 accent-yellow-400" />{option.label}</label>)}</div></div><label className="flex items-center justify-between gap-4 rounded-lg border border-line bg-slate-950/30 px-4 py-3"><span className="text-sm font-semibold text-white">อนุญาตส่งออก</span><input type="checkbox" checked={editingRole.allowExport} onChange={(event) => setEditingRole({ ...editingRole, allowExport: event.target.checked, permissions: { ...editingRole.permissions, canExport: event.target.checked } })} className="h-5 w-5 accent-yellow-400" /></label><div className="flex justify-end gap-3 border-t border-line pt-4"><button type="button" onClick={() => setEditingRole(null)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-ink">ยกเลิก</button><button type="button" onClick={saveRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950">บันทึก</button></div></div></div></div>}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <h3 className="text-xl font-bold text-white">{t("set.deleteUser")}</h3>
              <CloseIconButton onClick={closeDeleteDialog} />
            </div>
            <div className="p-5">
              <p className="text-sm text-muted">{t("set.deleteUser.confirm")}</p>
              <div className="mt-4 space-y-0.5 rounded-lg border border-line bg-slate-950/30 px-4 py-3 text-sm">
                <p className="font-semibold text-white">{deleteCandidate.name}</p>
                <p className="text-muted">{deleteCandidate.email}</p>
                <p className="text-muted">{getRoleDefinition(deleteCandidate.role, roles).name}</p>
              </div>
              {deleteError && (
                <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">{deleteError}</p>
              )}
              <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4">
                <button type="button" onClick={closeDeleteDialog} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">{t("c.cancel")}</button>
                <button type="button" onClick={handleConfirmDelete} className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-400">{t("set.deleteUser.confirmBtn")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function SettingRoute() {
  const {
    currentUser,
    permissions,
    users,
    roles,
    assets,
    organizationItems,
    locationItems,
    equipmentTypeItems,
    onAddUser,
    onUpdateUser,
    onDeleteUser,
    onRolesChange,
    onOrganizationItemsChange,
    onLocationItemsChange,
    onEquipmentTypeItemsChange,
    onImportAssets,
    unitResponsiblePersons,
    onBulkUpdateResponsible,
    unitResponsibleHistory,
    onRollbackUnitResponsibleUpdate,
  } = useAppData();
  if (!permissions.canManageUsers) return <PlaceholderPage title="ไม่มีสิทธิ์เข้าถึงการตั้งค่า" />;
  return (
    <UserManagementPage
      users={users}
      onAddUser={onAddUser}
      permissions={permissions}
      onUpdateUser={onUpdateUser}
      onDeleteUser={onDeleteUser}
      currentUser={currentUser}
      roles={roles}
      onRolesChange={onRolesChange}
      organizationItems={organizationItems}
      onOrganizationItemsChange={onOrganizationItemsChange}
      locationItems={locationItems}
      onLocationItemsChange={onLocationItemsChange}
      equipmentTypeItems={equipmentTypeItems}
      onEquipmentTypeItemsChange={onEquipmentTypeItemsChange}
      assets={assets}
      onImportAssets={onImportAssets}
      unitResponsiblePersons={unitResponsiblePersons}
      onBulkUpdateResponsible={onBulkUpdateResponsible}
      unitResponsibleHistory={unitResponsibleHistory}
      onRollbackUnitResponsibleUpdate={onRollbackUnitResponsibleUpdate}
    />
  );
}
