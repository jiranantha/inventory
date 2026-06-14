"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { assetStatusColors, buttonColors, chartColors, dashboardCardColors, inspectionStatusColors } from "@/constants/colors";
import { realAssets2561To2567 } from "@/data/real-assets-2561-2567";

type PageKey = "dashboard" | "record" | "list" | "detail" | "edit" | "audit" | "reports" | "settings";
type UserRole = string;
type AppUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  viewerCanExport: boolean;
  active: boolean;
};
type Permissions = {
  canViewDashboard: boolean;
  canViewList: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canInspect: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canViewAllOrganizations: boolean;
  canEditLimitedFields: boolean;
};
type RoleDefinition = {
  key: UserRole;
  name: string;
  description: string;
  permissions: Permissions;
  allowExport: boolean;
  active: boolean;
  protected?: boolean;
};
type Organization = {
  name: string;
  type: "สโมสรนักศึกษา" | "สภานักศึกษา" | "ฝ่าย" | "ชมรม" | "ชมรมจังหวัด" | "อื่น ๆ";
};
type AssetListRow = {
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
type AssetSetItem = {
  id: number;
  assetId: number;
  itemName: string;
  quantity: string;
  unit: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};
type ActivityLog = {
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
type AnnualInspection = {
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
  createdAt: string;
  updatedAt: string;
};
type EvidenceImage = {
  name: string;
  url: string;
  size: number;
};
type ReportFormat = "pdf" | "word" | "excel";
type ReportColumn = {
  key: string;
  label: string;
};
type MasterDataItem = {
  id: number;
  name: string;
  active: boolean;
};

const menuItems: Array<{ key: PageKey; label: string; icon: string }> = [
  { key: "dashboard", label: "Dashboard", icon: "M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" },
  { key: "list", label: "แสดงรายการครุภัณฑ์", icon: "M4 6h16M4 12h16M4 18h16M7 6v12" },
  { key: "audit", label: "ตรวจสอบครุภัณฑ์", icon: "M9 12l2 2 4-5M12 3l8 4v5c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V7l8-4Z" },
  { key: "record", label: "บันทึกข้อมูลครุภัณฑ์", icon: "M5 3h10l4 4v14H5V3Zm9 1.5V8h3.5M8 12h8M8 16h8M8 8h3" },
  { key: "reports", label: "รายงาน", icon: "M5 21V3h10l4 4v14H5Zm10-17v4h4M8 17h8M8 13h8M8 9h4" },
  { key: "settings", label: "ตั้งค่า", icon: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.7-1L15.5 3h-4l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.5L7.1 11a7.7 7.7 0 0 0 0 2L5.1 14.5l2 3.5 2.4-1a7 7 0 0 0 1.7 1l.3 3h4l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" },
];

const organizationNames = [
  "สภานักศึกษามหาวิทยาลัยเชียงใหม่",
  "ตี้เดียวฮู้เรื่อง",
  "กองพัฒนานักศึกษา",
  "ฝ่ายวิชาการ",
  "ฝ่ายศาสนาและศิลปวัฒนธรรม",
  "ฝ่ายนักศึกษาสัมพันธ์และวิเทศสัมพันธ์",
  "ฝ่ายจิตอาสาและบำเพ็ญประโยชน์",
  "ชมรมถ่ายภาพมองภาพผ่านเลนส์",
  "ชมรมประชาธิปไตย",
  "ชมรมศิลปะและการออกแบบ",
  "ชมรมวรรณศิลป์",
  "ชมรมสิทธิมนุษยชน",
  "ชมรมTEDxChiangMaiU",
  "ชมรม CMU OB Livestreaming",
  "ชมรมดนตรีสากล",
  "ชมรมคริสตชน",
  "ชมรมพุทธศิลปศึกษาและประเพณี",
  "ชมรมพื้นบ้านล้านนา",
  "ชมรมนักศึกษามุสลิม",
  "ชมรมนักศึกษาอีสาน",
  "ชมรมส่งเสริมศิลปวัฒนธรรมปักษ์ใต้",
  "ชมรมนาฏศิลป์และดนตรีไทย",
  "ชมรมการแสดง",
  "ชมรมดุริยางค์",
  "ชมรมขับร้องและประสานเสียง",
  "ชมรมผู้นำเชียร์แห่งมหาวิทยาลัยเชียงใหม่",
  "ชมรมโรตาแรคท์",
  "ชมรมนักศึกษาชาติพันธุ์",
  "ชมรมเพื่อนผู้พิการ",
  "ชมรมนักศึกษาวิชาทหาร",
  "ชมรมนักศึกษานานาชาติ",
  "ชมรมนักศึกษาทุนตอบแทนคุณ",
  "ชมรมสันทนาการมหาวิทยาลัยเชียงใหม่",
  "ชมรมนักศึกษากรุงเทพ ฯ",
  "ชมรมนักศึกษาจังหวัดสุโขทัย",
  "ชมรมนักศึกษาจังหวัดพะเยา",
  "ชมรมนักศึกษาจังหวัดพิจิตร",
  "ชมรมนักศึกษาจังหวัดนครสวรรค์",
  "ชมรมนักศึกษาจังหวัดลำพูน",
  "ชมรมนักศึกษาจังหวัดแพร่",
  "ชมรมอนุรักษ์ธรรมชาติและสิ่งแวดล้อม",
  "ชมรม TO BE NUMBER ONE",
  "ชมรมเด็กดีมีที่เรียน",
  "ชมรมรากแก้ว มหาวิทยาลัยเชียงใหม่",
  "ชมรมนักศึกษาจังหวัดน่าน",
  "ชมรมนักศึกษาจังหวัดเชียงราย",
  "ชมรมนักศึกษาจังหวัดตาก",
  "ชมรมนักศึกษาจังหวัดแม่ฮ่องสอน",
  "ชมรมนักศึกษาจังหวัดลำปาง",
];

function normalizeOrganizationName(name: string) {
  const cleanName = name.trim();
  if (cleanName === "สภานักศึกษา") return "สภานักศึกษามหาวิทยาลัยเชียงใหม่";
  return cleanName;
}

function getOrganizationType(name: string): Organization["type"] {
  if (name.includes("สโมสรนักศึกษา")) return "สโมสรนักศึกษา";
  if (name.includes("สภานักศึกษา")) return "สภานักศึกษา";
  if (name.startsWith("ฝ่าย")) return "ฝ่าย";
  if (name.includes("จังหวัด") || name === "ชมรมนักศึกษากรุงเทพ ฯ") return "ชมรมจังหวัด";
  if (name.startsWith("ชมรม")) return "ชมรม";
  return "อื่น ๆ";
}

const organizations: Organization[] = uniqueSorted([
  ...organizationNames,
  ...realAssets2561To2567.map((asset) => normalizeOrganizationName(asset.organization_name ?? "")),
]).filter((name) => name !== "สโมสรนักศึกษา" && name !== "สภานักศึกษา").map((name) => ({
  name,
  type: getOrganizationType(name),
}));

const assetTypeOptions = [
  "ครุภัณฑ์และอุปกรณ์สำนักงาน",
  "ครุภัณฑ์และอุปกรณ์อิเล็กทรอนิกส์",
  "ครุภัณฑ์และอุปกรณ์ตกแต่งสถานที่",
  "ครุภัณฑ์และอุปกรณ์เครื่องดนตรี",
  "ครุภัณฑ์และอุปกรณ์คอมพิวเตอร์และอุปกรณ์ IT",
  "ครุภัณฑ์และอุปกรณ์อื่น ๆ",
];

const budgetSourceOptions = [
  "กิจกรรมเสริมหลักสูตรและกีฬานักศึกษา",
  "เงินทุนส่งเสริมกิจกรรมนักศึกษา",
  "งบประมาณเงินรายได้ (บุคคลากร)",
];

const storageLocationOptions = [
  "ห้องชมรม",
  "ตี้เดียวฮู้เรื่อง",
];

function getNextAssetNumber(assets: AssetListRow[], fiscalYear: string) {
  const latestSequence = assets.reduce((highest, asset) => {
    const match = asset.assetNumber.match(/(?:ค\.อ\.มช\.\s*)?(\d{1,6})\s*\/\s*\d{4}/);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isFinite(sequence) ? Math.max(highest, sequence) : highest;
  }, 143);

  return `ค.อ.มช.${String(latestSequence + 1).padStart(4, "0")}/${fiscalYear}`;
}

function normalizeAssetType(value: string | null | undefined, context = "") {
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
    return "ครุภัณฑ์และอุปกรณ์อิเล็กทรอนิค";
  }
  if (/(โต๊ะ|เก้าอี้|ชั้นวาง|บอร์ด|ไวท์บอร์ด|เฟอร์นิเจอร์|ตกแต่ง)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์ตกแต่งสถานที่";
  }
  if (/(อุปกรณ์สำนักงาน|เครื่องใช้สำนักงาน|สำนักงาน)/i.test(text)) {
    return "ครุภัณฑ์และอุปกรณ์สำนักงาน";
  }
  return "ครุภัณฑ์และอุปกรณ์อื่น ๆ";
}

const initialUsers: AppUser[] = [
  { id: 1, name: "ผู้ดูแลระบบ", email: "admin@cmu.ac.th", role: "Admin", organization: "กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", viewerCanExport: true, active: true },
  { id: 2, name: "เจ้าหน้าที่พัสดุ", email: "staff@cmu.ac.th", role: "Staff", organization: "กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", viewerCanExport: true, active: true },
  { id: 3, name: "คณะกรรมการนักศึกษา", email: "committee@cmu.ac.th", role: "Committee", organization: "-", viewerCanExport: false, active: true },
  { id: 4, name: "ผู้ดูรายงาน", email: "viewer@cmu.ac.th", role: "Viewer", organization: "-", viewerCanExport: false, active: true },
  { id: 5, name: "ผู้ตรวจสอบ 1", email: "inspector1@cmu.ac.th", role: "Inspector", organization: "-", viewerCanExport: false, active: true },
];

const noPermissions: Permissions = {
  canViewDashboard: false, canViewList: false, canCreate: false, canEdit: false, canDelete: false, canExport: false,
  canInspect: false, canViewReports: false, canManageUsers: false, canViewAllOrganizations: true,
  canEditLimitedFields: false,
};

const initialRoleDefinitions: RoleDefinition[] = [
  { key: "Admin", name: "ผู้ดูแลระบบ", description: "ใช้งานและจัดการระบบได้ทุกส่วน", allowExport: true, active: true, protected: true, permissions: {
      canViewDashboard: true,
      canViewList: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canExport: true,
      canInspect: true,
      canViewReports: true,
      canManageUsers: true,
      canViewAllOrganizations: true,
      canEditLimitedFields: false,
  } },
  { key: "Staff", name: "เจ้าหน้าที่พัสดุ", description: "จัดการข้อมูลครุภัณฑ์และตรวจสอบประจำปี", allowExport: true, active: true, permissions: {
      canViewDashboard: true,
      canViewList: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canExport: true,
      canInspect: true,
      canViewReports: true,
      canManageUsers: false,
      canViewAllOrganizations: true,
      canEditLimitedFields: false,
  } },
  { key: "Committee", name: "คณะกรรมการนักศึกษา", description: "ดูรายการและช่วยตรวจสอบครุภัณฑ์ประจำปี", allowExport: false, active: true, permissions: {
      canViewDashboard: false,
      canViewList: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canExport: false,
      canInspect: true,
      canViewReports: false,
      canManageUsers: false,
      canViewAllOrganizations: true,
      canEditLimitedFields: false,
  } },
  { key: "Inspector", name: "ผู้ตรวจสอบ", description: "ดูรายการและบันทึกผลตรวจสอบประจำปี", allowExport: false, active: true, permissions: {
      ...noPermissions, canViewList: true, canInspect: true, canViewAllOrganizations: true,
  } },
  { key: "Viewer", name: "ผู้ดูรายงาน", description: "ดูหน้าภาพรวมและรายงาน", allowExport: false, active: true, permissions: {
      ...noPermissions, canViewDashboard: true, canViewList: true, canViewReports: true, canViewAllOrganizations: false,
  } },
];

function getRoleDefinition(role: UserRole, roles: RoleDefinition[]) {
  return roles.find((item) => item.key === role) ?? roles.find((item) => item.key === "Viewer") ?? initialRoleDefinitions[4];
}

function getPermissions(user: AppUser, roles: RoleDefinition[] = initialRoleDefinitions): Permissions {
  const role = getRoleDefinition(user.role, roles);
  return { ...role.permissions, canExport: role.permissions.canExport && user.viewerCanExport };
}

function getPermissionLabel(permissions: Permissions) {
  const labels = [
    permissions.canViewDashboard && "หน้าภาพรวม",
    permissions.canViewList && "แสดงรายการ",
    permissions.canInspect && "ตรวจสอบประจำปี",
    permissions.canCreate && "บันทึกข้อมูล",
    permissions.canViewReports && "รายงาน",
    permissions.canManageUsers && "ตั้งค่า",
    permissions.canEdit && "แก้ไขข้อมูลครุภัณฑ์",
    permissions.canDelete && "ลบข้อมูลครุภัณฑ์",
    permissions.canExport && "ส่งออกข้อมูล",
  ].filter(Boolean);
  return labels.join(", ");
}

function canAccessAsset(user: AppUser, permissions: Permissions, asset: AssetListRow) {
  return permissions.canViewAllOrganizations || asset.organization === user.organization;
}

const statusColors: Record<string, string> = Object.fromEntries(
  Object.entries(assetStatusColors).map(([status, colors]) => [status, colors.chart]),
);

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const key = getKey(item) || "ไม่ระบุ";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getCurrentInspectionYear(date = new Date()) {
  const thaiYear = date.getFullYear() + 543;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isNewInspectionCycle = month > 5 || (month === 5 && day >= 1);
  return isNewInspectionCycle ? thaiYear : thaiYear - 1;
}

function formatThaiDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";

  const renderDate = (date: Date, yearOverride?: number) => {
    if (Number.isNaN(date.getTime())) return "-";
    const day = padDatePart(date.getUTCDate());
    const month = padDatePart(date.getUTCMonth() + 1);
    const christianYear = date.getUTCFullYear();
    const thaiYear = yearOverride ?? (christianYear > 2400 ? christianYear : christianYear + 543);
    return `${day}/${month}/${thaiYear}`;
  };

  if (typeof value === "number") {
    const excelDate = new Date(Date.UTC(1899, 11, 30));
    excelDate.setUTCDate(excelDate.getUTCDate() + value);
    return renderDate(excelDate);
  }

  const rawValue = value.trim();
  if (!rawValue || rawValue === "-") return "-";

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    return formatThaiDate(Number(rawValue));
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const christianYear = Number(year);
    const thaiYear = christianYear > 2400 ? christianYear : christianYear + 543;
    return `${day}/${month}/${thaiYear}`;
  }

  const date = new Date(rawValue);
  if (!Number.isNaN(date.getTime())) return renderDate(date);

  return "-";
}

function normalizeDateValue(value: string | number | null | undefined) {
  return formatThaiDate(value);
}

function formatThaiDateTime(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const rawValue = String(value).trim();
  const thaiDateTimeMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})/);
  if (thaiDateTimeMatch) {
    const [, day, month, year, hour, minute] = thaiDateTimeMatch;
    return `${padDatePart(Number(day))}/${padDatePart(Number(month))}/${year} ${padDatePart(Number(hour))}:${minute} น.`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  const thaiYear = date.getFullYear() + 543;
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());
  return `${day}/${month}/${thaiYear} ${hour}:${minute} น.`;
}

function formatThaiDateTimeWithSeconds(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const rawValue = String(value).trim();
  const thaiDateTimeMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (thaiDateTimeMatch) {
    const [, day, month, year, hour, minute, second = "00"] = thaiDateTimeMatch;
    return `${padDatePart(Number(day))}/${padDatePart(Number(month))}/${year} ${padDatePart(Number(hour))}:${minute}:${second}`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear() + 543} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value || value === "-") return "";
  const thaiDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (thaiDateMatch) {
    const [, day, month, year] = thaiDateMatch;
    const christianYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);
    return `${christianYear}-${month}-${day}`;
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return "";
}

const allowedAssetStatuses = ["ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว", "รอตรวจสอบ"];

type AssetImportRow = Record<string, string>;
type AssetImportPreviewRow = {
  rowNumber: number;
  data: AssetImportRow;
  errors: string[];
};

function getExcelColumnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRawData(data: Uint8Array) {
  const maybeDecompressionStream = (globalThis as unknown as { DecompressionStream?: new (format: string) => TransformStream<Uint8Array, Uint8Array> }).DecompressionStream;
  if (!maybeDecompressionStream) throw new Error("เบราว์เซอร์นี้ยังไม่รองรับการอ่านไฟล์ .xlsx ที่บีบอัด");
  const stream = new Blob([new Uint8Array(data).buffer]).stream().pipeThrough(new maybeDecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocdOffset = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ไม่พบโครงสร้างไฟล์ Excel");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let pointer = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("โครงสร้างไฟล์ Excel ไม่ถูกต้อง");
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressedData : method === 8 ? await inflateRawData(compressedData) : null;
    if (!data) throw new Error(`ไม่รองรับ compression method ${method}`);
    entries.set(name, decoder.decode(data));
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function parseSheetXml(sheetXml: string, sharedStrings: string[]) {
  const xml = new DOMParser().parseFromString(sheetXml, "application/xml");
  const rows = Array.from(xml.getElementsByTagName("row")).map((rowElement) => {
    const cells: string[] = [];
    Array.from(rowElement.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const columnIndex = getExcelColumnIndex(ref);
      const type = cell.getAttribute("t");
      const valueNode = cell.getElementsByTagName("v")[0];
      const inlineNode = cell.getElementsByTagName("t")[0];
      const rawValue = type === "s" ? sharedStrings[Number(valueNode?.textContent ?? 0)] : inlineNode?.textContent ?? valueNode?.textContent ?? "";
      cells[columnIndex] = rawValue.trim();
    });
    return cells;
  });
  const [headers = [], ...dataRows] = rows;
  return dataRows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

async function readAssetRowsFromFile(file: File): Promise<AssetImportRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx") {
    const entries = await readZipEntries(await file.arrayBuffer());
    const sharedStringsXml = entries.get("xl/sharedStrings.xml");
    const sharedStrings = sharedStringsXml
      ? Array.from(new DOMParser().parseFromString(sharedStringsXml, "application/xml").getElementsByTagName("si")).map((item) => Array.from(item.getElementsByTagName("t")).map((text) => text.textContent ?? "").join(""))
      : [];
    const sheetXml = entries.get("xl/worksheets/sheet1.xml") ?? Array.from(entries.entries()).find(([name]) => name.startsWith("xl/worksheets/sheet"))?.[1];
    if (!sheetXml) throw new Error("ไม่พบ sheet สำหรับนำเข้า");
    return parseSheetXml(sheetXml, sharedStrings);
  }

  const text = await file.text();
  const documentHtml = new DOMParser().parseFromString(text, "text/html");
  const tableRows = Array.from(documentHtml.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
  const rows = tableRows.length > 0 ? tableRows : text.split(/\r?\n/).filter(Boolean).map((line) => line.split(line.includes("\t") ? "\t" : ",").map((cell) => cell.trim()));
  const [headers = [], ...dataRows] = rows;
  return dataRows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function validateAssetImportRows(rows: AssetImportRow[], assets: AssetListRow[]) {
  const existingNumbers = new Set(assets.filter((asset) => !asset.deletedAt).map((asset) => asset.assetNumber.trim()));
  const seenNumbers = new Set<string>();

  return rows.map<AssetImportPreviewRow>((row, index) => {
    const errors: string[] = [];
    const assetNumber = row["หมายเลขครุภัณฑ์"]?.trim() ?? "";
    const status = row["สถานะครุภัณฑ์"]?.trim() ?? "";
    const price = (row["มูลค่าทรัพย์สิน"] ?? row["ราคา"])?.trim() ?? "";

    if (!row["ปีงบประมาณ"]?.trim()) errors.push("ปีงบประมาณต้องมีค่า");
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

function createAssetFromImportRow(row: AssetImportRow, index: number): AssetListRow {
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

function getDateSortTime(value: string | number | null | undefined) {
  const normalizedDate = formatThaiDate(value);
  if (normalizedDate === "-") return Number.NEGATIVE_INFINITY;
  const thaiDateMatch = normalizedDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!thaiDateMatch) return Number.NEGATIVE_INFINITY;
  const [, day, month, year] = thaiDateMatch;
  const christianYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);
  const date = new Date(Date.UTC(christianYear, Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

function getAssetDerivedValues(asset: AssetListRow) {
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

function getPurchaseProjectValue(asset: AssetListRow) {
  const value = asset.purchaseProject?.trim();
  if (!value || value === "-" || /^จำนวน\s.+\s\/\sราคา/.test(value)) return "-";
  return value;
}

function getNumberPlacementValue(asset: AssetListRow) {
  const value = asset.numberPlacement?.trim();
  if (!value || value === "-" || value === "นำเข้าจาก Excel" || value === "บันทึกจากหน้าเพิ่มข้อมูลครุภัณฑ์") return "-";
  return value;
}

const assetReportExportColumns: ReportColumn[] = [
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

const assetReportDisplayColumns: ReportColumn[] = [
  { key: "fiscalYear", label: "ปีงบประมาณ" },
  { key: "assetNumber", label: "หมายเลขครุภัณฑ์" },
  { key: "assetName", label: "ชื่อรายการครุภัณฑ์" },
  { key: "organization", label: "ฝ่าย/ชมรมที่รับผิดชอบ" },
  { key: "status", label: "สถานะครุภัณฑ์" },
  { key: "location", label: "สถานที่จัดเก็บ" },
];

const inspectionReportColumns: ReportColumn[] = [
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

function getAssetValue(asset: AssetListRow, key: string) {
  const { priceValue, phoneValue } = getAssetDerivedValues(asset);
  if (key === "assetStructureLabel") return asset.assetStructureType === "set" ? `ครุภัณฑ์แบบชุด (${asset.assetSetItems.length} รายการย่อย)` : "ครุภัณฑ์เดี่ยว";
  if (key === "price") return priceValue ? `${priceValue} บาท` : "-";
  if (key === "responsiblePhone") return phoneValue || "-";
  if (key === "purchaseProject") return getPurchaseProjectValue(asset);
  if (key === "numberPlacement") return getNumberPlacementValue(asset);
  return String(asset[key as keyof AssetListRow] ?? "-");
}

function getReportRowValue(row: Record<string, string | number>, key: string) {
  return String(row[key] ?? "-");
}

function assetToReportRow(asset: AssetListRow): Record<string, string | number> {
  return Object.fromEntries(
    assetReportExportColumns.map((column) => [column.key, getAssetValue(asset, column.key)]),
  );
}

function annualInspectionToReportRow(inspection: AnnualInspection, asset: AssetListRow): Record<string, string | number> {
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

function formatExportDate() {
  return new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildReportHtml(title: string, columns: ReportColumn[], rows: Array<Record<string, string | number>>, subtitle: string) {
  const headerCells = columns.map((column) => `<th>${column.label}</th>`).join("");
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      ${columns.map((column) => `<td>${getReportRowValue(row, column.key)}</td>`).join("")}
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: "Noto Sans Thai", Tahoma, sans-serif; color: #0F172A; margin: 24px; }
          h1 { font-size: 22px; margin: 0 0 6px; }
          p { margin: 0 0 14px; color: #64748B; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #DBEAFE; color: #0F172A; text-align: left; }
          th, td { border: 1px solid #E2E8F0; padding: 8px; vertical-align: top; }
          tr:nth-child(even) td { background: #F5F7FA; }
          .meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
          @media print { body { margin: 12mm; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">
          <p>${subtitle}</p>
          <p>วันที่ Export: ${formatExportDate()}</p>
        </div>
        <p>จำนวนข้อมูลทั้งหมด: ${rows.length.toLocaleString("th-TH")} รายการ</p>
        <table>
          <thead>
            <tr><th>ลำดับ</th>${headerCells}</tr>
          </thead>
          <tbody>${bodyRows || `<tr><td colspan="${columns.length + 1}">ไม่พบข้อมูล</td></tr>`}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadReportFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function getDashboardExportFileName() {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = padDatePart(now.getMonth() + 1);
  const day = padDatePart(now.getDate());
  return `dashboard-ครุภัณฑ์-${thaiYear}${month}${day}.pdf`;
}

function getDocumentStyleText() {
  return Array.from(document.styleSheets).map((sheet) => {
    try {
      return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
    } catch {
      return "";
    }
  }).join("\n");
}

function loadImageFromSource(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function renderElementToCanvas(element: HTMLElement) {
  await document.fonts?.ready;
  const rect = element.getBoundingClientRect();
  const scale = 2;
  const width = Math.ceil(rect.width || element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.background = "#F5F7FA";
  clone.style.color = "#0F172A";

  const exportedAt = formatThaiDateTime(new Date().toISOString());
  const currentInspectionYear = String(getCurrentInspectionYear());
  const headerHtml = `
    <section style="margin-bottom:16px;padding:18px 20px;border:1px solid #E2E8F0;border-radius:12px;background:#FFFFFF;color:#0F172A;">
      <h1 style="margin:0;font-size:26px;font-weight:800;">รายงานภาพรวมครุภัณฑ์</h1>
      <p style="margin:8px 0 0;color:#64748B;font-size:14px;">วันที่ส่งออก: ${exportedAt} · ปีตรวจสอบปัจจุบัน: ${currentInspectionYear}</p>
    </section>
  `;
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px;min-height:${height}px;padding:16px;background:#F5F7FA;color:#0F172A;font-family:'Noto Sans Thai','Tahoma',sans-serif;">
      <style>${getDocumentStyleText()}</style>
      ${headerHtml}
      ${clone.outerHTML}
    </div>
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 120}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
  const image = await loadImageFromSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = (height + 120) * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ไม่สามารถเตรียม Canvas สำหรับ Export ได้");
  context.scale(scale, scale);
  context.fillStyle = "#F5F7FA";
  context.fillRect(0, 0, width, height + 120);
  context.drawImage(image, 0, 0);
  return canvas;
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function asciiToBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
}

function concatPdfParts(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function buildPdfFromCanvas(canvas: HTMLCanvasElement) {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 30;
  const imageWidthPt = pageWidth - margin * 2;
  const maxImageHeightPt = pageHeight - margin * 2;
  const sliceHeightPx = Math.floor((maxImageHeightPt * canvas.width) / imageWidthPt);
  const pages: Array<{ width: number; height: number; bytes: Uint8Array; imageHeightPt: number }> = [];

  for (let sourceY = 0; sourceY < canvas.height; sourceY += sliceHeightPx) {
    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - sourceY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;
    const context = sliceCanvas.getContext("2d");
    if (!context) throw new Error("ไม่สามารถเตรียมหน้า PDF ได้");
    context.fillStyle = "#F5F7FA";
    context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    context.drawImage(canvas, 0, sourceY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);
    pages.push({
      width: sliceCanvas.width,
      height: sliceCanvas.height,
      bytes: dataUrlToBytes(sliceCanvas.toDataURL("image/jpeg", 0.92)),
      imageHeightPt: (currentSliceHeight * imageWidthPt) / canvas.width,
    });
  }

  const objectParts: Uint8Array[][] = [];
  const addObject = (contentParts: Uint8Array[]) => objectParts.push(contentParts);
  const catalogId = 1;
  const pagesId = 2;
  const pageIds: number[] = [];

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    pageIds.push(pageId);
    addObject([asciiToBytes(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)]);
    addObject([
      asciiToBytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      asciiToBytes("\nendstream"),
    ]);
    const y = pageHeight - margin - page.imageHeightPt;
    const content = `q\n${imageWidthPt} 0 0 ${page.imageHeightPt} ${margin} ${y} cm\n/Im${index + 1} Do\nQ`;
    addObject([asciiToBytes(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)]);
  });

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objectParts.splice(0, 0, [asciiToBytes(`<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`)]);
  objectParts.splice(0, 0, [asciiToBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)]);

  const parts: Uint8Array[] = [asciiToBytes("%PDF-1.4\n")];
  const offsets: number[] = [0];
  let offset = parts[0].length;
  objectParts.forEach((contentParts, index) => {
    offsets.push(offset);
    const header = asciiToBytes(`${index + 1} 0 obj\n`);
    const footer = asciiToBytes("\nendobj\n");
    parts.push(header, ...contentParts, footer);
    offset += header.length + contentParts.reduce((sum, part) => sum + part.length, 0) + footer.length;
  });
  const xrefOffset = offset;
  const xrefRows = offsets.map((item, index) => index === 0 ? "0000000000 65535 f " : `${String(item).padStart(10, "0")} 00000 n `).join("\n");
  parts.push(asciiToBytes(`xref\n0 ${offsets.length}\n${xrefRows}\ntrailer\n<< /Size ${offsets.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([concatPdfParts(parts)], { type: "application/pdf" });
}

async function exportDashboardToPDF() {
  const element = document.getElementById("dashboard-export-area");
  if (!element) throw new Error("ไม่พบพื้นที่ Dashboard สำหรับส่งออก");
  const canvas = await renderElementToCanvas(element);
  const pdfBlob = buildPdfFromCanvas(canvas);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDashboardExportFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportAssetReport(format: ReportFormat, title: string, columns: ReportColumn[], rows: Array<Record<string, string | number>>, subtitle: string) {
  const safeName = title.replace(/\s+/g, "-");
  const html = buildReportHtml(title, columns, rows, subtitle);

  if (format === "pdf") {
    const reportWindow = window.open("", "_blank", "width=1200,height=800");
    if (!reportWindow) return;
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 400);
    return;
  }

  if (format === "word") {
    downloadReportFile(`${safeName}.doc`, "application/msword;charset=utf-8", html);
    return;
  }

  downloadReportFile(`${safeName}.xls`, "application/vnd.ms-excel;charset=utf-8", html);
}

const assetListRows: AssetListRow[] = realAssets2561To2567.map((asset) => {
  const organization = normalizeOrganizationName(asset.organization_name ?? "") || "ไม่ระบุองค์กร";

  return {
    id: asset.id,
    fiscalYear: String(asset.fiscal_year ?? ""),
    budgetSource: "",
    recordDate: normalizeDateValue(asset.purchase_month) || "-",
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
    purchaseMonth: normalizeDateValue(asset.purchase_month) || "-",
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

function buildInitialAnnualInspections(assets: AssetListRow[]): AnnualInspection[] {
  void assets;
  return [];
}

function Icon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIconButton({ onClick, label = "กลับไปหน้ารายการ" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-panelSoft text-slate-100 transition hover:border-gold hover:bg-white/10 hover:text-gold"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M11 6 5 12l6 6M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function CloseIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ปิด"
      title="ปิด"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/15 bg-panelSoft text-2xl font-light leading-none text-slate-200 transition hover:border-gold hover:bg-white/10 hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold/60"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

function StatusBadge({ value, variant = "outline" }: { value: string; variant?: "outline" | "soft" }) {
  const colors = assetStatusColors[value] ?? { bg: "bg-slate-500/18", text: "text-slate-100", border: "ring-slate-300/30" };
  const style = `${colors.bg} ${colors.text} ${variant === "outline" ? colors.border : ""}`;

  return <span className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${variant === "outline" ? "ring-1" : ""} ${style}`}>{value}</span>;
}

function InspectionResultBadge({ inspected }: { inspected: boolean }) {
  return (
    <span className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${inspected ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#FEF2F2] text-[#B91C1C]"}`}>
      {inspected ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจ"}
    </span>
  );
}

function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-3 py-1 text-xs font-semibold text-[#1E40AF]">
      <span className="min-w-0 truncate">{label}: {value}</span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#1E40AF] hover:bg-white/70"
        aria-label={`ล้างตัวกรอง ${label}`}
      >
        x
      </button>
    </span>
  );
}

function AssetStructureBadge({ asset }: { asset: AssetListRow }) {
  const isSet = asset.assetStructureType === "set";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 ring-1 ${isSet ? "bg-sky-400/12 text-sky-200 ring-sky-300/25" : "bg-white/10 text-slate-200 ring-white/10"}`}>
      {isSet ? `แบบชุด · ${asset.assetSetItems.length} รายการย่อย` : "ครุภัณฑ์เดี่ยว"}
    </span>
  );
}

function getAssetStructureFilterLabel(asset: AssetListRow) {
  const rawValue = `${asset.assetStructureType ?? ""} ${asset.assetType ?? ""}`.toLowerCase();
  if (
    asset.assetStructureType === "set" ||
    rawValue.includes("ครุภัณฑ์แบบชุด") ||
    rawValue.includes("แบบชุด") ||
    rawValue.includes("ชุด")
  ) {
    return "ครุภัณฑ์แบบชุด";
  }
  return "ครุภัณฑ์เดี่ยว";
}

function SearchableOrganizationSelect({
  selected,
  onSelect,
  options = organizations,
  label = "ฝ่าย/ชมรมที่รับผิดชอบ",
}: {
  selected: Organization | null;
  onSelect: (organization: Organization) => void;
  options?: Organization[];
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOrganizations = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return options;
    return options.filter((item) =>
      `${item.name} ${item.type}`.toLowerCase().includes(cleanQuery),
    );
  }, [options, query]);

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-200" htmlFor="organization-search">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-white ring-1 ring-transparent transition hover:border-gold/60 focus:outline-none focus:ring-gold"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{selected?.name ?? "เลือกฝ่าย/ชมรม"}</span>
        </span>
        <span className="text-gold">⌄</span>
      </button>
      <input type="hidden" name="organization_name" value={selected?.name ?? ""} />

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-panel shadow-2xl">
          <div className="border-b border-white/10 p-3">
            <input
              id="organization-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อฝ่ายหรือชมรม"
              className="w-full rounded-md border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOrganizations.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery("");
                  setIsOpen(false);
                }}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-gold hover:text-slate-950"
              >
                <span className="truncate font-semibold">{item.name}</span>
              </button>
            ))}
            {filteredOrganizations.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-slate-400">ไม่พบหน่วยงานในรายการ</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const isDateInput = props.type === "date";
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputClass = props.type === "date"
    ? "date-input [color-scheme:light] pr-12 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
    : "";
  const openDatePicker = () => {
    const input = inputRef.current;
    if (!input || props.disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <div className={isDateInput ? "relative mt-2" : ""}>
        <input
          {...props}
          ref={inputRef}
          className={`${isDateInput ? "" : "mt-2"} min-h-12 w-full rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold disabled:cursor-not-allowed disabled:text-slate-400 ${dateInputClass} ${className}`}
        />
        {isDateInput && (
          <button
            type="button"
            onClick={openDatePicker}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-200 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:text-slate-500"
            disabled={props.disabled}
            aria-label={`เปิดปฏิทิน${label}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
            </svg>
          </button>
        )}
      </div>
    </label>
  );
}

function ThaiDateField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    const input = inputRef.current;
    if (!input || disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-gold/60 focus:border-gold focus:ring-2 focus:ring-gold/30 disabled:cursor-not-allowed disabled:text-slate-400"
          aria-label={`${label} ${value ? formatThaiDate(value) : "ยังไม่ได้เลือก"}`}
        >
          <span>{value ? formatThaiDate(value) : "วัน/เดือน/ปี พ.ศ."}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2v4M16 2v4M3 10h18" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          tabIndex={-1}
          className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
          aria-hidden="true"
        />
      </div>
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-red-300">{message}</p>;
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

function PhoneField({
  value,
  onChange,
  error,
  onInvalidInput,
  onBlur,
  label = "หมายเลขโทรศัพท์",
}: {
  value: string;
  onChange: (value: string) => void;
  error: string;
  onInvalidInput: () => void;
  onBlur: () => void;
  label?: string;
}) {
  return (
    <div>
      <Field
        label={label}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const digitsOnly = nextValue.replace(/[^0-9]/g, "");
          if (nextValue !== digitsOnly) onInvalidInput();
          onChange(digitsOnly.slice(0, 10));
        }}
        onBlur={onBlur}
        placeholder="เช่น 0812345678"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "responsible-phone-error" : undefined}
        className={error ? "border-red-400 focus:border-red-400" : ""}
      />
      {error && (
        <p id="responsible-phone-error" className="mt-2 text-xs font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function FiscalYearField({
  value,
  onChange,
  error,
  onInvalidInput,
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string;
  onInvalidInput: () => void;
  onBlur: () => void;
}) {
  return (
    <div>
      <Field
        label="ปีงบประมาณที่จัดซื้อ"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const digitsOnly = nextValue.replace(/[^0-9]/g, "");
          if (nextValue !== digitsOnly) onInvalidInput();
          onChange(digitsOnly.slice(0, 4));
        }}
        onBlur={onBlur}
        placeholder="เช่น 2569"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "fiscal-year-error" : undefined}
        className={error ? "border-red-400 focus:border-red-400" : ""}
      />
      {error && (
        <p id="fiscal-year-error" className="mt-2 text-xs font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

function TextAreaField({
  label,
  compact = false,
  autoResize = false,
  className = "",
  onInput,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; compact?: boolean; autoResize?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
  };

  useEffect(() => {
    if (autoResize && textareaRef.current) resizeTextarea(textareaRef.current);
  }, [autoResize, props.value]);

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <textarea
        {...props}
        ref={textareaRef}
        rows={compact || autoResize ? 1 : props.rows}
        onInput={(event) => {
          if (autoResize) resizeTextarea(event.currentTarget);
          onInput?.(event);
        }}
        className={`mt-2 w-full rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold ${autoResize ? "min-h-12 resize-none overflow-hidden" : compact ? "h-12 min-h-12 resize-none overflow-hidden" : "min-h-28 resize-y"} ${className}`}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  getOptionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  getOptionLabel?: (value: string) => string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-12 w-full min-w-0 truncate rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none focus:border-gold"
      >
        {placeholder && (
          <option value="" disabled className="bg-panel text-slate-400">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option} className="bg-panel text-white">
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RecordFormSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-panelSoft/80 p-4 shadow-glow md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-slate-950">
          {number}
        </span>
        <div>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function AssetSetItemsEditor({
  items,
  onChange,
}: {
  items: AssetSetItem[];
  onChange: (items: AssetSetItem[]) => void;
}) {
  const updateItem = (id: number, patch: Partial<AssetSetItem>) => {
    onChange(items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toLocaleString("th-TH") } : item));
  };
  const addItem = () => {
    const now = new Date().toLocaleString("th-TH");
    onChange([
      ...items,
      {
        id: Date.now(),
        assetId: 0,
        itemName: "",
        quantity: "1",
        unit: "ตัว",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };
  const removeItem = (id: number) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="rounded-xl border border-sky-300/20 bg-sky-400/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-white">รายการย่อยในชุดครุภัณฑ์</h4>
          <p className="mt-1 text-xs leading-5 text-slate-400">ใช้สำหรับครุภัณฑ์ที่มีหมายเลขเดียว แต่ภายในประกอบด้วยหลายรายการ</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-md bg-gold px-3 py-2 text-xs font-extrabold text-slate-950 hover:bg-amberSoft">
          เพิ่มรายการย่อย
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-gold">รายการย่อยที่ {index + 1}</p>
              <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-red-300/30 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/10">
                ลบรายการย่อย
              </button>
            </div>
            <div className="grid gap-3">
              <Field label="ชื่อรายการย่อย" value={item.itemName} onChange={(event) => updateItem(item.id, { itemName: event.target.value })} placeholder="เช่น โต๊ะประชุม" />
              <TextAreaField label="รายละเอียด/หมายเหตุ" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="เช่น โต๊ะไม้สีดำ เก้าอี้เบาะสีดำ" />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/20 p-5 text-center text-sm text-slate-400">
            ยังไม่มีรายการย่อย กด “เพิ่มรายการย่อย” เพื่อเริ่มกรอกข้อมูลในชุด
          </div>
        )}
      </div>
    </div>
  );
}

function RecordPage({
  assets,
  onCreateAsset,
  organizationOptions,
  equipmentTypeOptions,
  locationOptions,
}: {
  assets: AssetListRow[];
  onCreateAsset: (asset: AssetListRow) => void;
  organizationOptions: Organization[];
  equipmentTypeOptions: string[];
  locationOptions: string[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const currentFiscalYear = new Date().getFullYear() + 543;
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(organizationOptions[0] ?? null);
  const [assetStructureType, setAssetStructureType] = useState<"single" | "set">("single");
  const [assetSetItems, setAssetSetItems] = useState<AssetSetItem[]>([]);
  const [purchaseProject, setPurchaseProject] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [assetNumberLocation, setAssetNumberLocation] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [price, setPrice] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(currentFiscalYear));
  const [fiscalYearError, setFiscalYearError] = useState("");
  const [budgetSource, setBudgetSource] = useState("");
  const [recordDate, setRecordDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [assetType, setAssetType] = useState(equipmentTypeOptions[0] ?? "");
  const [location, setLocation] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [responsiblePhoneError, setResponsiblePhoneError] = useState("");
  const [status, setStatus] = useState("ใช้งานได้");
  const [imagePreviews, setImagePreviews] = useState<EvidenceImage[]>([]);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewRows, setImportPreviewRows] = useState<AssetImportPreviewRow[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importChecking, setImportChecking] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueAssetName, setIssueAssetName] = useState("");
  const [mainFormErrors, setMainFormErrors] = useState<Record<string, string>>({});
  const [issueFormErrors, setIssueFormErrors] = useState<Record<string, string>>({});

  const importReadyRows = importPreviewRows.filter((row) => row.errors.length === 0);
  const importErrorRows = importPreviewRows.filter((row) => row.errors.length > 0);

  const formattedPrice = useMemo(() => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return "0.00";
    return parsedPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [price]);

  const validateMainForm = () => {
    const errors: Record<string, string> = {};
    if (!assetName.trim()) errors.assetName = "กรุณากรอกชื่อรายการครุภัณฑ์";
    if (!assetStructureType) errors.assetStructureType = "กรุณาเลือกลักษณะครุภัณฑ์";
    if (!assetType) errors.assetType = "กรุณาเลือกประเภทครุภัณฑ์";
    if (!/^[0-9]{4}$/.test(fiscalYear)) errors.fiscalYear = "กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก";
    if (!budgetSource) errors.budgetSource = "กรุณาเลือกแหล่งงบประมาณที่ใช้";
    if (!purchaseProject.trim()) errors.purchaseProject = "กรุณากรอกโครงการที่จัดซื้อ";
    if (!isValidDateInput(receivedDate)) errors.receivedDate = "กรุณาเลือกวันที่ได้รับครุภัณฑ์";
    if (!status) errors.status = "กรุณาเลือกสถานะการใช้งาน";
    if (!selectedOrganization) errors.organization = "กรุณาเลือกองค์กรนักศึกษา/หน่วยงานที่รับผิดชอบ";
    if (!location) errors.location = "กรุณาเลือกสถานที่จัดเก็บ";
    if (!responsiblePerson.trim()) errors.responsiblePerson = "กรุณากรอกผู้รับผิดชอบ";
    if (!/^[0-9]{9,10}$/.test(responsiblePhone)) errors.responsiblePhone = "กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก";

    setMainFormErrors(errors);
    setFiscalYearError(errors.fiscalYear ?? "");
    setResponsiblePhoneError(errors.responsiblePhone ?? "");
    if (Object.keys(errors).length > 0) {
      setToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนบันทึกและออกเลขครุภัณฑ์");
      window.setTimeout(() => setToast(""), 3500);
      return false;
    }
    if (assetStructureType === "set") {
      const invalidSetItems = assetSetItems.length === 0 || assetSetItems.some((item) => !item.itemName.trim());
      if (invalidSetItems) {
        setToast("กรุณาเพิ่มรายการย่อยอย่างน้อย 1 รายการ และกรอกชื่อรายการย่อยให้ครบ");
        window.setTimeout(() => setToast(""), 3500);
        return false;
      }
    }
    return true;
  };

  const openIssueAssetModal = () => {
    if (!validateMainForm()) return;
    setIssueAssetName(assetName.trim());
    setAssetNumber(getNextAssetNumber(assets, fiscalYear));
    setAssetNumberLocation("");
    setIssueFormErrors({});
    setIssueModalOpen(true);
  };

  const handleSubmit = () => {
    const cleanAssetName = issueAssetName.trim();
    const cleanAssetNumber = assetNumber.trim();
    const organization = selectedOrganization;
    const errors: Record<string, string> = {};
    if (!cleanAssetName) errors.assetName = "กรุณากรอกชื่อครุภัณฑ์";
    if (!cleanAssetNumber) errors.assetNumber = "ไม่สามารถออกหมายเลขครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง";
    if (!assetNumberLocation.trim()) errors.assetNumberLocation = "กรุณาระบุตำแหน่งที่ประทับหมายเลขครุภัณฑ์";
    if (imagePreviews.length === 0) errors.images = "กรุณาอัปโหลดรูปถ่ายครุภัณฑ์อย่างน้อย 1 รูป";
    setIssueFormErrors(errors);
    if (!organization || Object.keys(errors).length > 0) {
      return;
    }
    if (assets.some((asset) => asset.assetNumber.trim() === cleanAssetNumber)) {
      setAssetNumber(getNextAssetNumber(assets, fiscalYear));
      setToast("พบหมายเลขครุภัณฑ์ซ้ำ ระบบสร้างหมายเลขใหม่ให้แล้ว กรุณาตรวจสอบอีกครั้ง");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }

    const createdAt = new Date().toLocaleString("th-TH");
    const generatedId = Date.now();
    const newAsset: AssetListRow = {
      id: generatedId,
      fiscalYear,
      budgetSource,
      recordDate: formatThaiDate(recordDate),
      assetCode: `CMU-ASSET-${fiscalYear}-${String(generatedId).slice(-4)}`,
      assetNumber: cleanAssetNumber,
      assetName: cleanAssetName,
      assetDescription: assetDescription.trim() || cleanAssetName,
      organization: organization.name,
      organizationType: organization.type,
      assetType,
      location: location.trim() || "ยังไม่ได้ระบุ",
      building: "-",
      room: "-",
      responsiblePerson: responsiblePerson.trim() || "ยังไม่ได้ระบุ",
      purchaseProject: purchaseProject.trim() || "-",
      purchaseMonth: formatThaiDate(receivedDate),
      numberPlacement: assetNumberLocation.trim() || "-",
      quantity: "1",
      unit: "-",
      price: formattedPrice,
      responsiblePhone: responsiblePhone || "-",
      status,
      latestInspectionDate: "",
      inspectionResult: "",
      isInspected: false,
      imageCount: imagePreviews.length,
      assetImages: imagePreviews,
      note: note.trim() || "-",
      assetStructureType,
      assetSetItems: assetStructureType === "set"
        ? assetSetItems.map((item, index) => ({
            ...item,
            id: generatedId + index + 1,
            assetId: generatedId,
            itemName: item.itemName.trim(),
            quantity: "1",
            unit: "-",
            description: item.description.trim() || "-",
            updatedAt: createdAt,
          }))
        : [],
      updatedAt: createdAt,
      deletedAt: null,
    };

    onCreateAsset(newAsset);
    setIssueModalOpen(false);
    handleReset(false);
    setToast("บันทึกข้อมูลและออกเลขครุภัณฑ์เรียบร้อยแล้ว");
    window.setTimeout(() => setToast(""), 3500);
  };

  const handleReset = (showToast = true) => {
    setSelectedOrganization(organizationOptions[0] ?? null);
    setAssetStructureType("single");
    setAssetSetItems([]);
    setPurchaseProject("");
    setAssetNumber("");
    setAssetNumberLocation("");
    setAssetName("");
    setAssetDescription("");
    setPrice("");
    setFiscalYear(String(currentFiscalYear));
    setFiscalYearError("");
    setBudgetSource("");
    setRecordDate(today);
    setReceivedDate(today);
    setAssetType(equipmentTypeOptions[0] ?? "");
    setLocation("");
    setResponsiblePerson("");
    setResponsiblePhone("");
    setResponsiblePhoneError("");
    setStatus("ใช้งานได้");
    setImagePreviews([]);
    setNote("");
    setIssueAssetName("");
    setIssueModalOpen(false);
    setMainFormErrors({});
    setIssueFormErrors({});
    if (showToast) {
      setToast("ล้างข้อมูลในฟอร์มแล้ว");
      window.setTimeout(() => setToast(""), 2500);
    }
  };

  const handleStructureTypeChange = (value: string) => {
    const nextType = value === "ครุภัณฑ์แบบชุด" ? "set" : "single";
    setAssetStructureType(nextType);
    if (nextType === "set") {
      if (assetSetItems.length === 0) {
        const now = new Date().toLocaleString("th-TH");
        setAssetSetItems([{ id: Date.now(), assetId: 0, itemName: "", quantity: "1", unit: "-", description: "", createdAt: now, updatedAt: now }]);
      }
    } else {
      setAssetSetItems([]);
    }
  };

  const handleImageChange = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    const nextImages = await Promise.all(selectedFiles.map((file) => new Promise<EvidenceImage>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, url: String(reader.result ?? ""), size: file.size });
      reader.onerror = () => reject(new Error("ไม่สามารถอ่านรูปถ่ายครุภัณฑ์ได้"));
      reader.readAsDataURL(file);
    })));
    setImagePreviews(nextImages);
    if (nextImages.length > 0) setIssueFormErrors((errors) => ({ ...errors, images: "" }));
  };

  const resetImportModal = () => {
    setImportFileName("");
    setImportPreviewRows([]);
    setImportMessage("");
    setImportChecking(false);
  };

  const handleImportFileChange = async (file: File | null) => {
    resetImportModal();
    if (!file) return;
    setImportFileName(file.name);
    setImportChecking(true);
    try {
      const rows = await readAssetRowsFromFile(file);
      const missingHeaders = ["ปีงบประมาณ", "หมายเลขครุภัณฑ์", "ชื่อรายการครุภัณฑ์", "ฝ่าย/ชมรมที่รับผิดชอบ", "สถานะครุภัณฑ์"].filter((header) => !Object.keys(rows[0] ?? {}).includes(header));
      if (missingHeaders.length > 0) {
        setImportMessage(`ไฟล์ยังขาดหัวคอลัมน์สำคัญ: ${missingHeaders.join(", ")}`);
        setImportPreviewRows([]);
        return;
      }
      const previewRows = validateAssetImportRows(rows, assets);
      setImportPreviewRows(previewRows);
      setImportMessage(`ตรวจสอบแล้ว ${previewRows.length.toLocaleString("th-TH")} รายการ พร้อมนำเข้า ${previewRows.filter((row) => row.errors.length === 0).length.toLocaleString("th-TH")} รายการ`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ Excel ได้");
      setImportPreviewRows([]);
    } finally {
      setImportChecking(false);
    }
  };

  const handleImportAssets = () => {
    if (importReadyRows.length === 0) {
      setImportMessage("ยังไม่มีรายการที่พร้อมนำเข้า กรุณาตรวจสอบไฟล์อีกครั้ง");
      return;
    }
    if (importErrorRows.length > 0) {
      setImportMessage("กรุณาแก้ไขรายการที่มีปัญหาก่อนนำเข้าข้อมูล");
      return;
    }
    importReadyRows.forEach((row, index) => onCreateAsset(createAssetFromImportRow(row.data, index)));
    setToast(`นำเข้าข้อมูลสำเร็จ ${importReadyRows.length.toLocaleString("th-TH")} รายการ`);
    window.setTimeout(() => setToast(""), 3500);
    resetImportModal();
    setImportOpen(false);
  };

  return (
    <section className="relative mx-auto w-full max-w-screen-2xl space-y-5">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-gold/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-gold shadow-glow">
          {toast}
        </div>
      )}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-panel shadow-glow">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-xl font-bold text-white">นำเข้าข้อมูลครุภัณฑ์จาก Excel</h3>
                <p className="mt-1 text-sm text-slate-400">ใช้ไฟล์ตาม template ตรวจสอบ Preview แล้วค่อยยืนยันนำเข้าจริง</p>
              </div>
              <CloseIconButton onClick={() => {
                resetImportModal();
                setImportOpen(false);
              }} />
            </div>
            <div className="max-h-[calc(90vh-88px)] space-y-4 overflow-y-auto p-5">
              <div className="grid gap-2 text-xs font-semibold text-slate-400 sm:grid-cols-5">
                {["1. ดาวน์โหลดตัวอย่าง", "2. กรอกข้อมูล", "3. อัปโหลดไฟล์", "4. ตรวจสอบ Preview", "5. นำเข้าข้อมูล"].map((step) => (
                  <div key={step} className="rounded-md border border-white/10 bg-panelSoft px-3 py-2 text-center">
                    {step}
                  </div>
                ))}
              </div>

              <label className="block rounded-lg border border-dashed border-gold/40 bg-slate-950/30 p-4 hover:border-[#2563EB]">
                <span className="text-sm font-semibold text-slate-200">อัปโหลดไฟล์ Excel (.xlsx, .xls)</span>
                <p className="mt-1 text-xs leading-5 text-slate-400">หากกรอกผ่าน Google Sheets ให้ไปที่ ไฟล์ &gt; ดาวน์โหลด &gt; Microsoft Excel (.xlsx) แล้วนำไฟล์มาอัปโหลดที่นี่</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => handleImportFileChange(event.target.files?.[0] ?? null)}
                  className="mt-3 w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:font-bold file:text-slate-950"
                />
              </label>

              {(importChecking || importMessage || importFileName) && (
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-sm font-semibold text-white">{importFileName || "ยังไม่ได้เลือกไฟล์"}</p>
                  <p className="mt-1 text-sm text-slate-400">{importChecking ? "กำลังตรวจสอบข้อมูล..." : importMessage}</p>
                </div>
              )}

              {importPreviewRows.length > 0 && (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-sky-400/25 bg-sky-500/10 p-4">
                      <p className="text-xs font-semibold text-sky-100">รายการทั้งหมด</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-white">{importPreviewRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                    <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4">
                      <p className="text-xs font-semibold text-emerald-100">พร้อมนำเข้า</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-white">{importReadyRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                    <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-4">
                      <p className="text-xs font-semibold text-red-100">มีปัญหา</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-white">{importErrorRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                  </div>

                  {importErrorRows.length > 0 && (
                    <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-4">
                      <p className="text-sm font-bold text-red-100">รายการที่ต้องแก้ไข</p>
                      <div className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-red-100/90">
                        {importErrorRows.slice(0, 8).map((row) => (
                          <p key={row.rowNumber}>แถวที่ {row.rowNumber}: {row.errors.join(", ")}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="overflow-hidden rounded-lg border border-white/10">
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-panelSoft text-slate-300">
                          <tr>
                            {["แถว", "หมายเลขครุภัณฑ์", "ชื่อรายการ", "ฝ่าย/ชมรม", "สถานะ", "ผลตรวจสอบ"].map((heading) => (
                              <th key={heading} className="border-b border-white/10 px-3 py-2 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
                          {importPreviewRows.slice(0, 20).map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                              <td className="px-3 py-2 font-semibold text-gold" title={row.data["หมายเลขครุภัณฑ์"] || "-"}>{row.data["หมายเลขครุภัณฑ์"] || "-"}</td>
                              <td className="px-3 py-2 text-white" title={row.data["ชื่อรายการครุภัณฑ์"] || "-"}>{row.data["ชื่อรายการครุภัณฑ์"] || "-"}</td>
                              <td className="px-3 py-2" title={row.data["ฝ่าย/ชมรมที่รับผิดชอบ"] || "-"}>{row.data["ฝ่าย/ชมรมที่รับผิดชอบ"] || "-"}</td>
                              <td className="px-3 py-2">{row.data["สถานะครุภัณฑ์"] || "-"}</td>
                              <td className={row.errors.length > 0 ? "px-3 py-2 text-red-200" : "px-3 py-2 text-emerald-200"}>
                                {row.errors.length > 0 ? row.errors.join(", ") : "พร้อมนำเข้า"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetImportModal();
                    setImportOpen(false);
                  }}
                  className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => importFileName && setImportMessage(importPreviewRows.length > 0 ? "ตรวจสอบข้อมูลแล้ว" : "กรุณาเลือกไฟล์ Excel ก่อน")}
                  className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold"
                >
                  ตรวจสอบข้อมูล
                </button>
                <button
                  type="button"
                  onClick={handleImportAssets}
                  disabled={importReadyRows.length === 0 || importErrorRows.length > 0}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  นำเข้าข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <RecordFormSection number={1} title="ข้อมูลทั่วไปของครุภัณฑ์" description="ระบุข้อมูลหลัก งบประมาณ โครงการ และวันที่ได้รับครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Field label="ชื่อรายการครุภัณฑ์" value={assetName} onChange={(event) => { setAssetName(event.target.value); setMainFormErrors((errors) => ({ ...errors, assetName: "" })); }} placeholder="เช่น กล้องถ่ายภาพ โต๊ะพับ ลำโพง" />
              <FieldError message={mainFormErrors.assetName} />
            </div>
            <div>
              <SelectField
                label="ลักษณะครุภัณฑ์"
                value={assetStructureType === "set" ? "ครุภัณฑ์แบบชุด" : "ครุภัณฑ์เดี่ยว"}
                onChange={(value) => { handleStructureTypeChange(value); setMainFormErrors((errors) => ({ ...errors, assetStructureType: "" })); }}
                options={["ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"]}
              />
              <FieldError message={mainFormErrors.assetStructureType} />
            </div>
            <div>
              <SelectField label="ประเภทครุภัณฑ์" value={assetType} onChange={(value) => { setAssetType(value); setMainFormErrors((errors) => ({ ...errors, assetType: "" })); }} options={equipmentTypeOptions} />
              <FieldError message={mainFormErrors.assetType} />
            </div>
            <TextAreaField
              label="ข้อมูลจำเพาะ / คุณลักษณะของครุภัณฑ์"
              value={assetDescription}
              onChange={(event) => setAssetDescription(event.target.value)}
              placeholder="ระบุรุ่น สี ขนาด ยี่ห้อ หรือข้อมูลจำเพาะ"
              autoResize
            />
            <FiscalYearField
              value={fiscalYear}
              onChange={(value) => {
                setFiscalYear(value);
                setMainFormErrors((errors) => ({ ...errors, fiscalYear: "" }));
                if (/^[0-9]{4}$/.test(value)) setFiscalYearError("");
              }}
              error={fiscalYearError}
              onInvalidInput={() => setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก")}
              onBlur={() => {
                if (!/^[0-9]{4}$/.test(fiscalYear)) {
                  setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
                }
              }}
            />
            <div>
              <SelectField label="แหล่งงบประมาณที่ใช้" value={budgetSource} onChange={(value) => { setBudgetSource(value); setMainFormErrors((errors) => ({ ...errors, budgetSource: "" })); }} options={budgetSourceOptions} placeholder="เลือกแหล่งงบประมาณ" />
              <FieldError message={mainFormErrors.budgetSource} />
            </div>
            <div>
              <TextAreaField
                label="จัดซื้อในโครงการ"
                value={purchaseProject}
                onChange={(event) => { setPurchaseProject(event.target.value); setMainFormErrors((errors) => ({ ...errors, purchaseProject: "" })); }}
                placeholder="เช่น โครงการจัดซื้อครุภัณฑ์และอุปกรณ์"
                autoResize
              />
              <FieldError message={mainFormErrors.purchaseProject} />
            </div>
            <div>
              <ThaiDateField label="วันที่ได้รับครุภัณฑ์" value={receivedDate} onChange={(value) => { setReceivedDate(value); setMainFormErrors((errors) => ({ ...errors, receivedDate: "" })); }} />
              <FieldError message={mainFormErrors.receivedDate} />
            </div>
            {assetStructureType === "set" && (
              <div className="lg:col-span-2">
                <AssetSetItemsEditor items={assetSetItems} onChange={setAssetSetItems} />
              </div>
            )}
          </div>
        </RecordFormSection>

        <RecordFormSection number={2} title="ข้อมูลสถานะ" description="ระบุสถานะการใช้งานและหมายเหตุของครุภัณฑ์ โดยแนบรูปถ่ายในขั้นตอนยืนยันการออกเลข">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <SelectField
                label="สถานะการใช้งาน"
                value={status}
                onChange={(value) => { setStatus(value); setMainFormErrors((errors) => ({ ...errors, status: "" })); }}
                options={["ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว", "รอตรวจสอบ"]}
              />
              <FieldError message={mainFormErrors.status} />
            </div>
            <TextAreaField value={note} onChange={(event) => setNote(event.target.value)} label="หมายเหตุ" placeholder="ระบุหมายเหตุเพิ่มเติม" autoResize />
          </div>
        </RecordFormSection>

        <RecordFormSection number={3} title="หน่วยงานที่ครอบครองและเก็บรักษา" description="ระบุหน่วยงาน สถานที่จัดเก็บ และผู้รับผิดชอบครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <SearchableOrganizationSelect
                selected={selectedOrganization}
                onSelect={(organization) => { setSelectedOrganization(organization); setMainFormErrors((errors) => ({ ...errors, organization: "" })); }}
                options={organizationOptions}
                label="องค์กรนักศึกษา/หน่วยงานที่รับผิดชอบ"
              />
              <FieldError message={mainFormErrors.organization} />
            </div>
            <div>
              <SelectField label="สถานที่จัดเก็บ" value={location} onChange={(value) => { setLocation(value); setMainFormErrors((errors) => ({ ...errors, location: "" })); }} options={locationOptions} placeholder="เลือกสถานที่จัดเก็บ" />
              <FieldError message={mainFormErrors.location} />
            </div>
            <div>
              <Field label="ผู้รับผิดชอบ" value={responsiblePerson} onChange={(event) => { setResponsiblePerson(event.target.value); setMainFormErrors((errors) => ({ ...errors, responsiblePerson: "" })); }} placeholder="ชื่อ-นามสกุล" />
              <FieldError message={mainFormErrors.responsiblePerson} />
            </div>
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => {
                setResponsiblePhone(value);
                setMainFormErrors((errors) => ({ ...errors, responsiblePhone: "" }));
                if (/^[0-9]{9,10}$/.test(value) || !value) setResponsiblePhoneError("");
              }}
              error={responsiblePhoneError}
              onInvalidInput={() => setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น")}
              onBlur={() => {
                if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
                  setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
                }
              }}
            />
          </div>
        </RecordFormSection>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-white/10 bg-navy/90 p-4 backdrop-blur">
        <button type="button" onClick={() => handleReset()} className="rounded-md border border-white/15 bg-panelSoft px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-gold hover:text-gold">
          ล้างข้อมูล
        </button>
        <button type="button" onClick={openIssueAssetModal} className="rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-amberSoft">
          บันทึกและออกเลขครุภัณฑ์
        </button>
      </div>

      {issueModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-xl font-bold text-white">ยืนยันการออกเลขครุภัณฑ์</h3>
                <p className="mt-1 text-sm text-slate-400">ตรวจสอบข้อมูลก่อนบันทึกครุภัณฑ์ 1 รายการ</p>
              </div>
              <CloseIconButton onClick={() => setIssueModalOpen(false)} />
            </div>
            <div className="max-h-[calc(90vh-88px)] space-y-4 overflow-y-auto p-5">
              <div>
                <Field label="ชื่อครุภัณฑ์" value={issueAssetName} onChange={(event) => { setIssueAssetName(event.target.value); setIssueFormErrors((errors) => ({ ...errors, assetName: "" })); }} />
                <FieldError message={issueFormErrors.assetName} />
              </div>
              <div>
                <Field label="หมายเลขครุภัณฑ์" value={assetNumber} readOnly />
                <FieldError message={issueFormErrors.assetNumber} />
              </div>
              <div>
                <Field
                  label="ระบุตำแหน่งที่ประทับหมายเลขครุภัณฑ์"
                  value={assetNumberLocation}
                  onChange={(event) => { setAssetNumberLocation(event.target.value); setIssueFormErrors((errors) => ({ ...errors, assetNumberLocation: "" })); }}
                  placeholder="เช่น ด้านหลังเครื่อง ใต้โต๊ะ ด้านข้างกล่อง หรือบริเวณขาตั้ง"
                />
                <FieldError message={issueFormErrors.assetNumberLocation} />
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-200">รูปถ่ายครุภัณฑ์</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => handleImageChange(event.target.files)}
                  className="mt-2 w-full rounded-lg border border-dashed border-gold/40 bg-slate-950/40 px-4 py-6 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:border-gold"
                />
                <span className="mt-2 block text-xs text-slate-400">แนบรูปภาพประกอบได้หลายรูป {imagePreviews.length > 0 ? `(${imagePreviews.length} รูป)` : ""}</span>
                <FieldError message={issueFormErrors.images} />
              </label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((image) => (
                    <figure key={image.url} className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/40">
                      <div role="img" aria-label={image.name} className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} />
                      <figcaption className="truncate px-2 py-1.5 text-xs text-slate-300" title={image.name}>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="flex justify-end border-t border-white/10 pt-4">
                <button type="button" onClick={handleSubmit} className="rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="flex min-h-[360px] flex-col overflow-visible rounded-lg border border-white/10 bg-panel p-4">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="mt-4 min-h-0 flex-1 overflow-visible">{children}</div>
    </article>
  );
}

function PageHeader({
  title,
  description,
  actions,
  leading,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-extrabold text-white md:text-3xl">{title}</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-400">{description}</p>
        </div>
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </div>
  );
}

function DashboardTable({
  title,
  columns,
  rows,
  onViewAll,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  onViewAll?: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-panel">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="min-h-10 shrink-0 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            ดูรายการทั้งหมด
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
          <thead className="bg-panelSoft text-slate-300">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-white/10 px-3 py-2.5 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
            {rows.map((row) => (
              <tr key={row.join("-")} className="hover:bg-white/[0.03]">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${cell}`} title={cell} className={`px-3 py-3 ${index === 0 ? "font-semibold text-gold" : ""}`}>
                    {index === row.length - 1 && (cell === "ใช้งานได้" || cell === "รอตรวจสอบ" || cell === "ชำรุด" || cell === "รอซ่อม") ? (
                      <StatusBadge value={cell} />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function DashboardPage({
  assets,
  annualInspections,
  onViewAllAssets,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  onViewAllAssets: () => void;
}) {
  const [chartsReady, setChartsReady] = useState(false);
  const currentInspectionYear = String(getCurrentInspectionYear());
  const currentYearInspections = annualInspections.filter((inspection) => inspection.inspectionYear === currentInspectionYear);
  const currentYearInspectedAssetIds = new Set(currentYearInspections.map((inspection) => inspection.assetId));
  const latestAssets = [...assets].sort((a, b) => {
    const dateDiff = getDateSortTime(b.recordDate) - getDateSortTime(a.recordDate);
    return dateDiff || b.id - a.id;
  });
  const assetsByFiscalYear = Object.entries(countBy(assets, (asset) => asset.fiscalYear))
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-6)
    .map(([name, value]) => ({ name, value }));
  const assetsForOrganizationChart = assets.filter((asset) => asset.status !== "จำหน่ายแล้ว");
  const assetsByOrganization = Object.entries(countBy(assetsForOrganizationChart, (asset) => asset.organization))
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB, "th"))
    .map(([name, value]) => ({ name, value }));
  const assetsByStatus = Object.entries(countBy(assets, (asset) => asset.status))
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value, color: statusColors[name] ?? "#cbd5e1" }));
  const assetStatusTotal = assetsByStatus.reduce((total, item) => total + item.value, 0);
  const assetStatusDescription = assetsByStatus.length === 1
    ? `ครุภัณฑ์ทั้งหมดอยู่ในสถานะ${assetsByStatus[0].name}`
    : "แสดงสัดส่วนสถานะครุภัณฑ์ทั้งหมด";
  const inspectionResults = [
    { name: "ตรวจสอบแล้ว", value: assets.filter((asset) => currentYearInspectedAssetIds.has(asset.id)).length },
    { name: "ยังไม่ได้ตรวจสอบ", value: assets.filter((asset) => !currentYearInspectedAssetIds.has(asset.id)).length },
  ];
  const countByStatus = (statusName: string) => assets.filter((asset) => asset.status === statusName).length;
  const inspectedCount = assets.filter((asset) => currentYearInspectedAssetIds.has(asset.id)).length;
  const uninspectedCount = assets.length - inspectedCount;
  const assetStatusSummary = [
    {
      label: "จำนวนครุภัณฑ์ทั้งหมด",
      value: assets.length,
      note: "ข้อมูลครุภัณฑ์ทั้งหมดในระบบ",
      ...dashboardCardColors.total,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ยังไม่ได้ตรวจสอบประจำปี",
      value: uninspectedCount,
      note: `ยังไม่มีผลตรวจสอบปี ${currentInspectionYear}`,
      ...dashboardCardColors.pending,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ตรวจสอบแล้ว",
      value: inspectedCount,
      note: "มีข้อมูลผลตรวจสอบล่าสุด",
      ...dashboardCardColors.inspected,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ใช้งานได้",
      value: countByStatus("ใช้งานได้"),
      note: "สถานะพร้อมใช้งาน",
      ...dashboardCardColors.active,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ชำรุด",
      value: countByStatus("ชำรุด"),
      note: "รายการที่มีสถานะชำรุด",
      ...dashboardCardColors.broken,
    },
    {
      label: "จำนวนครุภัณฑ์ที่รอซ่อม",
      value: countByStatus("รอซ่อม"),
      note: "อยู่ระหว่างรอดำเนินการซ่อม",
      ...dashboardCardColors.repair,
    },
    {
      label: "จำนวนครุภัณฑ์ที่สูญหาย",
      value: countByStatus("สูญหาย"),
      note: "รายการที่ระบุว่าสูญหาย",
      ...dashboardCardColors.missing,
    },
    {
      label: "จำนวนครุภัณฑ์ที่จำหน่ายแล้ว",
      value: countByStatus("จำหน่ายแล้ว"),
      note: "รายการที่ดำเนินการจำหน่ายแล้ว",
      ...dashboardCardColors.disposed,
    },
  ];
  const latestRows = latestAssets.slice(0, 5).map((row) => [
    row.assetNumber,
    row.assetName,
    row.organization,
    formatThaiDate(row.recordDate),
    row.status,
  ]);

  const tooltipStyle = {
    backgroundColor: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    color: "var(--color-text-primary)",
  };

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const chartFallback = (
    <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-slate-950/30 text-sm text-slate-400">
      กำลังเตรียมกราฟ
    </div>
  );
  const organizationChartEmptyState = (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/20 px-4 text-center">
      <p className="text-sm font-bold text-white">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      <p className="mt-2 max-w-sm text-xs text-slate-400">ยังไม่มีข้อมูลครุภัณฑ์ที่สามารถนำมาสรุปตามฝ่าย/ชมรมได้</p>
    </div>
  );
  const fiscalYearChartEmptyState = (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/20 px-4 text-center">
      <p className="text-sm font-bold text-white">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      <p className="mt-2 max-w-sm text-xs text-slate-400">ยังไม่มีข้อมูลครุภัณฑ์ที่สามารถสรุปตามปีงบประมาณได้</p>
    </div>
  );

  return (
    <section id="dashboard-export-area" className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {assetStatusSummary.map((item) => {
          return (
            <article key={item.label} className={`flex min-h-[138px] flex-col rounded-lg border ${item.border} bg-panel bg-gradient-to-br ${item.glow} to-transparent p-4 shadow-glow`}>
              <p className="text-xs font-semibold text-slate-200">{item.label}</p>
              <strong className={`mt-2 block text-4xl font-extrabold leading-none ${item.accent}`}>{item.value.toLocaleString("th-TH")}</strong>
              <p className="mt-2 text-xs text-slate-300">{item.note}</p>
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="จำนวนครุภัณฑ์แยกตามปีงบประมาณล่าสุด 6 ปี">
          {chartsReady ? (
            assetsByFiscalYear.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetsByFiscalYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "#DBEAFE" }}
                        formatter={(value) => [`${Number(value).toLocaleString("th-TH")} รายการ`, "จำนวนครุภัณฑ์"]}
                        labelFormatter={(label) => `ปีงบประมาณ: ${label}`}
                      />
                      <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill={chartColors.fiscalYearBar} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">แสดงเฉพาะปีงบประมาณที่มีข้อมูลล่าสุด</p>
              </div>
            ) : fiscalYearChartEmptyState
          ) : chartFallback}
        </ChartCard>

        <ChartCard title="จำนวนครุภัณฑ์แยกตามองค์กร/ฝ่าย/ชมรม">
          {chartsReady ? (
            assetsByOrganization.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetsByOrganization} layout="vertical" margin={{ top: 20, right: 30, left: 55, bottom: 20 }}>
                  <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    stroke={chartColors.axis}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.axis, fontSize: 12 }}
                    tickFormatter={(value: string) => value.length > 24 ? `${value.slice(0, 24)}...` : value}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "#DBEAFE" }}
                    formatter={(value) => [`${Number(value).toLocaleString("th-TH")} รายการ`, "จำนวนครุภัณฑ์"]}
                    labelFormatter={(label) => `องค์กร/ฝ่าย/ชมรม: ${label}`}
                  />
                  <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill={chartColors.organizationBar} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : organizationChartEmptyState
          ) : chartFallback}
        </ChartCard>

        <ChartCard title="สถานะครุภัณฑ์">
          {chartsReady ? (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetsByStatus} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                      {assetsByStatus.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [`${Number(value).toLocaleString("th-TH")} รายการ`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
                  <strong className="text-3xl font-extrabold leading-none text-slate-900">{assetStatusTotal.toLocaleString("th-TH")}</strong>
                  <span className="mt-1 text-xs font-semibold text-slate-500">รายการ</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-slate-300">
                {assetsByStatus.map((item) => (
                  <span key={item.name} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">{assetStatusDescription}</p>
            </div>
          ) : chartFallback}
        </ChartCard>

        <ChartCard title={`ผลการตรวจสอบครุภัณฑ์ประจำปี ${currentInspectionYear}`}>
          {chartsReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspectionResults} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} />
                <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#DBEAFE" }} />
                <Bar dataKey="value" name="จำนวนรายการ" radius={[6, 6, 0, 0]}>
                  {inspectionResults.map((item) => (
                    <Cell key={item.name} fill={item.name === "ตรวจสอบแล้ว" ? chartColors.inspectionCompleted : chartColors.inspectionPending} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartFallback}
        </ChartCard>
      </div>

      <div className="grid gap-4">
        <DashboardTable
          title="รายการครุภัณฑ์ล่าสุดที่เพิ่มเข้าสู่ระบบ"
          columns={["หมายเลขครุภัณฑ์", "ชื่อรายการ", "ฝ่าย/ชมรม", "วันที่บันทึกเข้าระบบ", "สถานะ"]}
          rows={latestRows}
          onViewAll={onViewAllAssets}
        />
      </div>
    </section>
  );
}

function ListPage({
  assets,
  annualInspections,
  permissions,
  onAddAsset,
  onViewDetails,
  onEditAsset,
  onDeleteAsset,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  permissions: Permissions;
  onAddAsset: () => void;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
}) {
  const inspectedAssetIds = useMemo(
    () => new Set(annualInspections.map((inspection) => inspection.assetId)),
    [annualInspections],
  );
  const fiscalYearOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.fiscalYear)).sort((a, b) => Number(b) - Number(a))];
  const organizationOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.organization))];
  const assetTypeOptions = ["ทั้งหมด", "ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"];
  const statusOptions = ["ทั้งหมด", ...uniqueSorted(assets.map((item) => item.status))];

  const [search, setSearch] = useState("");
  const [fiscalYear, setFiscalYear] = useState("ทั้งหมด");
  const [organization, setOrganization] = useState("ทั้งหมด");
  const [assetType, setAssetType] = useState("ทั้งหมด");
  const [status, setStatus] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredRows = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return assets.filter((row) => {
      const searchText = `${row.assetName} ${row.assetNumber} ${row.organization}`.toLowerCase();
      const matchSearch = !cleanSearch || searchText.includes(cleanSearch);
      const matchFiscalYear = fiscalYear === "ทั้งหมด" || row.fiscalYear === fiscalYear;
      const matchOrganization = organization === "ทั้งหมด" || row.organization === organization;
      const matchAssetType = assetType === "ทั้งหมด" || getAssetStructureFilterLabel(row) === assetType;
      const matchStatus = status === "ทั้งหมด" || row.status === status;
      return matchSearch && matchFiscalYear && matchOrganization && matchAssetType && matchStatus;
    });
  }, [assetType, assets, fiscalYear, organization, search, status]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasActiveFilters = Boolean(search.trim()) || fiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || assetType !== "ทั้งหมด" || status !== "ทั้งหมด";
  const clearAllFilters = () => {
    setSearch("");
    setFiscalYear("ทั้งหมด");
    setOrganization("ทั้งหมด");
    setAssetType("ทั้งหมด");
    setStatus("ทั้งหมด");
    setPage(1);
  };

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-4">
      <PageHeader
        title="แสดงรายการครุภัณฑ์ทั้งหมด"
        description="ค้นหาและกรองข้อมูลจากหมายเลขครุภัณฑ์ ชื่อรายการ หรือฝ่าย/ชมรม"
        actions={(
          <>
            {permissions.canExport && (
              <>
                <button onClick={() => exportAssetReport("pdf", "รายงานครุภัณฑ์ทั้งหมด", assetReportExportColumns, filteredRows.map(assetToReportRow), "ข้อมูลตามเงื่อนไขตัวกรองปัจจุบัน")} className="min-h-11 rounded-md border border-white/15 bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gold hover:text-gold">ส่งออก PDF</button>
                <button onClick={() => exportAssetReport("word", "รายงานครุภัณฑ์ทั้งหมด", assetReportExportColumns, filteredRows.map(assetToReportRow), "ข้อมูลตามเงื่อนไขตัวกรองปัจจุบัน")} className="min-h-11 rounded-md border border-white/15 bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gold hover:text-gold">ส่งออก Word</button>
                <button onClick={() => exportAssetReport("excel", "รายงานครุภัณฑ์ทั้งหมด", assetReportExportColumns, filteredRows.map(assetToReportRow), "ข้อมูลตามเงื่อนไขตัวกรองปัจจุบัน")} className="min-h-11 rounded-md border border-white/15 bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-gold hover:text-gold">ส่งออก Excel</button>
              </>
            )}
            {permissions.canCreate && <button onClick={onAddAsset} className="min-h-11 rounded-md bg-gold px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amberSoft">บันทึกใหม่</button>}
          </>
        )}
      />
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <label className="block md:col-span-2 xl:col-span-1">
            <span className="text-sm font-semibold text-slate-200">ค้นหา</span>
            <div className="relative mt-1.5">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาชื่อครุภัณฑ์ หมายเลขครุภัณฑ์ หรือฝ่าย/ชมรม"
                className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/40 py-2 pl-9 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ล้างคำค้นหา"
                >
                  x
                </button>
              )}
            </div>
          </label>
          <SelectField label="ปีงบประมาณ" value={fiscalYear} onChange={(value) => { setFiscalYear(value); setPage(1); }} options={fiscalYearOptions} />
          <SelectField label="ฝ่าย/ชมรม" value={organization} onChange={(value) => { setOrganization(value); setPage(1); }} options={organizationOptions} />
          <SelectField label="ลักษณะครุภัณฑ์" value={assetType} onChange={(value) => { setAssetType(value); setPage(1); }} options={assetTypeOptions} />
          <SelectField label="สถานะครุภัณฑ์" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusOptions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-sm font-semibold text-slate-400">
            พบข้อมูล {filteredRows.length.toLocaleString("th-TH")} รายการจากทั้งหมด {assets.length.toLocaleString("th-TH")} รายการ
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-md border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {search.trim() && <FilterChip label="คำค้นหา" value={search.trim()} onClear={() => { setSearch(""); setPage(1); }} />}
            {fiscalYear !== "ทั้งหมด" && <FilterChip label="ปีงบประมาณ" value={fiscalYear} onClear={() => { setFiscalYear("ทั้งหมด"); setPage(1); }} />}
            {organization !== "ทั้งหมด" && <FilterChip label="ฝ่าย/ชมรม" value={organization} onClear={() => { setOrganization("ทั้งหมด"); setPage(1); }} />}
            {assetType !== "ทั้งหมด" && <FilterChip label="ลักษณะ" value={assetType} onClear={() => { setAssetType("ทั้งหมด"); setPage(1); }} />}
            {status !== "ทั้งหมด" && <FilterChip label="สถานะ" value={status} onClear={() => { setStatus("ทั้งหมด"); setPage(1); }} />}
          </div>
        )}
      </div>

      <div className="space-y-3 md:hidden">
        {visibleRows.map((row, index) => (
          <article key={row.assetCode} className="rounded-lg border border-white/10 bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">ลำดับ {(safePage - 1) * pageSize + index + 1} · ปีงบประมาณ {row.fiscalYear}</p>
                <p className="mt-1 break-words text-sm font-bold text-gold">{row.assetNumber}</p>
                <h3 className="mt-1 break-words text-base font-extrabold text-white">{row.assetName}</h3>
              </div>
              <StatusBadge value={row.status} variant="soft" />
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs font-semibold text-slate-400">ลักษณะครุภัณฑ์</dt><dd className="mt-1"><AssetStructureBadge asset={row} /></dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">องค์กร/ฝ่าย/ชมรม</dt><dd className="mt-1 break-words text-slate-200">{row.organization}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">ผลการตรวจสอบประจำปี</dt><dd className="mt-1"><InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} /></dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => onViewDetails(row)} className="min-h-11 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-slate-200">รายละเอียด</button>
              {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEditAsset(row)} className="min-h-11 rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white">แก้ไข</button>}
              {permissions.canDelete && <button onClick={() => onDeleteAsset(row)} className="min-h-11 rounded-md border border-red-300/30 px-3 py-2 text-sm font-semibold text-red-200">ลบ</button>}
            </div>
          </article>
        ))}
        {visibleRows.length === 0 && <div className="rounded-lg border border-white/10 bg-panel px-4 py-10 text-center"><p className="font-bold text-white">ไม่พบข้อมูลครุภัณฑ์</p><p className="mt-2 text-sm text-slate-400">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p></div>}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-panel p-3 text-sm">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage === 1} className="min-h-11 rounded-md border border-white/15 px-3 py-2 font-semibold text-slate-200 disabled:opacity-40">ก่อนหน้า</button>
          <span className="text-center font-bold text-white">หน้า {safePage} / {pageCount}</span>
          <button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={safePage === pageCount} className="min-h-11 rounded-md border border-white/15 px-3 py-2 font-semibold text-slate-200 disabled:opacity-40">ถัดไป</button>
        </div>
      </div>

      <div className="hidden w-full overflow-hidden rounded-lg border border-white/10 bg-panel md:block">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed border-collapse text-left text-xs xl:min-w-0">
            <colgroup>
              <col className="w-[50px]" />
              <col className="w-[90px]" />
              <col className="w-[160px]" />
              <col className="w-[260px]" />
              <col className="w-[150px]" />
              <col className="w-[250px]" />
              <col className="w-[110px]" />
              <col className="w-[140px]" />
              <col className="w-[80px]" />
              <col className="w-[170px]" />
            </colgroup>
            <thead className="bg-panelSoft text-slate-300">
              <tr>
                {["ลำดับ", "ปีงบประมาณ", "หมายเลขครุภัณฑ์", "ชื่อรายการครุภัณฑ์", "ลักษณะ", "ฝ่าย/ชมรมที่รับผิดชอบ", "สถานะ", "ผลการตรวจสอบประจำปี", "รูปภาพ", "จัดการ"].map((heading) => (
                  <th key={heading} className={`border-b border-white/10 px-2 py-2 font-semibold ${heading === "สถานะ" || heading === "ผลการตรวจสอบประจำปี" || heading === "จัดการ" ? "whitespace-nowrap" : ""}`}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
              {visibleRows.map((row, index) => (
                <tr key={row.assetCode} className="align-top hover:bg-white/[0.03]">
                  <td className="px-2 py-2 text-slate-400">{(safePage - 1) * pageSize + index + 1}</td>
                  <td className="px-2 py-2">{row.fiscalYear}</td>
                  <td className="px-2 py-2 font-semibold leading-5 text-gold" title={row.assetNumber}><div className="line-clamp-2 max-w-[150px] break-words">{row.assetNumber}</div></td>
                  <td className="px-2 py-2 font-semibold leading-5 text-white" title={row.assetName}><div className="line-clamp-2 max-w-[220px] break-words">{row.assetName}</div></td>
                  <td className="px-2 py-2"><AssetStructureBadge asset={row} /></td>
                  <td className="px-2 py-2">
                    <span className="line-clamp-2 max-w-[220px] break-words leading-5" title={row.organization}>{row.organization}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2"><StatusBadge value={row.status} variant="soft" /></td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <InspectionResultBadge inspected={inspectedAssetIds.has(row.id)} />
                  </td>
                  <td className="px-2 py-2">
                    <button className="inline-flex h-7 w-9 items-center justify-center rounded-md border border-white/10 bg-slate-900 text-[11px] font-bold text-gold hover:border-gold">
                      {row.imageCount}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <div className="flex min-w-[160px] max-w-[170px] flex-row items-center gap-1.5">
                      <button onClick={() => onViewDetails(row)} className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:border-gold hover:text-gold">รายละเอียด</button>
                      {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEditAsset(row)} className="rounded-md bg-orange px-2 py-1 text-[11px] font-semibold text-white hover:bg-orange/90">แก้ไข</button>}
                      {permissions.canDelete && <button onClick={() => onDeleteAsset(row)} className="rounded-md border border-red-300/30 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/10">ลบ</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-white">ไม่พบข้อมูลครุภัณฑ์</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองที่เลือกอยู่</p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearAllFilters}
                          className="mt-4 rounded-md bg-gold px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amberSoft"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-300">
          <span>
            แสดง {visibleRows.length > 0 ? (safePage - 1) * pageSize + 1 : 0}-
            {Math.min(safePage * pageSize, filteredRows.length)} จากทั้งหมด {filteredRows.length.toLocaleString("th-TH")} รายการ
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-white/15 px-3 py-2 font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <span className="rounded-md bg-panelSoft px-3 py-2 font-bold text-white">
              หน้า {safePage} / {pageCount}
            </span>
            <button
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              disabled={safePage === pageCount}
              className="rounded-md border border-white/15 px-3 py-2 font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-white/10 py-2 last:border-b-0">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-white/10 bg-panel p-4 shadow-sm">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

type HistoryFieldRow = {
  label: string;
  value: string;
  changed: boolean;
};

function AssetDetailPage({
  asset,
  activityLogs,
  permissions,
  onEdit,
  onDelete,
  onBack,
}: {
  asset: AssetListRow;
  activityLogs: ActivityLog[];
  permissions: Permissions;
  onEdit: (asset: AssetListRow) => void;
  onDelete: (asset: AssetListRow) => void;
  onBack: () => void;
}) {
  const safeText = (value: string | undefined | null) => value && value !== "-" ? value : "-";
  const [historyOpen, setHistoryOpen] = useState(false);
  const { priceValue, phoneValue } = getAssetDerivedValues(asset);
  const assetLogs = activityLogs.filter(
    (log) =>
      log.targetId === asset.id &&
      ["แก้ไข", "ลบ", "กู้คืน"].includes(log.actionType) &&
      !log.detail.includes("ตรวจสอบประจำปี"),
  );
  const hasStoredImages = false;
  const getActionBadgeClass = (actionType: ActivityLog["actionType"]) => {
    if (actionType === "ลบ") return "border-red-300/30 bg-red-500/10 text-red-200";
    if (actionType === "กู้คืน") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-200";
    return "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]";
  };
  const getActionLabel = (actionType: ActivityLog["actionType"]) => {
    if (actionType === "ลบ") return "ลบข้อมูล";
    if (actionType === "กู้คืน") return "กู้คืนข้อมูล";
    return "แก้ไขข้อมูล";
  };
  const parseHistoryValue = (value: string) => {
    const result: Record<string, string> = {};
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const separatorIndex = item.indexOf(":");
        if (separatorIndex === -1) return;
        const key = item.slice(0, separatorIndex).trim();
        const fieldValue = item.slice(separatorIndex + 1).trim();
        if (!key) return;
        result[key] = fieldValue || "-";
      });
    return result;
  };
  const buildHistoryRows = (oldValue: string, newValue: string) => {
    const oldMap = parseHistoryValue(oldValue);
    const newMap = parseHistoryValue(newValue);
    const hiddenLocationFields = new Set(["อาคาร", "ห้อง"]);
    const hiddenAssetFields = new Set(["จำนวน", "หน่วยนับ"]);
    const fieldOrder = ["ชื่อ", "หมายเลขครุภัณฑ์", "จัดซื้อในโครงการ", "ตำแหน่งที่ประทับหมายเลขครุภัณฑ์", "สถานะ", "สถานที่", "ผู้รับผิดชอบ", "เบอร์โทรผู้รับผิดชอบ", "หมายเหตุ", "deleted_at", "deleted_by", "updated_at"];
    const allKeys = Array.from(new Set([...fieldOrder, ...Object.keys(oldMap), ...Object.keys(newMap)]))
      .filter((key) => !hiddenLocationFields.has(key) && !hiddenAssetFields.has(key) && (oldMap[key] !== undefined || newMap[key] !== undefined));
    const changedKeys = new Set(allKeys.filter((key) => (oldMap[key] ?? "") !== (newMap[key] ?? "")));
    const oldRows: HistoryFieldRow[] = allKeys
      .filter((key) => key !== "updated_at")
      .map((key) => ({ label: key, value: oldMap[key] ?? "-", changed: changedKeys.has(key) }));
    const newRows: HistoryFieldRow[] = allKeys
      .map((key) => ({ label: key, value: newMap[key] ?? "-", changed: changedKeys.has(key) }));
    return { oldRows, newRows };
  };
  const renderHistoryRows = (rows: HistoryFieldRow[]) => (
    <div className="mt-2 space-y-2">
      {rows.length > 0 ? rows.map((row) => (
        <div
          key={row.label}
          className={`rounded-md px-2 py-1 text-sm leading-6 ${row.changed ? "border-l-2 border-amber-400 bg-amber-500/10" : ""}`}
        >
          <span className={row.changed ? "font-bold text-amber-300" : "font-semibold text-slate-400"}>{row.label} : </span>
          <span className={row.changed ? "font-bold text-amber-100" : "text-slate-100"}>{row.value || "-"}</span>
        </div>
      )) : <p className="text-sm text-slate-400">-</p>}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-4">
      <PageHeader
        title="รายละเอียดครุภัณฑ์"
        description="อ่านข้อมูลสำคัญของครุภัณฑ์และประวัติการเปลี่ยนแปลง"
        leading={<BackIconButton onClick={onBack} label="กลับไปหน้ารายการ" />}
        actions={(
          <>
          {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEdit(asset)} className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange/90">แก้ไขข้อมูล</button>}
          {permissions.canDelete && <button onClick={() => onDelete(asset)} className="rounded-md border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10">ลบ</button>}
          <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">
            ประวัติ
          </button>
          </>
        )}
      />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-panel px-4 py-3">
        <h3 className="mr-auto break-words text-lg font-extrabold text-white">{asset.assetName}</h3>
        <span className="text-sm text-slate-400">{asset.assetNumber}</span>
        <span className="text-slate-400">·</span>
        <span className="text-sm text-slate-400">{asset.organization}</span>
        <StatusBadge value={asset.status} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.45fr]">
        <DetailSection title="สถานะและหลักฐาน">
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <p className="text-xs font-semibold text-slate-400">สถานะครุภัณฑ์</p>
              <div className="mt-2"><StatusBadge value={asset.status} /></div>
            </div>
            <div>
              <p className="text-sm font-bold text-white">รูปภาพครุภัณฑ์</p>
              {asset.assetImages?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {asset.assetImages.map((image) => (
                    <figure key={image.url} className="overflow-hidden rounded-md border border-white/10 bg-panelSoft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                      <figcaption className="truncate px-2 py-1.5 text-xs text-slate-400" title={image.name}>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : hasStoredImages ? (
                <p className="mt-3 rounded-md border border-white/10 bg-panelSoft px-3 py-4 text-center text-sm text-slate-400">มีข้อมูลรูปภาพเดิม {asset.imageCount.toLocaleString("th-TH")} รูป</p>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-white/15 bg-slate-950/25 px-3 py-8 text-center text-sm text-slate-400">ยังไม่มีรูปภาพครุภัณฑ์</p>
              )}
            </div>
            <DetailInfoItem label="หมายเหตุ" value={safeText(asset.note)} />
          </div>
        </DetailSection>

        <div className="space-y-5">
          <DetailSection title="ข้อมูลทั่วไป">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailInfoItem label="ชื่อรายการครุภัณฑ์" value={safeText(asset.assetName)} />
              <DetailInfoItem label="หมายเลขครุภัณฑ์" value={safeText(asset.assetNumber)} />
              <DetailInfoItem label="รหัสอ้างอิงภายในระบบ" value={safeText(asset.assetCode)} />
              <DetailInfoItem label="ประเภทครุภัณฑ์" value={safeText(asset.assetType)} />
              <DetailInfoItem label="ข้อมูลจำเพาะ / คุณลักษณะของครุภัณฑ์" value={safeText(asset.assetDescription)} />
              <DetailInfoItem label="จัดซื้อในโครงการ" value={getPurchaseProjectValue(asset)} />
              <DetailInfoItem label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์" value={getNumberPlacementValue(asset)} />
              <DetailInfoItem label="ปีงบประมาณ" value={safeText(asset.fiscalYear)} />
              <DetailInfoItem label="แหล่งงบประมาณ" value={safeText(asset.budgetSource)} />
              <DetailInfoItem label="วันที่บันทึกข้อมูล" value={safeText(asset.recordDate)} />
              <DetailInfoItem label="วันที่ได้รับครุภัณฑ์" value={safeText(asset.purchaseMonth)} />
              <div className="min-w-0 border-b border-white/10 py-2">
                <p className="text-xs font-semibold text-slate-400">ลักษณะครุภัณฑ์</p>
                <div className="mt-2"><AssetStructureBadge asset={asset} /></div>
              </div>
            </div>
            {asset.assetStructureType === "set" && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-panelSoft text-slate-300">
                    <tr>
                      {["ลำดับ", "ชื่อรายการย่อย", "รายละเอียด/หมายเหตุ"].map((heading) => (
                        <th key={heading} className="border-b border-white/10 px-3 py-2.5 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
                    {asset.assetSetItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-white">{item.itemName}</td>
                        <td className="px-3 py-3 text-slate-300">{item.description || "-"}</td>
                      </tr>
                    ))}
                    {asset.assetSetItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-slate-400">ยังไม่มีรายการย่อยในชุดครุภัณฑ์</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title="ข้อมูลมูลค่า">
            <div className="grid gap-3">
              <DetailInfoItem label="มูลค่าทรัพย์สิน" value={priceValue ? `${priceValue} บาท` : "-"} />
            </div>
          </DetailSection>

          <DetailSection title="สถานที่จัดเก็บ">
            <div className="grid gap-3">
              <DetailInfoItem label="สถานที่จัดเก็บ" value={safeText(asset.location)} />
            </div>
          </DetailSection>

          <DetailSection title="ฝ่าย/ชมรมที่รับผิดชอบ">
            <DetailInfoItem label="ฝ่าย/ชมรมที่รับผิดชอบ" value={safeText(asset.organization)} />
          </DetailSection>

          <DetailSection title="ผู้รับผิดชอบ">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailInfoItem label="ชื่อผู้รับผิดชอบ" value={safeText(asset.responsiblePerson)} />
              <DetailInfoItem label="เบอร์โทรผู้รับผิดชอบ" value={phoneValue && phoneValue !== "-" ? phoneValue : "-"} />
            </div>
          </DetailSection>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-panel shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-xl font-extrabold text-white">ประวัติการแก้ไขและลบข้อมูล</h3>
                <p className="mt-2 text-sm font-bold text-white">{asset.assetName}</p>
                <p className="mt-1 text-sm text-gold">{asset.assetNumber}</p>
              </div>
              <CloseIconButton onClick={() => setHistoryOpen(false)} />
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              {assetLogs.length > 0 ? (
                <div className="space-y-3">
                  {assetLogs.map((log) => {
                    const { oldRows, newRows } = buildHistoryRows(log.oldValue, log.newValue);
                    return (
                      <article key={log.id} className="rounded-lg border border-white/10 bg-slate-950/25 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-400">{formatThaiDateTime(log.createdAt)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getActionBadgeClass(log.actionType)}`}>
                                {getActionLabel(log.actionType)}
                              </span>
                              <span className="text-sm text-slate-300">โดย <b className="text-white">{log.userName}</b></span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-100">{log.detail}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
                            <p className="text-xs font-bold text-slate-400">ข้อมูลเดิม</p>
                            {renderHistoryRows(oldRows)}
                          </div>
                          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
                            <p className="text-xs font-bold text-slate-400">ข้อมูลใหม่</p>
                            {renderHistoryRows(newRows)}
                          </div>
                        </div>
                        {log.note && (
                          <p className="mt-3 rounded-md border border-white/10 bg-panelSoft px-3 py-2 text-sm text-slate-300">
                            <span className="font-bold text-slate-100">หมายเหตุ: </span>{log.note}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 bg-slate-950/25 p-6 text-center text-sm text-slate-400">
                  ยังไม่มีประวัติการแก้ไขหรือลบข้อมูลสำหรับครุภัณฑ์รายการนี้
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

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
  const statusOptions = ["ทั้งหมด", "ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว", "รอตรวจสอบ"];
  const inspectionStateOptions = ["ทั้งหมด", "ตรวจสอบแล้ว", "ยังไม่ได้ตรวจสอบ"];
  const modalStatusOptions = ["ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว"];

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
  const [inspectionNote, setInspectionNote] = useState("");
  const [toast, setToast] = useState("");

  const rows = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();
    return assets.map((asset) => {
      const inspection = annualInspections.find(
        (item) => item.assetId === asset.id && item.inspectionYear === inspectionYear,
      );
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
  const hasActiveAuditFilters = Boolean(search.trim()) || assetFiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || assetStatus !== "ทั้งหมด" || inspectionResult !== "ทั้งหมด";
  const clearAuditFilters = () => {
    setSearch("");
    setAssetFiscalYear("ทั้งหมด");
    setOrganization("ทั้งหมด");
    setAssetStatus("ทั้งหมด");
    setInspectionResult("ทั้งหมด");
  };
  const auditResultText = (() => {
    const countText = rows.length.toLocaleString("th-TH");
    const hasSearch = Boolean(search.trim());
    const hasFilters = assetFiscalYear !== "ทั้งหมด" || organization !== "ทั้งหมด" || assetStatus !== "ทั้งหมด" || inspectionResult !== "ทั้งหมด";
    if (hasSearch && hasFilters) return `แสดง ${countText} รายการตามคำค้นหาและตัวกรองที่เลือก`;
    if (hasSearch) return `แสดง ${countText} รายการตามคำค้นหา`;
    if (hasFilters) return `แสดง ${countText} รายการตามตัวกรองที่เลือก`;
    return `แสดง ${countText} รายการ`;
  })();

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

  const readEvidenceFile = (file: File) => new Promise<EvidenceImage>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, url: String(reader.result), size: file.size });
    reader.onerror = () => reject(new Error(`ไม่สามารถอ่านไฟล์ ${file.name} ได้`));
    reader.readAsDataURL(file);
  });

  const handleEvidenceImageChange = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxImages = 5;
    const maxSize = 5 * 1024 * 1024;
    const errors: string[] = [];

    if (selectedFiles.length > maxImages) errors.push("อัปโหลดได้สูงสุด 5 รูป");
    const limitedFiles = selectedFiles.slice(0, maxImages);
    const validFiles = limitedFiles.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const isAcceptedImage = acceptedTypes.includes(file.type) || ["jpg", "jpeg", "png", "webp"].includes(extension ?? "");
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
      setEvidenceImages([]);
      if (errors.length === 0) setEvidenceError("กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ");
      return;
    }

    try {
      setEvidenceImages(await Promise.all(validFiles.map(readEvidenceFile)));
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
    onCancelAnnualInspection(cancelTarget.asset, inspectionYear, cancelTarget.inspection);
    setCancelTarget(null);
    setToast(`ยกเลิกผลตรวจสอบปี ${inspectionYear} เรียบร้อยแล้ว`);
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
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-gold/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-gold shadow-glow">
          {toast}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
          <label className="block md:col-span-2 xl:col-span-1">
            <span className="text-sm font-semibold text-slate-200">ค้นหา</span>
            <div className="relative mt-1.5">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m14 14 3.5 3.5M8.5 15a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อครุภัณฑ์ หมายเลขครุภัณฑ์ หรือฝ่าย/ชมรม"
                className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/40 py-2 pl-9 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold"
              />
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="ล้างคำค้นหา"
                >
                  x
                </button>
              )}
            </div>
          </label>
          <SelectField label="ปีงบประมาณ" value={assetFiscalYear} onChange={setAssetFiscalYear} options={assetFiscalYearOptions} />
          <SelectField label="ฝ่าย/ชมรม" value={organization} onChange={setOrganization} options={organizationOptions} />
          <SelectField label="สถานะ" value={assetStatus} onChange={setAssetStatus} options={statusOptions} />
          <SelectField label="ผลการตรวจสอบ" value={inspectionResult} onChange={setInspectionResult} options={inspectionStateOptions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-sm font-semibold text-slate-400">
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
            {organization !== "ทั้งหมด" && <FilterChip label="ฝ่าย/ชมรม" value={organization} onClear={() => setOrganization("ทั้งหมด")} />}
            {assetStatus !== "ทั้งหมด" && <FilterChip label="สถานะ" value={assetStatus} onClear={() => setAssetStatus("ทั้งหมด")} />}
            {inspectionResult !== "ทั้งหมด" && <FilterChip label="ผลตรวจ" value={inspectionResult} onClear={() => setInspectionResult("ทั้งหมด")} />}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {summaryItems.map((item) => (
          <article key={item.label} className={`relative overflow-hidden rounded-lg border bg-panel p-4 ${item.cardClass}`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${item.accentClass}`} aria-hidden="true" />
            <p className="text-xs font-semibold text-white">{item.label}</p>
            <strong className="mt-2 block text-2xl font-extrabold text-white">{item.value.toLocaleString("th-TH")}</strong>
            <p className={`mt-1 text-xs ${item.subtitleClass}`}>{item.subtitle}</p>
          </article>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map(({ asset, inspection }, index) => (
          <article key={asset.assetCode} className="rounded-lg border border-white/10 bg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400">ลำดับ {index + 1}</p>
                <p className="mt-1 break-words text-sm font-bold text-gold">{asset.assetNumber}</p>
                <h3 className="mt-1 break-words text-base font-extrabold text-white">{asset.assetName}</h3>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${inspection ? inspectionStatusColors.inspected.badge : inspectionStatusColors.pending.badge}`}>{inspection ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจ"}</span>
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div><dt className="text-xs font-semibold text-slate-400">องค์กร/ฝ่าย/ชมรม</dt><dd className="mt-1 break-words text-slate-200">{asset.organization}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">สถานที่จัดเก็บ</dt><dd className="mt-1 text-slate-200">{asset.location}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">สถานะครุภัณฑ์</dt><dd className="mt-1"><StatusBadge value={asset.status} /></dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => openInspectionModal(asset)} className="min-h-12 rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950">ตรวจสอบ</button>
              <button type="button" disabled={!inspection} onClick={() => inspection && setCancelTarget({ asset, inspection })} className={`min-h-12 rounded-md border px-4 py-2 text-sm font-semibold ${inspection ? buttonColors.cancelEnabled : `cursor-not-allowed ${buttonColors.cancelDisabled}`}`}>ยกเลิก</button>
            </div>
          </article>
        ))}
        {rows.length === 0 && <div className="rounded-lg border border-white/10 bg-panel px-4 py-10 text-center"><p className="font-bold text-white">ไม่พบข้อมูลครุภัณฑ์</p><p className="mt-2 text-sm text-slate-400">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p></div>}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-panel md:block">
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
            <thead className="bg-panelSoft text-slate-300">
              <tr>
                {["ผล", "ลำดับ", "หมายเลขครุภัณฑ์", "ชื่อครุภัณฑ์", "ฝ่าย/ชมรม", "สถานที่จัดเก็บ", "สถานะ", "ผลตรวจ", "จัดการ"].map((heading) => (
                  <th key={heading} className="border-b border-white/10 px-2 py-2.5 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
              {rows.map(({ asset, inspection }, index) => (
                <tr key={asset.assetCode} className="align-top hover:bg-white/[0.03]">
                  <td className="px-2 py-3 text-center align-middle">
                    <span
                      title={inspection ? "ตรวจสอบแล้ว" : "ยังไม่ได้ตรวจสอบ"}
                      className={`mx-auto block h-3 w-3 rounded-full ring-2 ring-slate-950 ${inspection ? inspectionStatusColors.inspected.dot : inspectionStatusColors.pending.dot}`}
                    />
                  </td>
                  <td className="px-2 py-3 text-slate-400">{index + 1}</td>
                  <td className="px-2 py-3 font-semibold text-gold" title={asset.assetNumber}>
                    <div className="line-clamp-2 break-words">{asset.assetNumber}</div>
                  </td>
                  <td className="px-2 py-3 font-semibold text-white" title={asset.assetName}>
                    <div className="truncate">{asset.assetName}</div>
                  </td>
                  <td className="px-2 py-3 text-slate-300" title={asset.organization}>
                    <div className="truncate">{asset.organization}</div>
                  </td>
                  <td className="px-2 py-3 text-slate-300" title={asset.location}>
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
                      <button onClick={() => openInspectionModal(asset)} className="whitespace-nowrap rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amberSoft">
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
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-white">ไม่พบข้อมูลครุภัณฑ์</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองที่เลือกอยู่</p>
                      {hasActiveAuditFilters && (
                        <button
                          type="button"
                          onClick={clearAuditFilters}
                          className="mt-4 rounded-md bg-gold px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amberSoft"
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

      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4">
          <div className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-panel p-4 shadow-2xl sm:max-h-[90vh] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">บันทึกผลตรวจสอบ</h3>
                <p className="mt-3 text-base font-extrabold text-white">{selectedAsset.assetName}</p>
                <p className="mt-1 text-sm font-semibold text-gold">{selectedAsset.assetNumber}</p>
              </div>
              <CloseIconButton onClick={() => setSelectedAsset(null)} />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block min-w-0">
                <span className="text-sm font-semibold text-slate-200">ปีที่ตรวจสอบ</span>
                <div className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-white">
                  {inspectionYear}
                </div>
              </label>
              <ThaiDateField label="วันที่ตรวจสอบ" value={inspectionDate} onChange={setInspectionDate} />
              <Field label="สถานที่ที่พบครุภัณฑ์" value={foundLocation} onChange={(event) => setFoundLocation(event.target.value)} placeholder="ระบุสถานที่ที่พบครุภัณฑ์" />
              <Field label="ผู้ตรวจสอบ" value={inspectorName} onChange={(event) => setInspectorName(event.target.value)} placeholder="ชื่อผู้ตรวจสอบ" />
              <SelectField label="สถานะครุภัณฑ์" value={modalResult} onChange={setModalResult} options={modalStatusOptions} />
              <label className="block">
                <span className="text-sm font-semibold text-slate-200">
                  อัปโหลดรูปหลักฐาน <span className="text-slate-400">(ถ่ายรูปหรือเลือกได้หลายภาพ)</span>
                </span>
                <p className="mt-1 text-xs text-slate-400">
                  สามารถถ่ายรูปจากมือถือ หรือเลือกรูปจากเครื่อง เพื่อใช้เป็นหลักฐานการตรวจสอบครุภัณฑ์
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(event) => {
                    void handleEvidenceImageChange(event.target.files);
                    event.target.value = "";
                  }}
                  className="mt-2 w-full rounded-lg border border-dashed border-gold/40 bg-slate-950/40 px-4 py-4 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-2 file:font-bold file:text-slate-950"
                />
                {(evidenceError || evidenceImages.length === 0) && (
                  <p className="mt-2 text-xs font-semibold text-rose-200">
                    {evidenceError || "กรุณาอัปโหลดรูปหลักฐานอย่างน้อย 1 รูปก่อนบันทึกผลตรวจสอบ"}
                  </p>
                )}
                {evidenceImages.length > 0 && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/25 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200">
                        เลือกรูปแล้ว {evidenceImages.length.toLocaleString("th-TH")} รูป
                      </p>
                      <p className="text-[11px] text-slate-500">สูงสุด 5 รูป / ไม่เกิน 5MB ต่อรูป</p>
                    </div>
                    <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                      {evidenceImages.map((image) => (
                        <figure key={image.url} className="overflow-hidden rounded-md border border-white/10 bg-slate-950/40">
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image.url} alt={image.name} className="h-24 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeEvidenceImage(image.url)}
                              className="absolute right-1 top-1 rounded-md bg-red-500/90 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-400"
                            >
                              ลบ
                            </button>
                          </div>
                          <figcaption className="space-y-0.5 px-2 py-1">
                            <p className="truncate text-[11px] text-slate-300">{image.name}</p>
                            <p className="text-[10px] text-slate-500">{(image.size / 1024 / 1024).toFixed(2)} MB</p>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </label>
              <div className="md:col-span-2">
                <TextAreaField label="หมายเหตุ" value={inspectionNote} onChange={(event) => setInspectionNote(event.target.value)} placeholder="หมายเหตุการตรวจสอบ" />
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button onClick={() => setSelectedAsset(null)} className="min-h-12 rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ยกเลิก</button>
              <button
                onClick={saveInspection}
                disabled={!canSaveInspection}
                title={canSaveInspection ? "บันทึกผลตรวจสอบ" : "กรุณากรอกข้อมูลให้ครบและอัปโหลดรูปหลักฐานอย่างน้อย 1 รูป"}
                className="min-h-12 rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-gold"
              >
                บันทึกผลตรวจสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg rounded-lg border border-rose-300/20 bg-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-white">ยกเลิกผลตรวจสอบประจำปี</h3>
              <CloseIconButton onClick={() => setCancelTarget(null)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              ต้องการยกเลิกผลตรวจสอบของครุภัณฑ์รายการนี้ในปี {inspectionYear} ใช่หรือไม่?
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/30 p-4 text-sm">
              <p className="text-slate-400">หมายเลขครุภัณฑ์</p>
              <p className="mt-1 font-semibold text-gold">{cancelTarget.asset.assetNumber}</p>
              <p className="mt-3 text-slate-400">ชื่อครุภัณฑ์</p>
              <p className="mt-1 font-semibold text-white">{cancelTarget.asset.assetName}</p>
              <p className="mt-3 text-slate-400">ปีที่ตรวจสอบ</p>
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
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

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
  const statusOptions = ["ทั้งหมด", "ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว", "รอตรวจสอบ"];
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

  const inspectionReportRows = useMemo(() => {
    if (inspectionResult === "ยังไม่ได้ตรวจสอบ") return [];
    return annualInspections
      .filter((inspection) => inspection.inspectionYear === currentInspectionYear)
      .map((inspection) => {
        const asset = assets.find((item) => item.id === inspection.assetId);
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
  }, [annualInspections, assets, currentInspectionYear, fiscalYear, inspectionResult, organization, status]);

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
            <button onClick={() => exportAssetReport("pdf", reportType, exportColumns, exportRows, subtitle)} className="rounded-md border border-white/15 bg-panelSoft px-3 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ส่งออก PDF</button>
            <button onClick={() => exportAssetReport("word", reportType, exportColumns, exportRows, subtitle)} className="rounded-md border border-white/15 bg-panelSoft px-3 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ส่งออก Word</button>
            <button onClick={() => exportAssetReport("excel", reportType, exportColumns, exportRows, subtitle)} className="rounded-md bg-gold px-3 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">ส่งออก Excel</button>
          </>
        ) : <p className="rounded-md border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-400">บัญชีนี้ไม่มีสิทธิ์ส่งออก</p>}
      />
      <div className="rounded-lg border border-white/10 bg-panel p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SelectField label="ประเภทรายงาน" value={reportType} onChange={handleReportTypeChange} options={reportTypes} />
          <SelectField label="ปีงบประมาณ" value={fiscalYear} onChange={setFiscalYear} options={fiscalYearOptions} />
          <SelectField label="ฝ่าย/ชมรม" value={organization} onChange={setOrganization} options={organizationOptions} />
          <SelectField label="สถานะครุภัณฑ์" value={status} onChange={setStatus} options={statusOptions} />
          <SelectField label="ผลตรวจสอบประจำปี" value={inspectionResult} onChange={setInspectionResult} options={inspectionOptions} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <p className="text-sm font-semibold text-slate-400">
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

      <div className="overflow-hidden rounded-lg border border-white/10 bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 className="font-bold text-white">{reportType}</h3>
          <p className="text-sm text-slate-400">จำนวน {displayRows.length.toLocaleString("th-TH")} รายการ</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-[13px]">
            <thead className="bg-panelSoft text-slate-300">
              <tr>
                <th className="border-b border-white/10 px-3 py-2.5">ลำดับ</th>
                {displayColumns.map((column) => (
                  <th key={column.key} className="border-b border-white/10 px-3 py-2.5 font-semibold">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
              {displayRows.map((row, index) => (
                <tr key={`${reportType}-${index}`} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                  {displayColumns.map((column) => (
                    <td key={`${index}-${column.key}`} className="break-words px-3 py-3">{getReportRowValue(row, column.key)}</td>
                  ))}
                </tr>
              ))}
              {displayRows.length === 0 && (
                <tr>
                  <td colSpan={displayColumns.length + 1} className="px-3 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <p className="text-base font-bold text-white">{isInspectionReport ? "ยังไม่มีข้อมูลผลการตรวจสอบประจำปี" : "ไม่พบข้อมูล"}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {isInspectionReport ? "ยังไม่มีผลตรวจสอบของปีนี้ หรือตัวกรองที่เลือกยังไม่ตรงกับข้อมูล" : "ไม่พบครุภัณฑ์ที่ตรงกับเงื่อนไข ลองล้างตัวกรองหรือเปลี่ยนเงื่อนไขใหม่"}
                      </p>
                      {hasActiveReportFilters && (
                        <button
                          type="button"
                          onClick={clearReportFilters}
                          className="mt-4 rounded-md bg-gold px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amberSoft"
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

function AssetEditPage({
  asset,
  permissions,
  onSave,
  onCancel,
  organizationOptions,
  equipmentTypeOptions,
  locationOptions,
}: {
  asset: AssetListRow;
  permissions: Permissions;
  onSave: (asset: AssetListRow, oldAsset: AssetListRow) => void;
  onCancel: () => void;
  organizationOptions: Organization[];
  equipmentTypeOptions: string[];
  locationOptions: string[];
}) {
  const [assetCode] = useState(asset.assetCode);
  const [purchaseProject, setPurchaseProject] = useState(getPurchaseProjectValue(asset) === "-" ? "" : getPurchaseProjectValue(asset));
  const [assetNumber, setAssetNumber] = useState(asset.assetNumber);
  const [numberPlacement, setNumberPlacement] = useState(getNumberPlacementValue(asset) === "-" ? "" : getNumberPlacementValue(asset));
  const [assetStructureType, setAssetStructureType] = useState<"single" | "set">(asset.assetStructureType ?? "single");
  const [assetSetItems, setAssetSetItems] = useState<AssetSetItem[]>(asset.assetSetItems ?? []);
  const [assetName, setAssetName] = useState(asset.assetName);
  const [assetDescription, setAssetDescription] = useState(asset.assetDescription);
  const [assetType, setAssetType] = useState(normalizeAssetType(asset.assetType, `${asset.assetName} ${asset.assetDescription}`));
  const [price, setPrice] = useState(asset.price ?? getAssetDerivedValues(asset).priceValue);
  const [fiscalYear, setFiscalYear] = useState(asset.fiscalYear);
  const [fiscalYearError, setFiscalYearError] = useState("");
  const [budgetSource, setBudgetSource] = useState(asset.budgetSource ?? "");
  const [recordDate, setRecordDate] = useState(toDateInputValue(asset.recordDate));
  const [receivedDate, setReceivedDate] = useState(toDateInputValue(asset.purchaseMonth));
  const [location, setLocation] = useState(asset.location);
  const [status, setStatus] = useState(asset.status);
  const [responsiblePerson, setResponsiblePerson] = useState(asset.responsiblePerson);
  const initialResponsiblePhone = asset.responsiblePhone ?? getAssetDerivedValues(asset).phoneValue;
  const [responsiblePhone, setResponsiblePhone] = useState(/^[0-9]+$/.test(initialResponsiblePhone) ? initialResponsiblePhone.slice(0, 10) : "");
  const [responsiblePhoneError, setResponsiblePhoneError] = useState("");
  const normalizedAssetOrganization = normalizeOrganizationName(asset.organization);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(
    organizationOptions.find((item) => item.name === normalizedAssetOrganization) ?? { name: normalizedAssetOrganization, type: getOrganizationType(normalizedAssetOrganization) },
  );
  const [note, setNote] = useState(asset.note === "-" ? "" : asset.note);
  const formattedPrice = useMemo(() => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return asset.price ?? "";
    return parsedPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [asset.price, price]);

  const handleSave = () => {
    if (!/^[0-9]{4}$/.test(fiscalYear)) {
      setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
      return;
    }
    setFiscalYearError("");
    if (responsiblePhone && !/^[0-9]+$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น");
      return;
    }
    if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
      return;
    }
    setResponsiblePhoneError("");
    if (assetStructureType === "set") {
      const invalidSetItems = assetSetItems.length === 0 || assetSetItems.some((item) => !item.itemName.trim());
      if (invalidSetItems) {
        window.alert("ครุภัณฑ์แบบชุดต้องมีรายการย่อยอย่างน้อย 1 รายการ และต้องกรอกชื่อรายการย่อยให้ครบ");
        return;
      }
    }
    onSave({
      ...asset,
      assetCode,
      assetNumber,
      assetStructureType,
      assetSetItems: assetStructureType === "set"
        ? assetSetItems.map((item) => ({
            ...item,
            assetId: asset.id,
            itemName: item.itemName.trim(),
            quantity: "1",
            unit: "-",
            description: item.description.trim() || "-",
            updatedAt: new Date().toLocaleString("th-TH"),
          }))
        : [],
      assetName,
      assetDescription: assetDescription.trim() || assetName,
      assetType,
      price: formattedPrice,
      purchaseProject: purchaseProject.trim() || "-",
      numberPlacement: numberPlacement.trim() || "-",
      fiscalYear,
      budgetSource,
      recordDate: formatThaiDate(recordDate),
      purchaseMonth: formatThaiDate(receivedDate),
      location,
      status,
      responsiblePerson: responsiblePerson.trim() || "ยังไม่ได้ระบุ",
      responsiblePhone: responsiblePhone.trim() || "-",
      note: note.trim() || "-",
      organization: selectedOrganization?.name ?? asset.organization,
      organizationType: selectedOrganization?.type ?? asset.organizationType,
      updatedAt: new Date().toLocaleString("th-TH"),
    }, asset);
  };

  const handleStructureTypeChange = (value: string) => {
    const nextType = value === "ครุภัณฑ์แบบชุด" ? "set" : "single";
    if (assetStructureType === "set" && nextType === "single" && assetSetItems.length > 0) {
      const confirmed = window.confirm("หากเปลี่ยนเป็นครุภัณฑ์เดี่ยว รายการย่อยในชุดจะถูกลบ ต้องการดำเนินการต่อหรือไม่");
      if (!confirmed) return;
      setAssetSetItems([]);
    }
    if (assetStructureType === "single" && nextType === "set" && assetSetItems.length === 0) {
      const now = new Date().toLocaleString("th-TH");
      setAssetSetItems([{ id: Date.now(), assetId: asset.id, itemName: "", quantity: "1", unit: "-", description: "", createdAt: now, updatedAt: now }]);
    }
    setAssetStructureType(nextType);
  };

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      <PageHeader
        title="แก้ไขข้อมูลครุภัณฑ์"
        description="แก้ไขข้อมูลครุภัณฑ์ตามสิทธิ์ของผู้ใช้งาน"
        leading={<BackIconButton onClick={onCancel} label="ย้อนกลับ" />}
        actions={<button onClick={handleSave} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">บันทึกการแก้ไข</button>}
      />
      <div className="rounded-lg border border-white/10 bg-panel p-5">
        <p className="mb-5 break-words text-sm font-semibold text-slate-400">รายการที่แก้ไข: <span className="text-white">{asset.assetName}</span></p>
        <div className="space-y-5">
        <RecordFormSection number={1} title="ข้อมูลระบุตัวตนครุภัณฑ์" description="ระบุหมายเลข ชื่อ ประเภท และรายละเอียดจำเพาะของครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="ชื่อรายการครุภัณฑ์" value={assetName} onChange={(event) => setAssetName(event.target.value)} disabled={permissions.canEditLimitedFields} />
            <Field label="หมายเลขครุภัณฑ์" value={assetNumber} onChange={(event) => setAssetNumber(event.target.value)} disabled={permissions.canEditLimitedFields} />
            <Field
              label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์"
              value={numberPlacement}
              onChange={(event) => setNumberPlacement(event.target.value)}
              placeholder="เช่น ด้านหลังเครื่อง / ใต้โต๊ะ / ข้างกล่อง / บริเวณขาตั้ง / ไม่มีการประทับหมายเลข"
            />
            <SelectField
              label="ลักษณะครุภัณฑ์"
              value={assetStructureType === "set" ? "ครุภัณฑ์แบบชุด" : "ครุภัณฑ์เดี่ยว"}
              onChange={handleStructureTypeChange}
              options={["ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"]}
            />
            <SelectField label="ประเภทครุภัณฑ์" value={assetType} onChange={setAssetType} options={equipmentTypeOptions} />
            <Field label="มูลค่าทรัพย์สิน" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="เช่น 25000.00" />
            <TextAreaField label="รายละเอียดครุภัณฑ์" value={assetDescription} onChange={(event) => setAssetDescription(event.target.value)} placeholder="รายละเอียด รุ่น สี ขนาด ยี่ห้อ หรือข้อมูลจำเพาะ" autoResize />
            <TextAreaField
              label="จัดซื้อในโครงการ"
              value={purchaseProject}
              onChange={(event) => setPurchaseProject(event.target.value)}
              placeholder="เช่น โครงการจัดซื้อครุภัณฑ์และอุปกรณ์เพื่อการจัดเก็บ ดูแล และรักษาความปลอดภัยของครุภัณฑ์ชมรมนักศึกษา"
              autoResize
            />
            {assetStructureType === "set" && (
              <div className="lg:col-span-2">
                <AssetSetItemsEditor items={assetSetItems} onChange={setAssetSetItems} />
              </div>
            )}
          </div>
        </RecordFormSection>

        <RecordFormSection number={2} title="ข้อมูลปีและวันที่" description="ระบุปีงบประมาณ แหล่งงบประมาณ วันที่บันทึกข้อมูล และวันที่ได้รับครุภัณฑ์จริง">
          <div className="grid gap-4 md:grid-cols-2">
            <FiscalYearField
              value={fiscalYear}
              onChange={(value) => {
                setFiscalYear(value);
                if (/^[0-9]{4}$/.test(value)) setFiscalYearError("");
              }}
              error={fiscalYearError}
              onInvalidInput={() => setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก")}
              onBlur={() => {
                if (!/^[0-9]{4}$/.test(fiscalYear)) {
                  setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
                }
              }}
            />
            <SelectField label="แหล่งงบประมาณ" value={budgetSource} onChange={setBudgetSource} options={budgetSourceOptions} placeholder="เลือกแหล่งงบประมาณ" />
            <ThaiDateField label="วันที่บันทึกข้อมูล" value={recordDate} onChange={setRecordDate} disabled={permissions.canEditLimitedFields} />
            <ThaiDateField label="วันที่ได้รับครุภัณฑ์" value={receivedDate} onChange={setReceivedDate} disabled={permissions.canEditLimitedFields} />
          </div>
        </RecordFormSection>

        <RecordFormSection number={3} title="ข้อมูลองค์กร/ฝ่าย/ชมรมและสถานที่จัดเก็บ" description="เลือกฝ่ายหรือชมรมที่รับผิดชอบ และระบุสถานที่จัดเก็บครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            {permissions.canEditLimitedFields ? <DetailInfoItem label="ฝ่าย/ชมรมที่รับผิดชอบ" value={selectedOrganization?.name ?? ""} /> : <SearchableOrganizationSelect selected={selectedOrganization} onSelect={setSelectedOrganization} options={organizationOptions} />}
            <div>
              <SelectField label="สถานที่จัดเก็บ" value={location} onChange={setLocation} options={locationOptions.includes(location) ? locationOptions : [location, ...locationOptions]} placeholder="เลือกสถานที่จัดเก็บ" />
              <p className="mt-2 text-xs leading-5 text-slate-400">หากเลือก “ห้องชมรม” ระบบจะอ้างอิงจากฝ่าย/ชมรมที่รับผิดชอบ</p>
            </div>
          </div>
        </RecordFormSection>

        <RecordFormSection number={4} title="ข้อมูลผู้รับผิดชอบ" description="ระบุผู้ดูแลครุภัณฑ์และเบอร์โทรสำหรับติดต่อเมื่อตรวจสอบประจำปี">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อผู้รับผิดชอบ" value={responsiblePerson} onChange={(event) => setResponsiblePerson(event.target.value)} />
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => {
                setResponsiblePhone(value);
                if (/^[0-9]{9,10}$/.test(value) || !value) setResponsiblePhoneError("");
              }}
              error={responsiblePhoneError}
              onInvalidInput={() => setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น")}
              onBlur={() => {
                if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
                  setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
                }
              }}
            />
          </div>
        </RecordFormSection>

        <RecordFormSection number={5} title="ข้อมูลสถานะและหลักฐาน" description="บันทึกสภาพปัจจุบันของครุภัณฑ์ พร้อมแนบรูปภาพหรือหมายเหตุประกอบ">
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField label="สถานะครุภัณฑ์" value={status} onChange={setStatus} options={["ใช้งานได้", "ชำรุด", "รอซ่อม", "สูญหาย", "โอนย้าย", "จำหน่ายแล้ว", "รอตรวจสอบ"]} />
            <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
              <p className="font-semibold text-slate-200">รูปภาพครุภัณฑ์</p>
              <p className="mt-2 text-xs text-slate-400">มีรูปภาพเดิม {asset.imageCount.toLocaleString("th-TH")} รูป</p>
            </div>
            <div className="lg:col-span-2">
              <TextAreaField label="หมายเหตุ" value={note} onChange={(event) => setNote(event.target.value)} autoResize />
            </div>
          </div>
        </RecordFormSection>
        </div>
      </div>
    </section>
  );
}

function LoginPage({ users, roles, onLogin }: { users: AppUser[]; roles: RoleDefinition[]; onLogin: (user: AppUser) => void }) {
  const activeUsers = users.filter((user) => user.active && getRoleDefinition(user.role, roles).active);
  const [selectedEmail, setSelectedEmail] = useState(activeUsers[0]?.email ?? "");
  const selectedUser = activeUsers.find((user) => user.email === selectedEmail) ?? activeUsers[0];
  const canLogin = Boolean(selectedUser);
  const handleLogin = () => {
    console.log("LOGIN CLICKED");
    console.log("selectedUser:", selectedUser);
    if (!selectedUser) {
      window.alert("กรุณาเลือกผู้ใช้งาน");
      return;
    }
    onLogin(selectedUser);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleLogin();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[#1E40AF]">ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#0F172A]">Login</h1>
        <p className="mt-2 text-sm text-[#64748B]">เลือกบัญชีผู้ใช้งานเพื่อเข้าสู่ระบบ</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-[#0F172A]">ผู้ใช้งาน</span>
            <select
              value={selectedEmail}
              onChange={(event) => setSelectedEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-lg border border-[#CBD5E1] bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            >
              {activeUsers.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.email}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
            <p>ชื่อ: <span className="font-semibold text-[#0F172A]">{selectedUser.name}</span></p>
            <p className="mt-2">
              บทบาท:{" "}
              <span className="inline-flex rounded-full border border-[#BFDBFE] bg-[#DBEAFE] px-2.5 py-0.5 text-xs font-bold text-[#1E40AF]">
                {getRoleDefinition(selectedUser.role, roles).name}
              </span>
            </p>
            <p className="mt-2">องค์กร: <span className="font-medium text-[#0F172A]">{selectedUser.organization}</span></p>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            disabled={!canLogin}
            className="w-full cursor-pointer rounded-md border border-[#1E40AF] bg-[#1E40AF] px-4 py-3 font-extrabold text-[#FFFFFF] transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            เข้าสู่ระบบ
          </button>
        </form>
      </section>
    </main>
  );
}

function MasterDataPanel({ title, description, items, onChange, addLabel }: { title: string; description: string; items: MasterDataItem[]; onChange: (items: MasterDataItem[]) => void; addLabel: string }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const save = () => {
    const name = draft.trim();
    if (!name) return;
    if (editingId === null) onChange([...items, { id: Date.now(), name, active: true }]);
    else onChange(items.map((item) => item.id === editingId ? { ...item, name } : item));
    setDraft("");
    setEditingId(null);
  };
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={addLabel} className="min-h-11 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold" />
        <button type="button" onClick={save} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">{editingId === null ? "เพิ่มรายการ" : "บันทึก"}</button>
        {editingId !== null && <button type="button" onClick={() => { setEditingId(null); setDraft(""); }} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">ยกเลิก</button>}
      </div>
      <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/20 px-4 py-3">
            <div className="min-w-0"><p className={`break-words font-semibold ${item.active ? "text-white" : "text-slate-500"}`}>{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditingId(item.id); setDraft(item.name); }} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold">แก้ไข</button>
              <button type="button" onClick={() => onChange(items.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry))} className="rounded-md border border-slate-500/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">{item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function UserManagementPage({ users, onAddUser, onUpdateUser, roles, onRolesChange, permissions, organizationItems, onOrganizationItemsChange, locationItems, onLocationItemsChange, equipmentTypeItems, onEquipmentTypeItemsChange, assets }: {
  users: AppUser[];
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
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
}) {
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("edit");
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleModalMode, setRoleModalMode] = useState<"add" | "edit">("edit");
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "organizations" | "locations" | "types" | "numbers">("users");

  if (!permissions.canManageUsers) {
    return (
      <section className="rounded-lg border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-bold text-white">ไม่มีสิทธิ์จัดการผู้ใช้งาน</h2>
        <p className="mt-2 text-sm text-slate-400">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขบทบาท องค์กร และสิทธิ์ส่งออกได้</p>
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
    setEditingUser({ id: Date.now(), name: "", email: "", role: roles.find((role) => role.active && role.key !== "Admin")?.key ?? "Inspector", organization: "-", viewerCanExport: false, active: true });
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
  const latestSequence = assets.reduce((highest, asset) => Math.max(highest, Number(asset.assetNumber.match(/(\d{1,6})\s*\/\s*\d{4}/)?.[1] ?? 0)), 143);
  const currentThaiYear = new Date().getFullYear() + 543;
  const tabs = [
    ["users", "จัดการผู้ใช้งาน"], ["roles", "จัดการบทบาท"], ["organizations", "องค์กร/หน่วยงาน"], ["locations", "สถานที่จัดเก็บ"], ["types", "ประเภทครุภัณฑ์"], ["numbers", "การออกเลขครุภัณฑ์"],
  ] as const;

  return (
    <>
      <div className="mx-auto mb-4 w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-3">
        <p className="px-2 text-sm text-slate-400">จัดการข้อมูลกลาง ผู้ใช้งาน และสิทธิ์การใช้งานระบบ</p>
        <div className="mt-3 flex gap-2 overflow-x-auto">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${activeTab === key ? "bg-gold text-slate-950" : "bg-panelSoft text-slate-300 hover:text-white"}`}>{label}</button>)}</div>
      </div>
      {activeTab === "users" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">จัดการผู้ใช้งาน</h2><p className="mt-2 text-sm text-slate-400">ตรวจสอบบัญชี บทบาท องค์กร และสิทธิ์การใช้งานของผู้ใช้ในระบบ</p></div><button type="button" onClick={openAddUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">เพิ่มผู้ใช้งาน</button></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-panelSoft text-slate-300">
              <tr>
                {["ชื่อ", "อีเมล", "บทบาท", "องค์กร", "สิทธิ์การใช้งาน", "อนุญาตส่งออก", "จัดการ"].map((heading) => (
                  <th key={heading} className="border-b border-white/10 px-3 py-2.5">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3 font-semibold text-white">{user.name}</td>
                  <td className="px-3 py-3 text-slate-300">{user.email}</td>
                  <td className="px-3 py-3"><span className="inline-flex rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-200">{getRoleDefinition(user.role, roles).name}</span></td>
                  <td className="max-w-[240px] px-3 py-3 text-slate-300" title={user.organization}>{user.organization || "-"}</td>
                  <td className="max-w-[280px] px-3 py-3 text-slate-300">{getPermissionLabel(getPermissions(user, roles))}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.viewerCanExport ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-700/60 text-slate-300"}`}>
                      {user.viewerCanExport ? "อนุญาต" : "ไม่อนุญาต"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2"><button type="button" onClick={() => { setUserModalMode("edit"); setEditingUser({ ...user }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amberSoft">แก้ไข</button><button type="button" disabled={user.role === "Admin"} onClick={() => onUpdateUser({ ...user, active: !user.active })} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">{user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {activeTab === "roles" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">จัดการบทบาท</h2><p className="mt-2 text-sm text-slate-400">กำหนดบทบาทและสิทธิ์การใช้งานสำหรับผู้ใช้งานในระบบ</p></div><button type="button" onClick={openAddRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">เพิ่มบทบาท</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead className="bg-panelSoft text-slate-300"><tr>{["ชื่อบทบาท", "คำอธิบาย", "สิทธิ์การใช้งาน", "อนุญาตส่งออก", "สถานะ", "จัดการ"].map((heading) => <th key={heading} className="border-b border-white/10 px-3 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">{roles.map((role) => <tr key={role.key}><td className="px-3 py-3 font-semibold text-white">{role.name}</td><td className="px-3 py-3 text-slate-300">{role.description || "-"}</td><td className="max-w-[340px] px-3 py-3 text-slate-300">{getPermissionLabel(role.permissions)}</td><td className="px-3 py-3">{role.allowExport ? "อนุญาต" : "ไม่อนุญาต"}</td><td className="px-3 py-3">{role.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</td><td className="px-3 py-3"><div className="flex gap-2"><button type="button" onClick={() => { setRoleModalMode("edit"); setEditingRole({ ...role, permissions: { ...role.permissions } }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950">แก้ไข</button><button type="button" disabled={role.protected} onClick={() => onRolesChange(roles.map((item) => item.key === role.key ? { ...item, active: !item.active } : item))} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">{role.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button></div></td></tr>)}</tbody></table></div></section>}

      {activeTab === "organizations" && <MasterDataPanel title="จัดการองค์กร/หน่วยงาน" description="จัดการรายชื่อองค์กร หน่วยงาน ฝ่าย และชมรมที่ใช้ในระบบ" items={organizationItems} onChange={onOrganizationItemsChange} addLabel="ระบุชื่อองค์กรหรือหน่วยงาน" />}
      {activeTab === "locations" && <MasterDataPanel title="จัดการสถานที่จัดเก็บ" description="จัดการสถานที่จัดเก็บครุภัณฑ์ที่ใช้ในฟอร์มบันทึกข้อมูลและการตรวจสอบ" items={locationItems} onChange={onLocationItemsChange} addLabel="ระบุสถานที่จัดเก็บ" />}
      {activeTab === "types" && <MasterDataPanel title="จัดการประเภทครุภัณฑ์" description="จัดการหมวดหมู่ครุภัณฑ์ที่ใช้ในฟอร์ม ตาราง รายงาน และตัวกรองข้อมูล" items={equipmentTypeItems} onChange={onEquipmentTypeItemsChange} addLabel="ระบุประเภทครุภัณฑ์" />}
      {activeTab === "numbers" && <section className="rounded-lg border border-white/10 bg-panel p-5"><h2 className="text-xl font-bold text-white">ตั้งค่าการออกเลขครุภัณฑ์</h2><p className="mt-2 text-sm text-slate-400">กำหนดรูปแบบและเลขลำดับล่าสุดสำหรับการออกหมายเลขครุภัณฑ์อัตโนมัติ</p><div className="mt-5 grid gap-4 md:grid-cols-3"><DetailInfoItem label="คำนำหน้าเลขครุภัณฑ์" value="ค.อ.มช." /><DetailInfoItem label="เลขลำดับล่าสุด" value={String(latestSequence).padStart(4, "0")} /><DetailInfoItem label="ตัวอย่างรูปแบบหมายเลขครุภัณฑ์" value={`ค.อ.มช.${String(latestSequence + 1).padStart(4, "0")}/${currentThaiYear}`} /></div><p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">ข้อมูลส่วนนี้เป็นแบบอ่านอย่างเดียว เพื่อป้องกันหมายเลขครุภัณฑ์ซ้ำหรือผิดลำดับ</p></section>}

      {editingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-xl font-bold text-white">{userModalMode === "add" ? "เพิ่มผู้ใช้งาน" : "แก้ไขข้อมูลผู้ใช้งาน"}</h3>
                <p className="mt-1 text-sm text-slate-400">ระบุข้อมูลบัญชีและบทบาทของผู้ใช้งาน</p>
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
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-white">อนุญาตส่งออก</span>
                  <span className="mt-1 block text-xs text-slate-400">อนุญาตให้ผู้ใช้นี้ส่งออกรายงานจากระบบ</span>
                </span>
                <input type="checkbox" checked={editingUser.viewerCanExport} onChange={(event) => setEditingUser({ ...editingUser, viewerCanExport: event.target.checked })} className="h-5 w-5 accent-yellow-400" />
              </label>
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ยกเลิก</button>
                <button type="button" onClick={saveEditingUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingRole && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4"><div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-white/10 p-5"><div><h3 className="text-xl font-bold text-white">{roleModalMode === "add" ? "เพิ่มบทบาท" : "แก้ไขบทบาท"}</h3><p className="mt-1 text-sm text-slate-400">กำหนดชื่อ คำอธิบาย และสิทธิ์การใช้งาน</p></div><CloseIconButton onClick={() => setEditingRole(null)} /></div><div className="space-y-4 p-5"><Field label="ชื่อบทบาท" value={editingRole.name} onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })} /><Field label="คำอธิบายบทบาท" value={editingRole.description} onChange={(event) => setEditingRole({ ...editingRole, description: event.target.value })} /><div><p className="text-sm font-semibold text-white">สิทธิ์การใช้งาน</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{([{ key: "canViewDashboard", label: "หน้าภาพรวม" }, { key: "canViewList", label: "แสดงรายการ" }, { key: "canInspect", label: "ตรวจสอบประจำปี" }, { key: "canCreate", label: "บันทึกข้อมูล" }, { key: "canViewReports", label: "รายงาน" }, { key: "canManageUsers", label: "ตั้งค่า" }, { key: "canEdit", label: "แก้ไขข้อมูลครุภัณฑ์" }, { key: "canDelete", label: "ลบข้อมูลครุภัณฑ์" }] as { key: keyof Permissions; label: string }[]).map((option) => <label key={option.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(editingRole.permissions[option.key])} onChange={(event) => setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [option.key]: event.target.checked } })} className="h-4 w-4 accent-yellow-400" />{option.label}</label>)}</div></div><label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3"><span className="text-sm font-semibold text-white">อนุญาตส่งออก</span><input type="checkbox" checked={editingRole.allowExport} onChange={(event) => setEditingRole({ ...editingRole, allowExport: event.target.checked, permissions: { ...editingRole.permissions, canExport: event.target.checked } })} className="h-5 w-5 accent-yellow-400" /></label><div className="flex justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={() => setEditingRole(null)} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">ยกเลิก</button><button type="button" onClick={saveRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950">บันทึก</button></div></div></div></div>}
    </>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            พื้นที่โครงสร้างสำหรับหน้า {title} เตรียมไว้สำหรับเพิ่มฟอร์ม ตาราง ตัวกรอง และการเชื่อมต่อฐานข้อมูลในขั้นต่อไป
          </p>
        </div>
        <button className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-orange/90">
          จัดการข้อมูล
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["ข้อมูลหลัก", "สถานะงาน", "บันทึกล่าสุด"].map((label) => (
          <div key={label} className="rounded-lg border border-white/10 bg-panelSoft p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-lg font-bold text-white">พร้อมกำหนดรายละเอียด</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageContent({
  activePage,
  assets,
  annualInspections,
  activityLogs,
  permissions,
  users,
  selectedAsset,
  onViewDetails,
  onEditAsset,
  onGoToRecord,
  onCreateAsset,
  onSaveAnnualInspection,
  onCancelAnnualInspection,
  onSaveAsset,
  onSaveInspectionStatus,
  onDeleteAsset,
  onAddUser,
  onUpdateUser,
  onBackToList,
  onViewAllAssets,
  organizationItems,
  onOrganizationItemsChange,
  locationItems,
  onLocationItemsChange,
  equipmentTypeItems,
  onEquipmentTypeItemsChange,
  roles,
  onRolesChange,
}: {
  activePage: PageKey;
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  activityLogs: ActivityLog[];
  permissions: Permissions;
  users: AppUser[];
  selectedAsset: AssetListRow | null;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onGoToRecord: () => void;
  onCreateAsset: (asset: AssetListRow) => void;
  onSaveAnnualInspection: (inspection: AnnualInspection) => void;
  onCancelAnnualInspection: (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => void;
  onSaveAsset: (asset: AssetListRow, oldAsset: AssetListRow) => void;
  onSaveInspectionStatus: (asset: AssetListRow, status: string, inspectionDate: string, note: string) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onBackToList: () => void;
  onViewAllAssets: () => void;
  organizationItems: MasterDataItem[];
  onOrganizationItemsChange: (items: MasterDataItem[]) => void;
  locationItems: MasterDataItem[];
  onLocationItemsChange: (items: MasterDataItem[]) => void;
  equipmentTypeItems: MasterDataItem[];
  onEquipmentTypeItemsChange: (items: MasterDataItem[]) => void;
  roles: RoleDefinition[];
  onRolesChange: (roles: RoleDefinition[]) => void;
}) {
  const activeOrganizations = organizationItems.filter((item) => item.active).map((item) => ({ name: item.name, type: getOrganizationType(item.name) }));
  const activeLocations = locationItems.filter((item) => item.active).map((item) => item.name);
  const activeEquipmentTypes = equipmentTypeItems.filter((item) => item.active).map((item) => item.name);
  const title = menuItems.find((item) => item.key === activePage)?.label ?? "Dashboard";
  if (activePage === "dashboard") return permissions.canViewDashboard ? <DashboardPage assets={assets} annualInspections={annualInspections} onViewAllAssets={onViewAllAssets} /> : <PlaceholderPage title="ไม่มีสิทธิ์เข้าถึง Dashboard" />;
  if (activePage === "record") return permissions.canCreate ? <RecordPage assets={assets} onCreateAsset={onCreateAsset} organizationOptions={activeOrganizations} equipmentTypeOptions={activeEquipmentTypes} locationOptions={activeLocations} /> : <PlaceholderPage title="ไม่มีสิทธิ์เพิ่มข้อมูล" />;
  if (activePage === "list") return permissions.canViewList ? <ListPage assets={assets} annualInspections={annualInspections} permissions={permissions} onAddAsset={onGoToRecord} onViewDetails={onViewDetails} onEditAsset={onEditAsset} onDeleteAsset={onDeleteAsset} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายการครุภัณฑ์" />;
  if (activePage === "detail") return permissions.canViewList ? <AssetDetailPage asset={selectedAsset ?? assets[0]} activityLogs={activityLogs} permissions={permissions} onEdit={onEditAsset} onDelete={onDeleteAsset} onBack={onBackToList} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายละเอียดครุภัณฑ์" />;
  if (activePage === "edit") return (permissions.canEdit || permissions.canEditLimitedFields) ? <AssetEditPage asset={selectedAsset ?? assets[0]} permissions={permissions} onSave={onSaveAsset} onCancel={() => selectedAsset ? onViewDetails(selectedAsset) : onBackToList()} organizationOptions={activeOrganizations} equipmentTypeOptions={activeEquipmentTypes} locationOptions={activeLocations} /> : <PlaceholderPage title="ไม่มีสิทธิ์แก้ไขข้อมูล" />;
  if (activePage === "audit") return permissions.canInspect ? <AuditPage assets={assets} annualInspections={annualInspections} onSaveAnnualInspection={onSaveAnnualInspection} onCancelAnnualInspection={onCancelAnnualInspection} onSaveInspectionStatus={onSaveInspectionStatus} /> : <PlaceholderPage title="ไม่มีสิทธิ์ตรวจสอบประจำปี" />;
  if (activePage === "reports") return permissions.canViewReports ? <ReportsPage assets={assets} annualInspections={annualInspections} permissions={permissions} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายงาน" />;
  if (activePage === "settings") return permissions.canManageUsers ? <UserManagementPage users={users} onAddUser={onAddUser} permissions={permissions} onUpdateUser={onUpdateUser} roles={roles} onRolesChange={onRolesChange} organizationItems={organizationItems} onOrganizationItemsChange={onOrganizationItemsChange} locationItems={locationItems} onLocationItemsChange={onLocationItemsChange} equipmentTypeItems={equipmentTypeItems} onEquipmentTypeItemsChange={onEquipmentTypeItemsChange} assets={assets} /> : <PlaceholderPage title="ไม่มีสิทธิ์เข้าถึงการตั้งค่า" />;
  return <PlaceholderPage title={title} />;
}

const pageDescriptions: Record<PageKey, string> = {
  dashboard: "ภาพรวมข้อมูลครุภัณฑ์ สถานะการใช้งาน และผลการตรวจสอบประจำปี",
  list: "ค้นหาและกรองข้อมูลจากหมายเลขครุภัณฑ์ ชื่อรายการ หรือฝ่าย/ชมรม",
  audit: "ตรวจสอบว่าครุภัณฑ์ยังอยู่จริง ใช้งานได้ ชำรุด ย้ายสถานที่ หรือสูญหาย",
  record: "กรอกข้อมูลครุภัณฑ์ทีละรายการ เพื่อบันทึกและออกหมายเลขครุภัณฑ์ โดยยึดหลัก 1 ครุภัณฑ์ ต่อ 1 หมายเลขครุภัณฑ์ ยกเว้นครุภัณฑ์\u2060แบบชุด",
  reports: "สรุปข้อมูลครุภัณฑ์ตามปีงบประมาณ สถานะ หน่วยงาน และผลการตรวจสอบ",
  settings: "จัดการข้อมูลกลาง ผู้ใช้งาน บทบาท และสิทธิ์การใช้งานระบบ",
  detail: "อ่านข้อมูลสำคัญของครุภัณฑ์และประวัติการเปลี่ยนแปลง",
  edit: "แก้ไขข้อมูลครุภัณฑ์ตามสิทธิ์ของผู้ใช้งาน",
};

export default function Home() {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [roles, setRoles] = useState<RoleDefinition[]>(initialRoleDefinitions);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [organizationItems, setOrganizationItems] = useState<MasterDataItem[]>(() => uniqueSorted([
    "กองพัฒนานักศึกษา", "สภานักศึกษามหาวิทยาลัยเชียงใหม่", "สโมสรนักศึกษามหาวิทยาลัยเชียงใหม่", "ฝ่ายวิชาการ", "ฝ่ายศาสนาและศิลปวัฒนธรรม", "ฝ่ายจิตอาสาและบำเพ็ญประโยชน์", "ฝ่ายนักศึกษาสัมพันธ์และวิเทศสัมพันธ์", "ตี้เดียวฮู้เรื่อง", "ชมรมการแสดง", "ชมรมดนตรี", "ชมรมถ่ายภาพ", "ชมรมกีฬา", ...organizations.map((item) => item.name),
  ]).map((name, index) => ({ id: index + 1, name, active: true })));
  const [locationItems, setLocationItems] = useState<MasterDataItem[]>(() => storageLocationOptions.map((name, index) => ({ id: index + 1, name, active: true })));
  const [equipmentTypeItems, setEquipmentTypeItems] = useState<MasterDataItem[]>(() => assetTypeOptions.map((name, index) => ({ id: index + 1, name, active: true })));
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [assets, setAssets] = useState<AssetListRow[]>(assetListRows);
  const [annualInspections, setAnnualInspections] = useState<AnnualInspection[]>(() => buildInitialAnnualInspections(assetListRows));
  const [selectedAsset, setSelectedAsset] = useState<AssetListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetListRow | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [toast, setToast] = useState("");
  const [isDashboardExporting, setIsDashboardExporting] = useState(false);

  useEffect(() => {
    try {
      const savedUsers = JSON.parse(window.localStorage.getItem("asset-system-users") ?? "[]") as Partial<AppUser>[];
      const savedRoles = JSON.parse(window.localStorage.getItem("asset-system-roles") ?? "[]") as RoleDefinition[];
      if (Array.isArray(savedUsers) && savedUsers.length > 0) {
        const normalizedUsers = savedUsers.map((user) => ({ ...user, active: user.active !== false })) as AppUser[];
        setUsers([...normalizedUsers, ...initialUsers.filter((initial) => !normalizedUsers.some((user) => user.email === initial.email))]);
      }
      if (Array.isArray(savedRoles) && savedRoles.length > 0) {
        setRoles([...savedRoles, ...initialRoleDefinitions.filter((initial) => !savedRoles.some((role) => role.key === initial.key))]);
      }
    } catch {
      window.localStorage.removeItem("asset-system-users");
      window.localStorage.removeItem("asset-system-roles");
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    window.localStorage.setItem("asset-system-users", JSON.stringify(users));
    window.localStorage.setItem("asset-system-roles", JSON.stringify(roles));
  }, [roles, settingsLoaded, users]);

  useEffect(() => {
    if (!settingsLoaded) return;
    try {
      const savedAuth = window.localStorage.getItem("isAuthenticated");
      const savedUserJson = window.localStorage.getItem("currentUser");
      const savedEmail = window.localStorage.getItem("asset-current-user-email");
      const parsedUser = savedUserJson ? JSON.parse(savedUserJson) as Partial<AppUser> : null;
      const restoredEmail = parsedUser?.email ?? savedEmail;
      const restoredUser = restoredEmail ? users.find((user) => user.email === restoredEmail && user.active && getRoleDefinition(user.role, roles).active) : null;

      if (savedAuth === "true" && restoredUser) {
        setCurrentUser(restoredUser);
        setIsAuthenticated(true);
        const restoredPermissions = getPermissions(restoredUser, roles);
        if (!restoredPermissions.canViewDashboard) setActivePage(restoredPermissions.canViewList ? "list" : restoredPermissions.canInspect ? "audit" : "list");
      }
    } catch {
      window.localStorage.removeItem("asset-current-user-email");
      window.localStorage.removeItem("currentUser");
      window.localStorage.removeItem("isAuthenticated");
      setCurrentUser(null);
      setIsAuthenticated(false);
    } finally {
      setAuthReady(true);
    }
  }, [users, roles, settingsLoaded]);

  useEffect(() => {
    if (!currentUser) return;
    const currentPermissions = getPermissions(currentUser, roles);
    const pageAllowed = ((activePage === "list" || activePage === "detail") && currentPermissions.canViewList) ||
      (activePage === "dashboard" && currentPermissions.canViewDashboard) ||
      (activePage === "record" && currentPermissions.canCreate) ||
      (activePage === "edit" && (currentPermissions.canEdit || currentPermissions.canEditLimitedFields)) ||
      (activePage === "audit" && currentPermissions.canInspect) ||
      (activePage === "reports" && currentPermissions.canViewReports) ||
      (activePage === "settings" && currentPermissions.canManageUsers);
    if (!pageAllowed) {
      setActivePage(currentPermissions.canViewList ? "list" : currentPermissions.canInspect ? "audit" : currentPermissions.canViewDashboard ? "dashboard" : "list");
      setSelectedAsset(null);
    }
  }, [activePage, currentUser, roles]);

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    const userPermissions = getPermissions(user, roles);
    setActivePage(userPermissions.canViewDashboard ? "dashboard" : userPermissions.canViewList ? "list" : userPermissions.canInspect ? "audit" : "list");
    setSelectedAsset(null);
    try {
      window.localStorage.setItem("asset-current-user-email", user.email);
      window.localStorage.setItem("currentUser", JSON.stringify(user));
      window.localStorage.setItem("isAuthenticated", "true");
    } catch {
      // Auth state is already set; localStorage is only for refresh persistence.
    }
    console.log("AUTH STATE SET", { currentUser: user, isAuthenticated: true });
  };

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-4 text-sm font-semibold text-[#64748B] shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
          กำลังเตรียมระบบ...
        </div>
      </main>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage users={users} roles={roles} onLogin={handleLoginSuccess} />;
  }

  const permissions = getPermissions(currentUser, roles);
  const visibleAssets = assets.filter((asset) => !asset.deletedAt && canAccessAsset(currentUser, permissions, asset));
  const allowedMenuItems = menuItems.filter((item) => {
    if (item.key === "dashboard") return permissions.canViewDashboard;
    if (item.key === "list") return permissions.canViewList;
    if (item.key === "record") return permissions.canCreate;
    if (item.key === "audit") return permissions.canInspect;
    if (item.key === "reports") return permissions.canViewReports;
    if (item.key === "settings") return permissions.canManageUsers;
    return true;
  });
  const activeItem = activePage === "detail"
    ? { label: "รายละเอียดครุภัณฑ์" }
    : activePage === "edit"
      ? { label: "แก้ไขข้อมูลครุภัณฑ์" }
    : (menuItems.find((item) => item.key === activePage) ?? menuItems[0]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const handleViewDetails = (asset: AssetListRow) => {
    if (!canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์ดูข้อมูลครุภัณฑ์รายการนี้");
      return;
    }
    setSelectedAsset(asset);
    setActivePage("detail");
  };

  const handleEditAsset = (asset: AssetListRow) => {
    if (!(permissions.canEdit || permissions.canEditLimitedFields) || !canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์แก้ไขข้อมูลครุภัณฑ์รายการนี้");
      return;
    }
    setSelectedAsset(asset);
    setActivePage("edit");
  };

  const handleGoToRecord = () => {
    setSelectedAsset(null);
    setActivePage("record");
  };

  const handleDashboardExport = async () => {
    setIsDashboardExporting(true);
    showToast("กำลังสร้าง PDF...");
    try {
      await exportDashboardToPDF();
      showToast("ดาวน์โหลดไฟล์ PDF Dashboard แล้ว");
    } catch (error) {
      console.error(error);
      showToast("ไม่สามารถส่งออก PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDashboardExporting(false);
    }
  };

  const addActivityLog = (log: Omit<ActivityLog, "id" | "createdAt">) => {
    setActivityLogs((items) => [
      {
        ...log,
        id: Date.now(),
        createdAt: formatThaiDateTime(new Date().toISOString()),
      },
      ...items,
    ]);
  };

  const handleSaveAsset = (nextAsset: AssetListRow, oldAsset: AssetListRow) => {
    if (!(permissions.canEdit || permissions.canEditLimitedFields) || !canAccessAsset(currentUser, permissions, oldAsset)) {
      showToast("ไม่มีสิทธิ์บันทึกการแก้ไข");
      return;
    }
    const historyUpdatedAt = formatThaiDateTimeWithSeconds(new Date().toISOString());
    const savedAsset = permissions.canEditLimitedFields
      ? {
          ...oldAsset,
          location: nextAsset.location,
          updatedAt: historyUpdatedAt,
        }
      : { ...nextAsset, updatedAt: historyUpdatedAt };
    setAssets((items) => items.map((item) => item.id === savedAsset.id ? savedAsset : item));
    setSelectedAsset(savedAsset);
    addActivityLog({
      userName: currentUser.name,
      actionType: "แก้ไข",
      targetId: savedAsset.id,
      targetTable: "assets",
      detail: `แก้ไขข้อมูลครุภัณฑ์ ${savedAsset.assetName}`,
      oldValue: `ชื่อ: ${oldAsset.assetName}, หมายเลขครุภัณฑ์: ${oldAsset.assetNumber}, จัดซื้อในโครงการ: ${oldAsset.purchaseProject || "-"}, ตำแหน่งที่ประทับหมายเลขครุภัณฑ์: ${oldAsset.numberPlacement || "-"}, วันที่บันทึกข้อมูล: ${oldAsset.recordDate}, วันที่ได้รับครุภัณฑ์: ${oldAsset.purchaseMonth}, สถานะ: ${oldAsset.status}, สถานที่: ${oldAsset.location}`,
      newValue: `ชื่อ: ${savedAsset.assetName}, หมายเลขครุภัณฑ์: ${savedAsset.assetNumber}, จัดซื้อในโครงการ: ${savedAsset.purchaseProject || "-"}, ตำแหน่งที่ประทับหมายเลขครุภัณฑ์: ${savedAsset.numberPlacement || "-"}, วันที่บันทึกข้อมูล: ${savedAsset.recordDate}, วันที่ได้รับครุภัณฑ์: ${savedAsset.purchaseMonth}, สถานะ: ${savedAsset.status}, สถานที่: ${savedAsset.location}, updated_at: ${historyUpdatedAt}`,
    });
    showToast("บันทึกการแก้ไขและ activity_logs สำเร็จ");
    setActivePage("detail");
  };

  const handleSaveInspectionStatus = (asset: AssetListRow, status: string, inspectionDate: string, note: string) => {
    const updatedAt = new Date().toLocaleString("th-TH");
    setAssets((items) =>
      items.map((item) =>
        item.id === asset.id
          ? {
              ...item,
              status,
              latestInspectionDate: inspectionDate,
              inspectionResult: status,
              note: note || item.note,
              updatedAt,
            }
          : item,
      ),
    );
  };

  const handleSaveAnnualInspection = (inspection: AnnualInspection) => {
    setAnnualInspections((items) => [
      ...items.filter((item) => !(item.assetId === inspection.assetId && item.inspectionYear === inspection.inspectionYear)),
      inspection,
    ]);
  };

  const handleCancelAnnualInspection = (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => {
    setAnnualInspections((items) => items.filter((item) => !(item.assetId === asset.id && item.inspectionYear === inspectionYear)));
    addActivityLog({
      userName: currentUser.name,
      actionType: "ยกเลิกผลตรวจ",
      targetId: asset.id,
      targetTable: "assets",
      detail: `ยกเลิกผลตรวจสอบประจำปี ${inspectionYear}`,
      oldValue: inspection
        ? `ปีตรวจสอบ: ${inspection.inspectionYear}, วันที่ตรวจสอบ: ${inspection.inspectionDate}, สถานะหลังตรวจ: ${inspection.result}`
        : `ปีตรวจสอบ: ${inspectionYear}`,
      newValue: "ลบเฉพาะ annual_inspections ของปีที่เลือก",
      note: "ไม่ได้ย้อนสถานะครุภัณฑ์โดยอัตโนมัติ",
    });
    showToast(`ยกเลิกผลตรวจสอบประจำปี ${inspectionYear} แล้ว`);
  };

  const handleCreateAsset = (asset: AssetListRow) => {
    if (!permissions.canCreate) {
      showToast("ไม่มีสิทธิ์เพิ่มข้อมูลครุภัณฑ์");
      return;
    }
    setAssets((items) => [asset, ...items]);
    setSelectedAsset(asset);
    addActivityLog({
      userName: currentUser.name,
      actionType: "แก้ไข",
      targetId: asset.id,
      targetTable: "assets",
      detail: `เพิ่มข้อมูลครุภัณฑ์ ${asset.assetCode}`,
      oldValue: "ยังไม่มีข้อมูลเดิม",
      newValue: `ชื่อ: ${asset.assetName}, สถานะ: ${asset.status}, สถานที่: ${asset.location}`,
    });
    showToast("เพิ่มข้อมูลครุภัณฑ์ใหม่เรียบร้อยแล้ว");
  };

  const handleDeleteAsset = (asset: AssetListRow) => {
    if (!permissions.canDelete) {
      showToast("ไม่มีสิทธิ์ลบข้อมูลครุภัณฑ์");
      return;
    }
    setDeleteTarget(asset);
  };

  const confirmDeleteAsset = () => {
    if (!deleteTarget) return;
    if (!permissions.canDelete) {
      setDeleteTarget(null);
      showToast("ไม่มีสิทธิ์ลบข้อมูลครุภัณฑ์");
      return;
    }
    const deletedAt = formatThaiDateTimeWithSeconds(new Date().toISOString());
    setAssets((items) => items.map((item) => item.id === deleteTarget.id ? { ...item, deletedAt, deletedBy: currentUser.name, updatedAt: deletedAt } : item));
    addActivityLog({
      userName: currentUser.name,
      actionType: "ลบ",
      targetId: deleteTarget.id,
      targetTable: "assets",
      detail: `ลบข้อมูลครุภัณฑ์ ${deleteTarget.assetName}`,
      oldValue: `หมายเลขครุภัณฑ์: ${deleteTarget.assetNumber}, ชื่อ: ${deleteTarget.assetName}, สถานะ: ${deleteTarget.status}`,
      newValue: `deleted_at: ${deletedAt}, deleted_by: ${currentUser.name}`,
      note: "ลบแบบ soft delete เพื่อให้ตรวจสอบย้อนหลังได้",
    });
    setDeleteTarget(null);
    showToast("ลบข้อมูลแบบ soft delete และบันทึก activity_logs แล้ว");
    if (selectedAsset?.id === deleteTarget.id) {
      setSelectedAsset(null);
      setActivePage("list");
    }
  };

  const handleBackToList = () => {
    setActivePage("list");
  };

  const handleUpdateUser = (nextUser: AppUser) => {
    if (!permissions.canManageUsers) {
      showToast("ไม่มีสิทธิ์จัดการผู้ใช้งาน");
      return;
    }
    setUsers((items) => items.map((item) => item.id === nextUser.id ? nextUser : item));
    if (currentUser.id === nextUser.id) {
      setCurrentUser(nextUser);
    }
    showToast("บันทึกการตั้งค่าผู้ใช้งานแล้ว");
  };

  const handleAddUser = (nextUser: AppUser) => {
    if (!permissions.canManageUsers) return;
    if (users.some((user) => user.email.toLowerCase() === nextUser.email.toLowerCase())) {
      showToast("อีเมลนี้มีผู้ใช้งานอยู่แล้ว");
      return;
    }
    setUsers((items) => [...items, nextUser]);
    showToast("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    window.localStorage.removeItem("asset-current-user-email");
    window.localStorage.removeItem("currentUser");
    window.localStorage.removeItem("isAuthenticated");
    setActivePage("dashboard");
    setSelectedAsset(null);
  };

  return (
    <main className="asset-shell min-h-screen w-full max-w-full overflow-x-hidden font-thai text-slate-100 transition-colors duration-200">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-gold/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-gold shadow-glow">
          {toast}
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-panel p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-white">ยืนยันการลบข้อมูล</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              ต้องการลบครุภัณฑ์รายการนี้หรือไม่? ข้อมูลจะถูกเก็บไว้ในประวัติและสามารถตรวจสอบย้อนหลังได้
            </p>
            <p className="mt-3 rounded-md border border-white/10 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-white">
              {deleteTarget.assetNumber} · {deleteTarget.assetName}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ยกเลิก</button>
              <button onClick={confirmDeleteAsset} className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy/90 backdrop-blur">
        <div className="flex min-h-20 items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold text-slate-950 shadow-glow sm:h-12 sm:w-12">
            <Icon path="M12 3l8 4v10l-8 4-8-4V7l8-4Zm0 0v18M4 7l8 4 8-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-sm font-extrabold leading-5 text-white sm:text-lg md:text-2xl">
              ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา
            </h1>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block md:text-base">
              ระบบบริหารจัดการครุภัณฑ์ ฝ่าย/ชมรม มหาวิทยาลัยเชียงใหม่
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-panel p-1.5 text-sm sm:px-2 sm:py-2 md:gap-3 md:px-3">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-white">{currentUser.name}</p>
              <p className="max-w-[220px] truncate text-xs text-gold">{getRoleDefinition(currentUser.role, roles).name} · {currentUser.organization}</p>
            </div>
            <button onClick={handleLogout} className="min-h-10 rounded-md border border-white/15 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold sm:px-3">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="grid w-full min-w-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-white/10 bg-slate-950/30 p-3 lg:min-h-[calc(100vh-80px)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {allowedMenuItems.map((item) => {
              const active = item.key === activePage;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActivePage(item.key);
                    if (item.key !== "detail" && item.key !== "edit") setSelectedAsset(null);
                  }}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-gold text-blue-800 shadow-glow"
                      : "bg-panel text-slate-300 ring-1 ring-white/10 hover:bg-panelSoft hover:text-white"
                  }`}
                >
                  <Icon path={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-3 py-4 md:px-4 lg:px-5 lg:py-6">
          {!(["list", "reports", "detail", "edit"] as PageKey[]).includes(activePage) && (
            <div className="mx-auto mb-5 w-full max-w-screen-2xl">
              <PageHeader
                title={activePage === "audit" ? "ตรวจสอบครุภัณฑ์ประจำปี" : activePage === "record" ? "บันทึกข้อมูลครุภัณฑ์" : activeItem.label}
                description={pageDescriptions[activePage]}
                actions={activePage !== "record" && activePage !== "settings" ? (
                  <>
                    {permissions.canExport && (
                  <button
                    onClick={activePage === "dashboard" ? handleDashboardExport : () => setActivePage("reports")}
                    disabled={activePage === "dashboard" && isDashboardExporting}
                    className="rounded-md border border-white/15 bg-panel px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-panelSoft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activePage === "dashboard" && isDashboardExporting ? "กำลังสร้าง PDF..." : "ส่งออก"}
                  </button>
                    )}
                    {activePage !== "dashboard" && permissions.canCreate && <button onClick={handleGoToRecord} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amberSoft">บันทึกใหม่</button>}
                  </>
                ) : undefined}
              />
            </div>
          )}

          <div className="mx-auto w-full max-w-screen-2xl min-w-0">
            <PageContent
              activePage={activePage}
              assets={visibleAssets}
              annualInspections={annualInspections}
              activityLogs={activityLogs}
              permissions={permissions}
              users={users}
              selectedAsset={selectedAsset}
              onViewDetails={handleViewDetails}
              onEditAsset={handleEditAsset}
              onGoToRecord={handleGoToRecord}
              onCreateAsset={handleCreateAsset}
              onSaveAnnualInspection={handleSaveAnnualInspection}
              onCancelAnnualInspection={handleCancelAnnualInspection}
              onSaveAsset={handleSaveAsset}
              onSaveInspectionStatus={handleSaveInspectionStatus}
              onDeleteAsset={handleDeleteAsset}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onBackToList={handleBackToList}
              onViewAllAssets={() => {
                setSelectedAsset(null);
                setActivePage("list");
              }}
              organizationItems={organizationItems}
              onOrganizationItemsChange={setOrganizationItems}
              locationItems={locationItems}
              onLocationItemsChange={setLocationItems}
              equipmentTypeItems={equipmentTypeItems}
              onEquipmentTypeItemsChange={setEquipmentTypeItems}
              roles={roles}
              onRolesChange={setRoles}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
