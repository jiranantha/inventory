import { realAssets2561To2567 } from "@/data/real-assets-2561-2567";
import { assetTypeOptions } from "@/constants/options";
import { allowedAssetStatuses } from "@/constants/statuses";
import { formatThaiDate, formatThaiDateTimeWithSeconds } from "@/lib/dates";
import { getOrganizationType, normalizeOrganizationName } from "@/lib/organizations";
import { AnnualInspection, AssetImportPreviewRow, AssetImportRow, AssetListRow, ReportColumn } from "@/types";

// Running number to start counting from when no existing asset number is parseable
// (the organisation's legacy register ended at 143).
export const ASSET_NUMBER_PREFIX = "ค.อ.มช.";
export const ASSET_NUMBER_SEED = 143;

export function getNextAssetNumber(assets: AssetListRow[], fiscalYear: string) {
  const latestSequence = assets.reduce((highest, asset) => {
    const match = asset.assetNumber.match(/(?:ค\.อ\.มช\.\s*)?(\d{1,6})\s*\/\s*\d{4}/);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, ASSET_NUMBER_SEED);

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
  { key: "assetNumber", label: "หมายเลขครุภัณฑ์" },
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
    assetStructureType: structureText.includes("ชุด") ? "set" : "single",
    assetSetItems: [],
    updatedAt: now,
    deletedAt: null,
  };
}

