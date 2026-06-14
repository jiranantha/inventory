import type { AssetListRow } from "@/types";

export type UserRole = string;

export type Permissions = {
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

export type RoleDefinition = {
  key: UserRole;
  name: string;
  description: string;
  permissions: Permissions;
  allowExport: boolean;
  active: boolean;
  protected?: boolean;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization: string;
  viewerCanExport: boolean;
  active: boolean;
};

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "inspect"
  | "manageUsers";

export type ApiUser = {
  role: UserRole;
  organization?: string;
  viewerCanExport?: boolean;
};

export type ApiAssetScope = {
  organization?: string;
};

export const noPermissions: Permissions = {
  canViewDashboard: false, canViewList: false, canCreate: false, canEdit: false, canDelete: false, canExport: false,
  canInspect: false, canViewReports: false, canManageUsers: false, canViewAllOrganizations: true,
  canEditLimitedFields: false,
};

export const initialRoleDefinitions: RoleDefinition[] = [
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

// Reference list of the seed roles' intended users. Real users now arrive via
// Google OAuth and are persisted in the database; this is kept only as
// documentation of the default role assignments.
export const initialUsers: AppUser[] = [
  { id: "seed-admin", name: "ผู้ดูแลระบบ", email: "admin@cmu.ac.th", role: "Admin", organization: "กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", viewerCanExport: true, active: true },
  { id: "seed-staff", name: "เจ้าหน้าที่พัสดุ", email: "staff@cmu.ac.th", role: "Staff", organization: "กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", viewerCanExport: true, active: true },
  { id: "seed-committee", name: "คณะกรรมการนักศึกษา", email: "committee@cmu.ac.th", role: "Committee", organization: "-", viewerCanExport: false, active: true },
  { id: "seed-viewer", name: "ผู้ดูรายงาน", email: "viewer@cmu.ac.th", role: "Viewer", organization: "-", viewerCanExport: false, active: true },
  { id: "seed-inspector", name: "ผู้ตรวจสอบ 1", email: "inspector1@cmu.ac.th", role: "Inspector", organization: "-", viewerCanExport: false, active: true },
];

export function getRoleDefinition(role: UserRole, roles: RoleDefinition[]) {
  return roles.find((item) => item.key === role) ?? roles.find((item) => item.key === "Viewer") ?? initialRoleDefinitions[4];
}

export function getPermissions(
  user: Pick<AppUser, "role" | "viewerCanExport">,
  roles: RoleDefinition[] = initialRoleDefinitions,
): Permissions {
  const role = getRoleDefinition(user.role, roles);
  return { ...role.permissions, canExport: role.permissions.canExport && user.viewerCanExport };
}

export function getPermissionLabel(permissions: Permissions) {
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

export function canAccessAsset(
  user: Pick<AppUser, "organization">,
  permissions: Permissions,
  asset: Pick<AssetListRow, "organization">,
) {
  return permissions.canViewAllOrganizations || asset.organization === user.organization;
}

// Maps an API-level action to the permission flag that authorises it. Keeping this
// here means the UI gates (getPermissions) and the API gate (hasPermission) are
// derived from the SAME role definitions and can never drift apart.
const ACTION_PERMISSION: Record<PermissionAction, keyof Permissions> = {
  view: "canViewList",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
  export: "canExport",
  inspect: "canInspect",
  manageUsers: "canManageUsers",
};

export function hasPermission(
  user: ApiUser,
  action: PermissionAction,
  scope?: ApiAssetScope,
  roles: RoleDefinition[] = initialRoleDefinitions,
): boolean {
  const permissions = getPermissions(
    { role: user.role, viewerCanExport: Boolean(user.viewerCanExport) },
    roles,
  );

  // Organisation scope: a role without canViewAllOrganizations may only act on its
  // own organisation's assets — same rule the UI enforces via canAccessAsset.
  if (!permissions.canViewAllOrganizations && scope?.organization && scope.organization !== user.organization) {
    return false;
  }

  return Boolean(permissions[ACTION_PERMISSION[action]]);
}
