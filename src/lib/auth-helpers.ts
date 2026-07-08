import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { rowToRole } from "@/db/mappers";
import { roles as rolesTable } from "@/db/schema";
import {
  hasPermission,
  initialRoleDefinitions,
  type ApiAssetScope,
  type PermissionAction,
  type RoleDefinition,
} from "@/lib/permissions";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string | null;
  organization: string;
  active: boolean;
  viewerCanExport: boolean;
};

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role ?? null,
    organization: session.user.organization ?? "-",
    active: session.user.active ?? false,
    viewerCanExport: session.user.viewerCanExport ?? false,
  };
}

// Role definitions come from the DB (single source of truth) and fall back to
// the built-in defaults if the table is empty / unreachable.
// All roles are forced to canViewAllOrganizations: true — data visibility is
// controlled by action permissions (canEdit, canDelete, etc.), not org scope.
export async function loadRoleDefinitions(): Promise<RoleDefinition[]> {
  try {
    const rows = await db.select().from(rolesTable);
    if (rows.length) {
      return rows.map(rowToRole).map((r) => ({
        ...r,
        permissions: { ...r.permissions, canViewAllOrganizations: true },
      }));
    }
  } catch {
    // fall through to defaults
  }
  return initialRoleDefinitions;
}

// Any authenticated + approved user. Throws AuthError otherwise.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError(401, "ไม่ได้เข้าสู่ระบบ");
  if (!user.active || !user.role) throw new AuthError(403, "บัญชีรอการอนุมัติจากผู้ดูแลระบบ");
  return user;
}

// Authenticated, approved, AND authorized for `action` (optionally org-scoped).
export async function requirePermission(
  action: PermissionAction,
  scope?: ApiAssetScope,
): Promise<{ user: SessionUser; roles: RoleDefinition[] }> {
  const user = await requireUser();
  const roles = await loadRoleDefinitions();
  const allowed = hasPermission(
    { role: user.role as string, organization: user.organization, viewerCanExport: user.viewerCanExport },
    action,
    scope,
    roles,
  );
  if (!allowed) throw new AuthError(403, "ไม่มีสิทธิ์ดำเนินการนี้");
  return { user, roles };
}

// Converts thrown AuthErrors into JSON responses; everything else becomes a 500.
export function jsonError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[api] unhandled error", error);
  return NextResponse.json({ error: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
}
