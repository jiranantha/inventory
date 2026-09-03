export type PageKey = "dashboard" | "record" | "list" | "detail" | "edit" | "audit" | "settings";
export type Organization = {
  name: string;
  type: "สโมสรนักศึกษา" | "สภานักศึกษา" | "ฝ่าย" | "ชมรม" | "ชมรมจังหวัด" | "อื่น ๆ";
};
export type AssetListRow = {
  id: number;
  fiscalYear: string;
  budgetSource?: string;
  recordDate: string;
  assetCode: string;
  assetNumber: string;
  assetName: string;
  assetDescription: string;
  organization: string;
  organizationType: string;
  assetType: string;
  location: string;
  building: string;
  room: string;
  responsiblePerson: string;
  purchaseProject: string;
  purchaseMonth: string;
  numberPlacement: string;
  quantity?: string;
  unit?: string;
  price?: string;
  responsiblePhone?: string;
  status: string;
  latestInspectionDate: string;
  inspectionResult: string;
  isInspected: boolean;
  imageCount: number;
  assetImages?: EvidenceImage[];
  note: string;
  registrationType?: string;
  universityAssetNumber?: string;
  assetStructureType: "single" | "set";
  assetSetItems: AssetSetItem[];
  updatedAt?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
};
export type AssetSetItem = {
  id: number;
  assetId: number;
  itemName: string;
  quantity: string;
  unit: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};
export type ActivityLog = {
  id: number;
  userName: string;
  actionType: "แก้ไข" | "ลบ" | "กู้คืน" | "ยกเลิกผลตรวจ";
  targetId: number;
  targetTable: "assets";
  detail: string;
  oldValue: string;
  newValue: string;
  note?: string;
  createdAt: string;
};
export type AnnualInspection = {
  id: string;
  assetId: number;
  assetCode: string;
  inspectionYear: string;
  inspectionDate: string;
  foundLocation: string;
  inspectorName: string;
  result: string;
  evidenceFileNames: string[];
  evidenceImages?: EvidenceImage[];
  note: string;
  previousStatus?: string;
  createdAt: string;
  updatedAt: string;
};
export type EvidenceImage = {
  name: string;
  url: string;
  size: number;
};
export type ReportFormat = "pdf" | "word" | "excel";
export type ReportColumn = {
  key: string;
  label: string;
};
export type MasterDataItem = {
  id: number;
  name: string;
  active: boolean;
};

export type AssetImportRow = Record<string, string>;
export type AssetImportPreviewRow = {
  rowNumber: number;
  data: AssetImportRow;
  errors: string[];
};

// /setting > นำเข้าข้อมูล Excel (admin-only bulk import) — a separate, richer preview
// shape from AssetImportPreviewRow above (which backs the existing /record importer)
// since this flow needs per-row status buckets and registration-type inference.
export type AdminAssetImportStatus = "ready" | "duplicate" | "incomplete" | "invalid";
export type AdminAssetImportRow = {
  rowNumber: number;
  fiscalYear: string;
  assetNumber: string;
  universityAssetNumber: string;
  registrationType: string;
  assetName: string;
  assetStructureType: string;
  assetType: string;
  organization: string;
  location: string;
  status: string;
  inspectionResult: string;
  note: string;
  statusKind: AdminAssetImportStatus;
  statusLabel: string;
  reasons: string[];
  asset?: AssetListRow;
};
export type AdminAssetImportSummary = {
  totalRows: number;
  ready: number;
  duplicate: number;
  incomplete: number;
  invalid: number;
};
// Returned by POST /api/assets/import after the server re-validated/re-checked
// duplicates against live data and actually inserted rows (see AdminAssetImportSummary
// above for the client-side preview-time counts shown before confirming).
export type AssetImportInsertSummary = {
  totalRows: number;
  insertedCount: number;
  duplicateCount: number;
  invalidCount: number;
  errorCount: number;
};

// Excel files uploaded to the admin importer make no assumption about header
// text — each sheet's columns get a synthetic id (col_0, col_1, ...) plus a
// human-readable label (the detected header text, or "คอลัมน์ A"/"B"/... when
// blank), and the admin manually maps those ids to system fields below.
export type DetectedExcelColumn = { id: string; label: string };
export type DetectedExcelSheet = {
  name: string;
  columns: DetectedExcelColumn[];
  rows: Record<string, string>[];
};
export type DetectedExcelWorkbook = { sheets: DetectedExcelSheet[] };

export type AdminImportFieldKey =
  | "assetName"
  | "assetNumber"
  | "universityAssetNumber"
  | "fiscalYear"
  | "assetStructureType"
  | "assetType"
  | "assetDescription"
  | "purchaseProject"
  | "recordDate"
  | "status"
  | "note"
  | "organization"
  | "location"
  | "responsiblePerson"
  | "responsiblePhone";

// Maps a system field to the id of the Excel column the admin picked for it
// (or null/absent for "ไม่ใช้คอลัมน์นี้" — not mapped).
export type AdminImportColumnMapping = Partial<Record<AdminImportFieldKey, string | null>>;

export type HistoryFieldRow = {
  label: string;
  value: string;
  changed: boolean;
};

