import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetToColumns, rowToActivityLog, rowToAsset } from "@/db/mappers";
import { activityLogs, assets, type AssetRow } from "@/db/schema";
import { AuthError, jsonError, requirePermission, type SessionUser } from "@/lib/auth-helpers";
import { getPermissions, type RoleDefinition } from "@/lib/permissions";
import type { ActivityLog, AssetListRow } from "@/types";

type ActivityLogInput = Omit<ActivityLog, "id" | "createdAt">;

// Enforces the same organization scope the UI applies via canAccessAsset.
function assertOrgAccess(user: SessionUser, roles: RoleDefinition[], asset: AssetRow) {
  const permissions = getPermissions(
    { role: user.role as string, viewerCanExport: user.viewerCanExport },
    roles,
  );
  if (!permissions.canViewAllOrganizations && asset.organization !== user.organization) {
    throw new AuthError(403, "ไม่มีสิทธิ์เข้าถึงครุภัณฑ์ขององค์กรอื่น");
  }
}

async function insertLog(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  log: ActivityLogInput | undefined,
  fallbackName: string,
  targetId: number,
) {
  if (!log) return null;
  const [inserted] = await tx
    .insert(activityLogs)
    .values({
      userName: log.userName || fallbackName,
      actionType: log.actionType,
      targetId,
      targetTable: "assets",
      detail: log.detail,
      oldValue: log.oldValue,
      newValue: log.newValue,
      note: log.note ?? null,
    })
    .returning();
  return inserted;
}

// PUT /api/assets/:id — update an asset (+ optional activity log).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assetId = Number(id);
    const { user, roles } = await requirePermission("edit");
    const body = (await request.json()) as { asset: AssetListRow; log?: ActivityLogInput };

    const [existing] = await db.select().from(assets).where(eq(assets.id, assetId));
    if (!existing) return NextResponse.json({ error: "ไม่พบครุภัณฑ์" }, { status: 404 });
    assertOrgAccess(user, roles, existing);

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assets)
        .set({ ...assetToColumns(body.asset), updatedAt: new Date() })
        .where(eq(assets.id, assetId))
        .returning();
      const log = await insertLog(tx, body.log, user.name, assetId);
      return { updated, log };
    });

    return NextResponse.json({
      asset: rowToAsset(result.updated),
      log: result.log ? rowToActivityLog(result.log) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}

// DELETE /api/assets/:id — soft delete (sets deleted_at / deleted_by).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assetId = Number(id);
    const { user, roles } = await requirePermission("delete");
    const body = (await request.json().catch(() => ({}))) as { log?: ActivityLogInput };

    const [existing] = await db.select().from(assets).where(eq(assets.id, assetId));
    if (!existing) return NextResponse.json({ error: "ไม่พบครุภัณฑ์" }, { status: 404 });
    assertOrgAccess(user, roles, existing);

    const now = new Date();
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(assets)
        .set({ deletedAt: now, deletedBy: user.name, updatedAt: now })
        .where(eq(assets.id, assetId))
        .returning();
      const log = await insertLog(tx, body.log, user.name, assetId);
      return { updated, log };
    });

    return NextResponse.json({
      asset: rowToAsset(result.updated),
      log: result.log ? rowToActivityLog(result.log) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
