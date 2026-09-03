import { realAssets2561To2567 } from "@/data/real-assets-2561-2567";
import { assetTypeOptions } from "@/constants/options";
import { allowedAssetStatuses } from "@/constants/statuses";
import { formatThaiDate, formatThaiDateTimeWithSeconds } from "@/lib/dates";
import { getOrganizationType, normalizeOrganizationName } from "@/lib/organizations";
import { AdminAssetImportRow, AdminAssetImportStatus, AdminAssetImportSummary, AnnualInspection, AssetImportPreviewRow, AssetImportRow, AssetListRow, ReportColumn } from "@/types";

export const ASSET_NUMBER_PREFIX = "ค.อ.มช.";

// The running number resets every fiscal year, so the "latest" sequence is only
// ever computed among asset numbers whose /YYYY suffix matches the given year.
export function getLatestAssetSequenceForYear(assets: AssetListRow[], fiscalYear: string) {
  const targetYear = fiscalYear.trim();
  return assets.reduce((highest, asset) => {
    const match = asset.assetNumber.match(/(\d{1,6})\s*\/\s*(\d{4})/);
    if (!match) return highest;
    const [, sequenceText, yearText] = match;
    if (yearText !== targetYear) return highest;
    const sequence = Number(sequenceText);
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);
}

export function getNextAssetNumber(assets: AssetListRow[], fiscalYear: string) {
  const latestSequence = getLatestAssetSequenceForYear(assets, fiscalYear);
  return `${ASSET_NUMBER_PREFIX}${String(latestSequence + 1).padStart(4, "0")}/${fiscalYear}`;
}

export function normalizeAssetType(value: string | null | undefined, context = "") {
  const rawValue = `${value ?? ""} ${context}`.trim();
  if (!rawValue) return assetTypeOptions[5];
  if (assetTypeOptions.includes(value?.trim() ?? "")) return value?.trim() ?? assetTypeOptions[5];

  const text = rawValue.toLowerCase();
  if (/(คอมพิวเตอร์|โน้ตบุ๊ก|โน๊ตบุ๊ค|ปริ้นเตอร์|เครื่องพิมพ์|อุปกรณ์ it|\bit\b)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์คอมพิวเตอร์และอุปกรณ์ IT";
  }
  if (/(กลอง|กีตาร์|คีย์บอร์ด|เครื่องดนตรี|ดนตรี)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์เครื่องดนตรี";
  }
  if (/(กล้อง|ไมโครโฟน|ลำโพง|เครื่องเสียง|โปรเจคเตอร์|จอโปรเจคเตอร์|อิเล็กทรอนิกส์|อิเล็กทรอนิค|เสียง|ถ่ายภาพ|ไลฟ์สด|นำเสนอ)/i.test(text)) {
    return assetTypeOptions[1];
  }
  if (/(โต๊ะ|เก้าอี้|ชั้นวาง|บอร์ด|ไวท์บอร์ด|เฟอร์นิเจอร์|ตกแต่ง)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์ตกแต่งสถานที่";
  }
  if (/(อุปกรณ์สำนักงาน|เครื่องใช้สำนักงาน|สำนักงาน)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์สำนักงาน";
  }
  return "ครุภัณฑ์และอุปกรณ์อื่น ๆ";
}

export function getAssetDerivedValues(asset: AssetListRow) {
  const quantityMatch = asset.purchaseProject.match(/จำนวน\s([^/]+?)\s\/\sราคา/);
  const priceMatch = asset.purchaseProject.match(/ราคา\s([^/]+?)\sบาท/);
  const phoneMatch = asset.purchaseProject.match(/เบอร์โทร\s(.+)$/);
  const quantityText = quantityMatch?.[1]?.trim() || "1 รายการ";
  const [fallbackQuantity, ...fallbackUnitParts] = quantityText.split(/\s+/);

  return {
    quantityValue: asset.quantity || fallbackQuantity || "1",
    unitValue: asset.unit || fallbackUnitParts.join(" ") || "รายการ",
    priceValue: asset.price || priceMatch?.[1]?.trim() || "",
    phoneValue: asset.responsiblePhone || phoneMatch?.[1]?.trim() || "",
  };
}

export function getPurchaseProjectValue(asset: AssetListRow) {
  const value = asset.purchaseProject?.trim();
  if (!value || value === "-" || /^จำนวน\s.+\s\/\sราคา/.test(value)) return "-";
  return value;
}

export function getNumberPlacementValue(asset: AssetListRow) {
  const value = asset.numberPlacement?.trim();
  if (!value || value === "-" || value === "นำเข้าจาก Excel" || value === "บันทึกจากหน้าเพิ่มข้อมูลครุภัณฑ์") return "-";
  return value;
}

export function getAssetValue(asset: AssetListRow, key: string) {
  if (key === "assetStructureLabel") return asset.assetStructureType === "set" ? `ครุภัณฑ์แบบชุด (${asset.assetSetItems.length} รายการย่อย)` : "ครุภัณฑ์เดี่ยว";
  // getAssetDerivedValues runs three regexes; only compute it for the keys that need it.
  if (key === "price") {
    const { priceValue } = getAssetDerivedValues(asset);
    return priceValue ? `${priceValue} บาท` : "-";
  }
  if (key === "responsiblePhone") return getAssetDerivedValues(asset).phoneValue || "-";
  if (key === "purchaseProject") return getPurchaseProjectValue(asset);
  if (key === "numberPlacement") return getNumberPlacementValue(asset);
  return String(asset[key as keyof AssetListRow] ?? "-");
}

export function getReportRowValue(row: Record<string, string | number>, key: string) {
  return String(row[key] ?? "-");
}

export function assetToReportRow(asset: AssetListRow): Record<string, string | number> {
  return Object.fromEntries(
    assetReportExportColumns.map((column) => [column.key, getAssetValue(asset, column.key)]),
  );
}

export function annualInspectionToReportRow(inspection: AnnualInspection, asset: AssetListRow): Record<string, string | number> {
  return {
    inspectionYear: inspection.inspectionYear,
    inspectionDate: inspection.inspectionDate || "-",
    assetNumber: asset.assetNumber,
    assetName: asset.assetName,
    organization: asset.organization,
    foundLocation: inspection.foundLocation || "-",
    statusAfterInspection: inspection.result || "-",
    inspectorName: inspection.inspectorName || "-",
    note: inspection.note || "-",
  };
}

export const assetReportExportColumns: ReportColumn[] = [
  { key: "fiscalYear", label: "ปีงบประมาณ" },
  { key: "budgetSource", label: "แหล่งงบประมาณ" },
  { key: "recordDate", label: "วันที่บันทึกข้อมูล" },
  { key: "registrationType", label: "ประเภทการลงทะเบียน" },
  { key: "assetNumber", label: "เลขทะเบียนควบคุมกิจกรรมนักศึกษา" },
  { key: "universityAssetNumber", label: "เลขครุภัณฑ์มหาวิทยาลัย" },
  { key: "purchaseProject", label: "จัดซื้อในโครงการ" },
  { key: "numberPlacement", label: "ตำแหน่งที่ประทับหมายเลขครุภัณฑ์" },
  { key: "assetName", label: "ชื่อรายการครุภัณฑ์" },
  { key: "assetStructureLabel", label: "ลักษณะครุภัณฑ์" },
  { key: "price", label: "มูลค่าทรัพย์สิน" },
  { key: "organization", label: "ฝ่าย/ชมรมที่รับผิดชอบ" },
  { key: "location", label: "สถานที่จัดเก็บ" },
  { key: "responsiblePerson", label: "ชื่อผู้รับผิดชอบ" },
  { key: "responsiblePhone", label: "เบอร์โทรผู้รับผิดชอบ" },
  { key: "status", label: "สถานะครุภัณฑ์" },
  { key: "note", label: "หมายเหตุ" },
];

// PDF report needs a shorter column set than Word/Excel so the table stays readable
// on an A4 landscape page — see requirement to only export the columns visible on
// /list, not every database field. Keys are prefixed to avoid colliding with
// assetReportExportColumns' own COL_WIDTHS entries (e.g. "assetNumber").
export const assetPdfReportColumns: ReportColumn[] = [
  { key: "pdfFiscalYear", label: "ปีงบ" },
  { key: "pdfAssetNumber", label: "หมายเลขครุภัณฑ์" },
  { key: "pdfNumberType", label: "ประเภทเลข" },
  { key: "pdfAssetName", label: "ชื่อครุภัณฑ์" },
  { key: "pdfOrganization", label: "หน่วยงาน" },
  { key: "pdfStatus", label: "สถานะ" },
  { key: "pdfInspectionResult", label: "ผลการตรวจสอบ" },
];

function getPdfAssetNumberValue(asset: AssetListRow) {
  const registrationType = asset.registrationType || "ครุภัณฑ์ควบคุมกิจกรรมนักศึกษา";
  const universityNumber = asset.universityAssetNumber?.trim() || "-";
  if (registrationType === "ครุภัณฑ์มหาวิทยาลัย") return universityNumber;
  if (registrationType === "มีทั้งเลขกิจกรรมนักศึกษาและเลขมหาวิทยาลัย") return `${asset.assetNumber} / เลข มช. ${universityNumber}`;
  return asset.assetNumber;
}

function getPdfRegistrationTypeLabel(asset: AssetListRow) {
  const registrationType = asset.registrationType || "ครุภัณฑ์ควบคุมกิจกรรมนักศึกษา";
  if (registrationType === "ครุภัณฑ์มหาวิทยาลัย") return "มหาวิทยาลัย";
  if (registrationType === "มีทั้งเลขกิจกรรมนักศึกษาและเลขมหาวิทยาลัย") return "ทั้งสองเลข";
  return "กิจกรรมนักศึกษา";
}

export function assetToPdfReportRow(asset: AssetListRow, inspected: boolean): Record<string, string | number> {
  return {
    pdfFiscalYear: asset.fiscalYear,
    pdfAssetNumber: getPdfAssetNumberValue(asset),
    pdfNumberType: getPdfRegistrationTypeLabel(asset),
    pdfAssetName: asset.assetName,
    pdfOrganization: asset.organization,
    pdfStatus: asset.status,
    pdfInspectionResult: inspected ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจ",
  };
}

export const assetReportDisplayColumns: ReportColumn[] = [
  { key: "fiscalYear", label: "ปีงบประมาณ" },
  { key: "assetNumber", label: "หมายเลขครุภัณฑ์" },
  { key: "assetName", label: "ชื่อรายการครุภัณฑ์" },
  { key: "organization", label: "ฝ่าย/ชมรมที่รับผิดชอบ" },
  { key: "status", label: "สถานะครุภัณฑ์" },
  { key: "location", label: "สถานที่จัดเก็บ" },
];

export const inspectionReportColumns: ReportColumn[] = [
  { key: "inspectionYear", label: "ปีที่ตรวจสอบ" },
  { key: "inspectionDate", label: "วันที่ตรวจสอบ" },
  { key: "assetNumber", label: "หมายเลขครุภัณฑ์" },
  { key: "assetName", label: "ชื่อรายการครุภัณฑ์" },
  { key: "organization", label: "ฝ่าย/ชมรม" },
  { key: "foundLocation", label: "สถานที่ที่พบครุภัณฑ์" },
  { key: "statusAfterInspection", label: "สถานะครุภัณฑ์หลังตรวจสอบ" },
  { key: "inspectorName", label: "ผู้ตรวจสอบ" },
  { key: "note", label: "หมายเหตุ" },
];

export const assetListRows: AssetListRow[] = realAssets2561To2567.map((asset) => {
  const organization = normalizeOrganizationName(asset.organization_name ?? "") || "ไม่ระบุองค์กร";

  return {
    id: asset.id,
    fiscalYear: String(asset.fiscal_year ?? ""),
    budgetSource: "",
    recordDate: formatThaiDate(asset.purchase_month) || "-",
    assetCode: asset.asset_code,
    assetNumber: asset.asset_number ? String(asset.asset_number) : "-",
    assetName: asset.asset_name ?? "-",
    assetDescription: asset.asset_description ?? asset.asset_name ?? "-",
    organization,
    organizationType: getOrganizationType(organization),
    assetType: normalizeAssetType(asset.asset_type, `${asset.asset_name ?? ""} ${asset.asset_description ?? ""}`),
    location: asset.storage_location || organization,
    building: asset.building || "-",
    room: asset.room ?? "-",
    responsiblePerson: asset.responsible_person || "ผู้รับผิดชอบองค์กรนักศึกษา",
    purchaseProject: asset.purchase_project ?? "-",
    purchaseMonth: formatThaiDate(asset.purchase_month) || "-",
    numberPlacement: asset.number_placement ?? "-",
    status: asset.status || "รอตรวจสอบ",
    latestInspectionDate: "",
    inspectionResult: "",
    isInspected: false,
    imageCount: asset.image_count,
    note: asset.note,
    registrationType: "ครุภัณฑ์ควบคุมกิจกรรมนักศึกษา",
    universityAssetNumber: "-",
    assetStructureType: asset.asset_name?.includes("ชุด") ? "set" : "single",
    assetSetItems: [],
  };
});

export function buildInitialAnnualInspections(assets: AssetListRow[]): AnnualInspection[] {
  void assets;
  return [];
}

export function validateAssetImportRows(rows: AssetImportRow[], assets: AssetListRow[]) {
  const existingNumbers = new Set(assets.filter((asset) => !asset.deletedAt).map((asset) => asset.assetNumber.trim()));
  const seenNumbers = new Set<string>();

  return rows.map<AssetImportPreviewRow>((row, index) => {
    const errors: string[] = [];
    const assetNumber = row["หมายเลขครุภัณฑ์"]?.trim() ?? "";
    const status = row["สถานะครุภัณฑ์"]?.trim() ?? "";
    const price = (row["มูลค่าทรัพย์สิน"] ?? row["ราคา"])?.trim() ?? "";
    const fiscalYear = row["ปีงบประมาณ"]?.trim() ?? "";
    const phone = row["เบอร์โทรผู้รับผิดชอบ"]?.trim() ?? "";

    if (!fiscalYear) errors.push("ปีงบประมาณต้องมีค่า");
    else if (!/^[0-9]{4}$/.test(fiscalYear)) errors.push("ปีงบประมาณต้องเป็นตัวเลข 4 หลัก");
    if (phone && !/^[0-9]{9,10}$/.test(phone)) errors.push("เบอร์โทรผู้รับผิดชอบต้องเป็นตัวเลข 9-10 หลัก");
    if (!assetNumber) errors.push("หมายเลขครุภัณฑ์ต้องมีค่า");
    if (!row["ชื่อรายการครุภัณฑ์"]?.trim()) errors.push("ชื่อรายการครุภัณฑ์ต้องมีค่า");
    if (!row["ฝ่าย/ชมรมที่รับผิดชอบ"]?.trim()) errors.push("ฝ่าย/ชมรมที่รับผิดชอบต้องมีค่า");
    if (!status || !allowedAssetStatuses.includes(status)) errors.push("สถานะครุภัณฑ์ไม่ถูกต้อง");
    if (assetNumber && existingNumbers.has(assetNumber)) errors.push("พบหมายเลขครุภัณฑ์ซ้ำในระบบ");
    if (assetNumber && seenNumbers.has(assetNumber)) errors.push("พบหมายเลขครุภัณฑ์ซ้ำในไฟล์");
    if (assetNumber) seenNumbers.add(assetNumber);
    if (row["วันที่บันทึกข้อมูล"] && formatThaiDate(row["วันที่บันทึกข้อมูล"]) === "-") errors.push("วันที่บันทึกข้อมูลไม่ถูกต้อง");
    if (row["วันที่ได้รับครุภัณฑ์"] && formatThaiDate(row["วันที่ได้รับครุภัณฑ์"]) === "-") errors.push("วันที่ได้รับครุภัณฑ์ไม่ถูกต้อง");
    if (price && !Number.isFinite(Number(price))) errors.push("มูลค่าทรัพย์สินต้องเป็นตัวเลขหรือเว้นว่างได้");

    return { rowNumber: index + 2, data: row, errors };
  });
}

export function createAssetFromImportRow(row: AssetImportRow, index: number): AssetListRow {
  const now = formatThaiDateTimeWithSeconds(new Date().toISOString());
  const generatedId = Date.now() + index + 1;
  const organization = normalizeOrganizationName(row["ฝ่าย/ชมรมที่รับผิดชอบ"] || "") || "ยังไม่ได้ระบุ";
  const price = (row["มูลค่าทรัพย์สิน"] ?? row["ราคา"])?.trim() || "0";
  const budgetSource = row["แหล่งงบประมาณ"]?.trim() || "";
  const phone = row["เบอร์โทรผู้รับผิดชอบ"]?.trim() || "-";
  const structureText = row["ลักษณะครุภัณฑ์"]?.trim() || "ครุภัณฑ์เดี่ยว";
  const purchaseProject = row["จัดซื้อในโครงการ"]?.trim() || "-";
  const numberPlacement = row["ตำแหน่งที่ประทับหมายเลขครุภัณฑ์"]?.trim() || "-";

  return {
    id: generatedId,
    fiscalYear: row["ปีงบประมาณ"]?.trim() || String(new Date().getFullYear() + 543),
    budgetSource,
    recordDate: formatThaiDate(row["วันที่บันทึกข้อมูล"] || new Date().toISOString()),
    assetCode: `CMU-ASSET-IMPORT-${String(generatedId).slice(-6)}`,
    assetNumber: row["หมายเลขครุภัณฑ์"]?.trim() || `IMPORT-${generatedId}`,
    assetName: row["ชื่อรายการครุภัณฑ์"]?.trim() || "ไม่ระบุชื่อรายการ",
    assetDescription: row["รายละเอียดครุภัณฑ์"]?.trim() || row["ชื่อรายการครุภัณฑ์"]?.trim() || "-",
    organization,
    organizationType: getOrganizationType(organization),
    assetType: normalizeAssetType(row["ประเภทครุภัณฑ์"], `${row["ชื่อรายการครุภัณฑ์"] ?? ""} ${row["รายละเอียดครุภัณฑ์"] ?? ""}`),
    location: row["สถานที่จัดเก็บ"]?.trim() || "ยังไม่ได้ระบุ",
    building: "-",
    room: "-",
    responsiblePerson: row["ชื่อผู้รับผิดชอบ"]?.trim() || "ยังไม่ได้ระบุ",
    purchaseProject,
    purchaseMonth: formatThaiDate(row["วันที่ได้รับครุภัณฑ์"] || new Date().toISOString()),
    numberPlacement,
    quantity: "1",
    unit: "-",
    price: price ? Number(price || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
    responsiblePhone: phone,
    status: row["สถานะครุภัณฑ์"]?.trim() || "รอตรวจสอบ",
    latestInspectionDate: "",
    inspectionResult: "",
    isInspected: false,
    imageCount: 0,
    note: row["หมายเหตุ"]?.trim() || "-",
    registrationType: row["ประเภทการลงทะเบียน"]?.trim() || "ครุภัณฑ์ควบคุมกิจกรรมนักศึกษา",
    universityAssetNumber: row["เลขครุภัณฑ์มหาวิทยาลัย"]?.trim() || "-",
    assetStructureType: structureText.includes("ชุด") ? "set" : "single",
    assetSetItems: [],
    updatedAt: now,
    deletedAt: null,
  };
}

// --- /setting > นำเข้าข้อมูล Excel (admin-only bulk import) --------------------
// Separate from the functions above, which back the existing /record Excel
// importer — this flow needs registration-type inference from asset numbers and a
// richer per-row status bucket (ready / duplicate / incomplete / invalid), so it
// gets its own preview builder rather than reusing/changing validateAssetImportRows.

// Column names accepted as the asset-name field. Files rarely use the exact
// template header ("ชื่อรายการครุภัณฑ์"), so any of these aliases is accepted —
// matched case-insensitively (for the English ones) after collapsing whitespace.
export const ASSET_NAME_HEADER_ALIASES = [
  "ชื่อรายการครุภัณฑ์",
  "ชื่อครุภัณฑ์",
  "รายการครุภัณฑ์",
  "รายการ",
  "ชื่อรายการ",
  "รายการพัสดุ",
  "รายการทรัพย์สิน",
  "ชื่อพัสดุ",
  "assetName",
  "asset_name",
  "name",
];

function normalizeHeaderKey(header: string): string {
  return header.trim().replace(/\s+/g, " ").toLowerCase();
}

const ASSET_NAME_HEADER_ALIASES_NORMALIZED = new Set(ASSET_NAME_HEADER_ALIASES.map(normalizeHeaderKey));

// Returns the actual header text (as it appears in the file) that should be
// used as the asset-name column, or null if the file has none of the aliases.
export function findAssetNameHeader(headers: string[]): string | null {
  return headers.find((header) => ASSET_NAME_HEADER_ALIASES_NORMALIZED.has(normalizeHeaderKey(header))) ?? null;
}

export const ADMIN_IMPORT_TEMPLATE_COLUMNS = [
  "ปีงบประมาณ",
  "หมายเลขครุภัณฑ์",
  "เลขครุภัณฑ์มหาวิทยาลัย",
  "ชื่อรายการครุภัณฑ์",
  "ลักษณะครุภัณฑ์",
  "ประเภทครุภัณฑ์",
  "หน่วยงาน",
  "สถานที่จัดเก็บ",
  "สถานะ",
  "หมายเหตุ",
];

// Requirement 5: infer registration type purely from which asset number(s) a row has.
export function inferRegistrationType(assetNumber: string, universityAssetNumber: string): string | null {
  const hasActivityNumber = Boolean(assetNumber && assetNumber !== "-");
  const hasUniversityNumber = Boolean(universityAssetNumber && universityAssetNumber !== "-");
  if (hasActivityNumber && hasUniversityNumber) return "มีทั้งเลขกิจกรรมนักศึกษาและเลขมหาวิทยาลัย";
  if (hasUniversityNumber) return "ครุภัณฑ์มหาวิทยาลัย";
  if (hasActivityNumber) return "ครุภัณฑ์ควบคุมกิจกรรมนักศึกษา";
  return null;
}

const ADMIN_IMPORT_STATUS_LABEL: Record<AdminAssetImportStatus, string> = {
  ready: "พร้อมนำเข้า",
  duplicate: "ซ้ำ",
  incomplete: "ข้อมูลไม่ครบ",
  invalid: "ผิดรูปแบบ",
};

// Builds the preview rows shown in /setting before an admin confirms the import.
// `existingAssets` should be the live (non-deleted) asset list so duplicate
// detection reflects the real database, not just this file's own contents.
export function buildAdminAssetImportPreview(
  rows: AssetImportRow[],
  existingAssets: AssetListRow[],
  defaultFiscalYear: string,
): AdminAssetImportRow[] {
  const existingAssetNumbers = new Set(
    existingAssets.map((asset) => asset.assetNumber.trim()).filter((value) => value && value !== "-"),
  );
  const existingUniversityNumbers = new Set(
    existingAssets
      .map((asset) => asset.universityAssetNumber?.trim() ?? "")
      .filter((value) => value && value !== "-"),
  );
  const seenAssetNumbers = new Set<string>();
  const seenUniversityNumbers = new Set<string>();
  const assetNameHeader = findAssetNameHeader(Object.keys(rows[0] ?? {}));

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const assetName = (assetNameHeader ? row[assetNameHeader] : undefined)?.trim() ?? "";
    const assetNumber = row["หมายเลขครุภัณฑ์"]?.trim() ?? "";
    const universityAssetNumber = row["เลขครุภัณฑ์มหาวิทยาลัย"]?.trim() ?? "";
    const fiscalYearRaw = row["ปีงบประมาณ"]?.trim() ?? "";
    const fiscalYearFormatValid = !fiscalYearRaw || /^[0-9]{4}$/.test(fiscalYearRaw);
    const fiscalYear = /^[0-9]{4}$/.test(fiscalYearRaw) ? fiscalYearRaw : defaultFiscalYear;
    const assetStructureType = row["ลักษณะครุภัณฑ์"]?.trim() || "ครุภัณฑ์เดี่ยว";
    const assetType = row["ประเภทครุภัณฑ์"]?.trim() || "-";
    const organizationRaw = row["หน่วยงาน"]?.trim() || row["ฝ่าย/ชมรมที่รับผิดชอบ"]?.trim() || "-";
    const organization = organizationRaw === "-" ? "-" : normalizeOrganizationName(organizationRaw) || organizationRaw;
    const location = row["สถานที่จัดเก็บ"]?.trim() || "-";
    const statusRaw = row["สถานะ"]?.trim() || row["สถานะครุภัณฑ์"]?.trim() || "";
    const status = statusRaw && allowedAssetStatuses.includes(statusRaw) ? statusRaw : "รอตรวจสอบ";
    const note = row["หมายเหตุ"]?.trim() || "-";
    const registrationType = inferRegistrationType(assetNumber, universityAssetNumber);

    const reasons: string[] = [];
    let statusKind: AdminAssetImportStatus = "ready";

    if (!assetName) {
      reasons.push("ไม่มีชื่อรายการครุภัณฑ์");
      statusKind = "incomplete";
    } else if (!registrationType) {
      reasons.push("ไม่มีหมายเลขครุภัณฑ์หรือเลขครุภัณฑ์มหาวิทยาลัย");
      statusKind = "incomplete";
    } else if (!fiscalYearFormatValid) {
      reasons.push("ปีงบประมาณต้องเป็นตัวเลข 4 หลัก");
      statusKind = "invalid";
    } else {
      const duplicateAssetNumber = Boolean(assetNumber) && (existingAssetNumbers.has(assetNumber) || seenAssetNumbers.has(assetNumber));
      const duplicateUniversityNumber = Boolean(universityAssetNumber && universityAssetNumber !== "-")
        && (existingUniversityNumbers.has(universityAssetNumber) || seenUniversityNumbers.has(universityAssetNumber));
      if (duplicateAssetNumber) reasons.push("หมายเลขครุภัณฑ์ซ้ำ");
      if (duplicateUniversityNumber) reasons.push("เลขครุภัณฑ์มหาวิทยาลัยซ้ำ");
      if (duplicateAssetNumber || duplicateUniversityNumber) statusKind = "duplicate";
    }

    if (assetNumber) seenAssetNumbers.add(assetNumber);
    if (universityAssetNumber && universityAssetNumber !== "-") seenUniversityNumbers.add(universityAssetNumber);

    let asset: AssetListRow | undefined;
    if (statusKind === "ready" && registrationType) {
      const generatedId = Date.now() + index + 1;
      asset = {
        id: generatedId,
        fiscalYear,
        budgetSource: "",
        recordDate: "-",
        assetCode: `CMU-ASSET-IMPORT-${String(generatedId).slice(-6)}`,
        assetNumber: assetNumber || "-",
        assetName,
        assetDescription: assetName,
        organization,
        organizationType: getOrganizationType(organization),
        assetType,
        location,
        building: "-",
        room: "-",
        responsiblePerson: "-",
        purchaseProject: "-",
        purchaseMonth: "-",
        numberPlacement: "-",
        quantity: "1",
        unit: "-",
        price: "",
        responsiblePhone: "-",
        status,
        latestInspectionDate: "",
        inspectionResult: "",
        isInspected: false,
        imageCount: 0,
        assetImages: [],
        note,
        registrationType,
        universityAssetNumber: universityAssetNumber || "-",
        assetStructureType: assetStructureType.includes("ชุด") ? "set" : "single",
        assetSetItems: [],
        deletedAt: null,
      };
    }

    return {
      rowNumber,
      fiscalYear,
      assetNumber: assetNumber || "-",
      universityAssetNumber: universityAssetNumber || "-",
      registrationType: registrationType ?? "-",
      assetName: assetName || "-",
      assetStructureType,
      assetType,
      organization,
      location,
      status,
      inspectionResult: "ยังไม่ได้ตรวจ",
      note,
      statusKind,
      statusLabel: ADMIN_IMPORT_STATUS_LABEL[statusKind],
      reasons,
      asset,
    };
  });
}

export function summarizeAdminAssetImport(rows: AdminAssetImportRow[]): AdminAssetImportSummary {
  return {
    totalRows: rows.length,
    ready: rows.filter((row) => row.statusKind === "ready").length,
    duplicate: rows.filter((row) => row.statusKind === "duplicate").length,
    incomplete: rows.filter((row) => row.statusKind === "incomplete").length,
    invalid: rows.filter((row) => row.statusKind === "invalid").length,
  };
}

