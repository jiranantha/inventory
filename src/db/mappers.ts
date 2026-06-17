import type { ActivityLogRow, AssetRow, InspectionRow, RoleRow, UserRow } from "@/db/schema";
import { formatThaiDateTime, formatThaiDateTimeWithSeconds } from "@/lib/dates";
import type { AppUser, RoleDefinition } from "@/lib/permissions";
import type { ActivityLog, AnnualInspection, AssetListRow, EvidenceImage } from "@/types";

// --- assets -----------------------------------------------------------------

export function rowToAsset(row: AssetRow): AssetListRow {
  return {
    id: row.id,
    fiscalYear: row.fiscalYear != null ? String(row.fiscalYear) : "",
    budgetSource: row.budgetSource,
    recordDate: row.recordDate,
    assetCode: row.assetCode,
    assetNumber: row.assetNumber,
    assetName: row.assetName,
    assetDescription: row.assetDescription,
    organization: row.organization,
    organizationType: row.organizationType,
    assetType: row.assetType,
    location: row.location,
    building: row.building,
    room: row.room,
    responsiblePerson: row.responsiblePerson,
    purchaseProject: row.purchaseProject,
    purchaseMonth: row.purchaseMonth,
    numberPlacement: row.numberPlacement,
    quantity: row.quantity,
    unit: row.unit,
    price: row.price,
    responsiblePhone: row.responsiblePhone,
    status: row.status,
    latestInspectionDate: row.latestInspectionDate,
    inspectionResult: row.inspectionResult,
    isInspected: row.isInspected,
    imageCount: row.imageCount,
    assetImages: (row.assetImages ?? []) as EvidenceImage[],
    note: row.note,
    assetStructureType: row.assetStructureType === "set" ? "set" : "single",
    assetSetItems: row.assetSetItems ?? [],
    updatedAt: row.updatedAt ? formatThaiDateTimeWithSeconds(row.updatedAt.toISOString()) : undefined,
    deletedAt: row.deletedAt ? formatThaiDateTimeWithSeconds(row.deletedAt.toISOString()) : null,
    deletedBy: row.deletedBy ?? null,
  };
}

function parseFiscalYear(value: string | undefined): number | null {
  const n = Number((value ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Columns the client is allowed to write (excludes id, timestamps, soft-delete —
// those are server-controlled).
export function assetToColumns(asset: AssetListRow) {
  return {
    assetCode: asset.assetCode,
    assetNumber: asset.assetNumber || "-",
    assetName: asset.assetName,
    assetDescription: asset.assetDescription || "-",
    organization: asset.organization,
    organizationType: asset.organizationType || "อื่น ๆ",
    assetType: asset.assetType || "ครุภัณฑ์และอุปกรณ์อื่น ๆ",
    fiscalYear: parseFiscalYear(asset.fiscalYear),
    budgetSource: asset.budgetSource ?? "",
    recordDate: asset.recordDate || "-",
    location: asset.location || "-",
    building: asset.building || "-",
    room: asset.room || "-",
    responsiblePerson: asset.responsiblePerson || "-",
    purchaseProject: asset.purchaseProject || "-",
    purchaseMonth: asset.purchaseMonth || "-",
    numberPlacement: asset.numberPlacement || "-",
    quantity: asset.quantity ?? "1",
    unit: asset.unit ?? "รายการ",
    price: asset.price ?? "",
    responsiblePhone: asset.responsiblePhone ?? "-",
    status: asset.status,
    latestInspectionDate: asset.latestInspectionDate ?? "",
    inspectionResult: asset.inspectionResult ?? "",
    isInspected: asset.isInspected,
    imageCount: asset.imageCount ?? 0,
    assetImages: (asset.assetImages ?? []) as EvidenceImage[],
    note: asset.note || "-",
    assetStructureType: asset.assetStructureType === "set" ? "set" : "single",
    assetSetItems: asset.assetSetItems ?? [],
  };
}

// --- annual inspections -----------------------------------------------------

export function rowToInspection(row: InspectionRow): AnnualInspection {
  return {
    id: row.id,
    assetId: row.assetId,
    assetCode: row.assetCode,
    inspectionYear: String(row.inspectionYear),
    inspectionDate: row.inspectionDate,
    foundLocation: row.foundLocation,
    inspectorName: row.inspectorName,
    result: row.result,
    evidenceFileNames: row.evidenceFileNames ?? [],
    evidenceImages: (row.evidenceImages ?? []) as EvidenceImage[],
    note: row.note,
    previousStatus: row.previousStatus ?? undefined,
    createdAt: row.createdAt ? formatThaiDateTimeWithSeconds(row.createdAt.toISOString()) : "",
    updatedAt: row.updatedAt ? formatThaiDateTimeWithSeconds(row.updatedAt.toISOString()) : "",
  };
}

export function inspectionToColumns(inspection: AnnualInspection) {
  return {
    assetId: inspection.assetId,
    assetCode: inspection.assetCode ?? "",
    inspectionYear: Number(inspection.inspectionYear),
    inspectionDate: inspection.inspectionDate ?? "",
    foundLocation: inspection.foundLocation ?? "",
    inspectorName: inspection.inspectorName ?? "",
    result: inspection.result ?? "",
    evidenceFileNames: inspection.evidenceFileNames ?? [],
    evidenceImages: (inspection.evidenceImages ?? []) as EvidenceImage[],
    note: inspection.note ?? "",
    previousStatus: inspection.previousStatus ?? null,
  };
}

// --- activity logs ----------------------------------------------------------

export function rowToActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    userName: row.userName,
    actionType: row.actionType as ActivityLog["actionType"],
    targetId: row.targetId,
    targetTable: "assets",
    detail: row.detail,
    oldValue: row.oldValue,
    newValue: row.newValue,
    note: row.note ?? undefined,
    createdAt: row.createdAt ? formatThaiDateTime(row.createdAt.toISOString()) : "",
  };
}

// --- users ------------------------------------------------------------------

export function rowToAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    name: row.name ?? row.email ?? "ผู้ใช้งาน",
    email: row.email ?? "",
    role: row.role ?? "",
    organization: row.organization,
    viewerCanExport: row.viewerCanExport,
    active: row.active,
  };
}

// --- roles ------------------------------------------------------------------

export function rowToRole(row: RoleRow): RoleDefinition {
  return {
    key: row.key,
    name: row.name,
    description: row.description,
    permissions: row.permissions,
    allowExport: row.allowExport,
    active: row.active,
    protected: row.protected,
  };
}
