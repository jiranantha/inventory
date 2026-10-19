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
  actionType: "แก้ไข" | "ลบ" | "กู้คืน" | "ยกเลิกผลตรวจ" | "อัปเดตผู้รับผิดชอบ" | "ย้อนกลับผู้รับผิดชอบ";
  targetId: number;
  targetTable: "assets";
  detail: string;
  oldValue: string;
  newValue: string;
  note?: string;
  createdAt: string;
};
// Current responsible person for a unit/organization — see unitResponsiblePersons
// in src/db/schema.ts. One active row per organization; /record and Excel import
// auto-fill from this, and /setting's bulk-update feature writes to it.
export type UnitResponsiblePerson = {
  id: number;
  organization: string;
  responsiblePerson: string;
  responsiblePhone: string;
  note: string;
  updatedAt?: string;
};
// One row per bulk "เปลี่ยนผู้รับผิดชอบของหน่วยงาน" batch — see
// unitResponsibleUpdateHistory in src/db/schema.ts. affectedAssetIds is exactly
// which asset rows that batch touched, so a rollback can restore precisely
// those rows (and only those) rather than re-matching on organization.
export type UnitResponsibleUpdateHistory = {
  id: number;
  unitName: string;
  oldResponsiblePerson: string;
  oldPhoneNumber: string;
  newResponsiblePerson: string;
  newPhoneNumber: string;
  affectedAssetIds: number[];
  affectedAssetCount: number;
  note: string;
  updatedBy: string;
  updatedAt: string;
  rolledBack: boolean;
  rolledBackAt?: string;
  rolledBackBy?: string;
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
//
// Exactly three outcomes, every row in exactly one of them (requirement:
// Total = Existing + Ready + Review):
// - "existing": matches a live DB record (by number, or by name+unit+type
//   when neither side has a number) with matching details — not re-inserted.
// - "ready": the only status that gets a payload built and actually
//   inserted — a clean new row, or a row the admin has resolved (edited, or
//   explicitly confirmed as number-less) with no remaining ambiguity.
// - "review": never auto-inserted and never auto-skipped — covers every kind
//   of ambiguity (a number shared by two rows, a number matching an existing
//   record under a different name, a numberless row awaiting the admin's
//   explicit per-row confirmation, a numberless row that resembles another
//   numberless row/record by name+unit+type, a missing asset name the admin
//   still needs to fill in, etc). All fixable by editing + revalidating.
export type AdminAssetImportStatus = "ready" | "review" | "existing";
export type AdminAssetImportRow = {
  rowNumber: number;
  fiscalYear: string;
  assetNumber: string;
  universityAssetNumber: string;
  registrationType: string;
  numberPlacement: string;
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
  matchedExistingId?: number;
  // True only for a "review" row that's blocked purely on the admin's
  // explicit "ยืนยันนำเข้าโดยไม่มีเลขครุภัณฑ์" confirmation (requirement 5) —
  // the UI uses this to decide whether to show that specific action.
  needsNoNumberConfirmation?: boolean;
  asset?: AssetListRow;
};
export type AdminAssetImportSummary = {
  totalRows: number;
  existing: number;
  ready: number;
  review: number;
};
// Returned by POST /api/assets/import after the server re-validated/re-checked
// duplicates against live data and actually inserted rows (see AdminAssetImportSummary
// above for the client-side preview-time counts shown before confirming).
export type AssetImportInsertSummary = {
  totalRows: number;
  insertedCount: number;
  existingCount: number;
  invalidCount: number;
  errorCount: number;
  failedRows?: { assetName: string; assetNumber: string; universityAssetNumber: string; error: string }[];
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
  | "registrationType"
  | "assetName"
  | "assetNumber"
  | "universityAssetNumber"
  | "numberPlacement"
  | "fiscalYear"
  | "assetStructureType"
  | "assetType"
  | "assetDescription"
  | "budgetSource"
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

// Inline edits made in the import preview table, keyed by that row's
// `rowNumber` (stable across revalidation — it's always "Excel row index +
// 2", never reassigned). A present key always wins over whatever the mapped
// Excel column would have produced; it's held in memory only (import draft
// state), never written to the file or the database until the row is
// actually inserted.
export type AdminImportRowOverrides = Record<number, Partial<Record<AdminImportFieldKey, string>>>;

export type HistoryFieldRow = {
  label: string;
  value: string;
  changed: boolean;
};

