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

export type HistoryFieldRow = {
  label: string;
  value: string;
  changed: boolean;
};

