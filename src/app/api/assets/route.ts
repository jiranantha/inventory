import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetToColumns, rowToActivityLog, rowToAsset } from "@/db/mappers";
import { activityLogs, assets } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import { getPermissions } from "@/lib/permissions";
import type { ActivityLog, AssetListRow } from "@/types";

type ActivityLogInput = Omit<ActivityLog, "id" | "createdAt">;

// GET /api/assets — list assets, scoped to the caller's organization unless their
// role can view all organizations. Includes soft-deleted rows; the client hides
// them but needs the full set for things like next-asset-number generation.
export async function GET() {
  try {
    const { user, roles } = await requirePermission("view");
    const permissions = getPermissions(
      { role: user.role as string, viewerCanExport: user.viewerCanExport },
      roles,
    );

    const rows = permissions.canViewAllOrganizations
      ? await db.select().from(assets).orderBy(desc(assets.id))
      : await db
          .select()
          .from(assets)
          .where(eq(assets.organization, user.organization))
          .orderBy(desc(assets.id));

    return NextResponse.json({ assets: rows.map(rowToAsset) });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/assets — create an asset (+ optional activity log) in one transaction.
export async function POST(request: Request) {
  try {
    const { user } = await requirePermission("create");
    const body = (await request.json()) as { asset: AssetListRow; log?: ActivityLogInput };
    const columns = assetToColumns(body.asset);

    const assetCode = columns.assetCode?.trim() || `CMU-ASSET-${Date.now()}`;

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(assets)
        .values({ ...columns, assetCode })
        .returning();

      let log = null;
      if (body.log) {
        const [insertedLog] = await tx
          .insert(activityLogs)
          .values({
            userName: body.log.userName || user.name,
            actionType: body.log.actionType,
            targetId: inserted.id,
            targetTable: "assets",
            detail: body.log.detail,
            oldValue: body.log.oldValue,
            newValue: body.log.newValue,
            note: body.log.note ?? null,
          })
          .returning();
        log = insertedLog;
      }
      return { inserted, log };
    });

    return NextResponse.json({
      asset: rowToAsset(result.inserted),
      log: result.log ? rowToActivityLog(result.log) : null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
