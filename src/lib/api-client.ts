import type { AppUser, RoleDefinition } from "@/lib/permissions";
import type { ActivityLog, AnnualInspection, AssetListRow, MasterDataItem } from "@/types";

export type ActivityLogInput = Omit<ActivityLog, "id" | "createdAt">;
export type MasterDataCategory = "organization" | "location" | "equipment_type";
export type MasterDataResponse = {
  organizations: MasterDataItem[];
  locations: MasterDataItem[];
  equipmentTypes: MasterDataItem[];
};

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `คำขอล้มเหลว (${res.status})`);
  }
  return (await res.json()) as T;
}

export const api = {
  // assets
  getAssets: () => req<{ assets: AssetListRow[] }>("/api/assets").then((r) => r.assets),
  createAsset: (asset: AssetListRow, log?: ActivityLogInput) =>
    req<{ asset: AssetListRow; log: ActivityLog | null }>("/api/assets", {
      method: "POST",
      body: JSON.stringify({ asset, log }),
    }),
  updateAsset: (id: number, asset: AssetListRow, log?: ActivityLogInput) =>
    req<{ asset: AssetListRow; log: ActivityLog | null }>(`/api/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify({ asset, log }),
    }),
  deleteAsset: (id: number, log?: ActivityLogInput) =>
    req<{ asset: AssetListRow; log: ActivityLog | null }>(`/api/assets/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ log }),
    }),

  // inspections
  getInspections: () =>
    req<{ inspections: AnnualInspection[] }>("/api/inspections").then((r) => r.inspections),
  saveInspection: (inspection: AnnualInspection) =>
    req<{ inspection: AnnualInspection }>("/api/inspections", {
      method: "POST",
      body: JSON.stringify({ inspection }),
    }).then((r) => r.inspection),
  deleteInspection: (assetId: number, inspectionYear: string | number, log?: ActivityLogInput) =>
    req<{ ok: true; log: ActivityLog | null }>("/api/inspections", {
      method: "DELETE",
      body: JSON.stringify({ assetId, inspectionYear, log }),
    }),

  // activity logs
  getActivityLogs: () =>
    req<{ activityLogs: ActivityLog[] }>("/api/activity-logs").then((r) => r.activityLogs),

  // users
  getUsers: () => req<{ users: AppUser[] }>("/api/users").then((r) => r.users),
  createUser: (user: Partial<AppUser> & { email: string }) =>
    req<{ user: AppUser }>("/api/users", { method: "POST", body: JSON.stringify(user) }).then(
      (r) => r.user,
    ),
  updateUser: (id: string, patch: Partial<AppUser>) =>
    req<{ user: AppUser }>(`/api/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }).then((r) => r.user),
  deleteUser: (id: string) =>
    req<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" }),

  // roles
  getRoles: () => req<{ roles: RoleDefinition[] }>("/api/roles").then((r) => r.roles),
  saveRoles: (roles: RoleDefinition[]) =>
    req<{ roles: RoleDefinition[] }>("/api/roles", {
      method: "PUT",
      body: JSON.stringify(roles),
    }).then((r) => r.roles),

  // master data
  getMasterData: () => req<MasterDataResponse>("/api/master-data"),
  saveMasterData: (category: MasterDataCategory, items: MasterDataItem[]) =>
    req<MasterDataResponse>("/api/master-data", {
      method: "PUT",
      body: JSON.stringify({ category, items }),
    }),
};
