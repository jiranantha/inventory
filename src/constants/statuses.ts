import { assetStatusColors } from "@/constants/colors";

// Single source of truth for asset statuses. Dropdowns, filters, import validation,
// dashboard cards and report definitions all derive from this list so they cannot drift.
export const ASSET_STATUSES = [
  "ใช้งานได้",
  "ชำรุด",
  "รอซ่อม",
  "สูญหาย",
  "โอนย้าย",
  "จำหน่ายแล้ว",
  "รอตรวจสอบ",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

// Mutable copy for APIs that expect string[] (e.g. Array.includes on a widened type).
export const allowedAssetStatuses: string[] = [...ASSET_STATUSES];

// "ทั้งหมด" (= all) sentinel prepended for filter dropdowns.
export const ASSET_STATUS_FILTER_OPTIONS: string[] = ["ทั้งหมด", ...ASSET_STATUSES];

export const statusColors: Record<string, string> = Object.fromEntries(
  Object.entries(assetStatusColors).map(([status, colors]) => [status, colors.chart]),
);
