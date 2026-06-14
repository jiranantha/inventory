export type UserRole = "Admin" | "Staff" | "Club Officer" | "Viewer";

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

export function hasPermission(user: ApiUser, action: PermissionAction, asset?: ApiAssetScope) {
  const sameOrganization = !asset?.organization || asset.organization === user.organization;

  if (user.role === "Admin") return true;

  if (user.role === "Staff") {
    return ["view", "create", "edit", "export", "inspect"].includes(action);
  }

  if (user.role === "Club Officer") {
    if (!sameOrganization) return false;
    return ["view", "inspect"].includes(action) || action === "edit";
  }

  if (user.role === "Viewer") {
    if (!sameOrganization) return false;
    return action === "view" || (action === "export" && Boolean(user.viewerCanExport));
  }

  return false;
}

