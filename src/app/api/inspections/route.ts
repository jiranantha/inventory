import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionToColumns, rowToActivityLog, rowToInspection } from "@/db/mappers";
import { activityLogs, annualInspections } from "@/db/schema";
import { AuthError, jsonError, requirePermission } from "@/lib/auth-helpers";
import { hasPermission } from "@/lib/permissions";
import type { ActivityLog, AnnualInspection } from "@/types";

type ActivityLogInput = Omit<ActivityLog, "id" | "createdAt">;

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/inspections — all annual inspections (asset visibility is already
// scoped by /api/assets; the audit view joins them client-side).
export async function GET() {
  try {
    await requirePermission("view");
    const rows = await db.select().from(annualInspections).orderBy(desc(annualInspections.inspectionYear));
    return NextResponse.json({ inspections: rows.map(rowToInspection) });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/inspections — upsert one inspection per (asset, fiscal year).
// Creating a NEW inspection only needs canInspect; overwriting one that's
// already on file (the "แก้ไขข้อมูลการตรวจสอบ" action for an already-inspected
// asset) additionally needs canEditInspection (admin-only) — enforced here so
// the restriction holds even if a request bypasses the UI's hidden button.
export async function POST(request: Request) {
  try {
    const { user, roles } = await requirePermission("inspect");
    const body = (await request.json()) as { inspection: AnnualInspection };
    const columns = inspectionToColumns(body.inspection);

    const [existing] = await db
      .select({ id: annualInspections.id })
      .from(annualInspections)
      .where(and(eq(annualInspections.assetId, columns.assetId), eq(annualInspections.inspectionYear, columns.inspectionYear)));
    if (existing && !hasPermission({ role: user.role as string, viewerCanExport: user.viewerCanExport }, "editInspection", undefined, roles)) {
      throw new AuthError(403, "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขผลตรวจสอบที่บันทึกไว้แล้วได้");
    }

    const [row] = await db
      .insert(annualInspections)
      .values(columns)
      .onConflictDoUpdate({
        target: [annualInspections.assetId, annualInspections.inspectionYear],
        set: {
          assetCode: columns.assetCode,
          inspectionDate: columns.inspectionDate,
          foundLocation: columns.foundLocation,
          inspectorName: columns.inspectorName,
          result: columns.result,
          evidenceFileNames: columns.evidenceFileNames,
          evidenceImages: columns.evidenceImages,
          note: columns.note,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ inspection: rowToInspection(row) });
  } catch (error) {
    return jsonError(error);
  }
}

// DELETE /api/inspections — cancel one inspection (by asset + year), with log.
// Admin-only (canEditInspection): canceling an already-saved inspection is a
// form of editing it, same gate as overwriting one via POST above. Enforced
// here independently of the UI, which also only shows the cancel action to
// admins — a direct request without that role is rejected before any data
// is touched.
export async function DELETE(request: Request) {
  try {
    const { user } = await requirePermission("editInspection");
    const body = (await request.json()) as {
      assetId: number;
      inspectionYear: number | string;
      log?: ActivityLogInput;
    };
    const year = Number(body.inspectionYear);

    const result = await db.transaction(async (tx) => {
      await tx
        .delete(annualInspections)
        .where(
          and(eq(annualInspections.assetId, body.assetId), eq(annualInspections.inspectionYear, year)),
        );

      let log = null;
      if (body.log) {
        const [inserted] = await tx
          .insert(activityLogs)
          .values({
            userName: body.log.userName || user.name,
            actionType: body.log.actionType,
            targetId: body.assetId,
            targetTable: "assets",
            detail: body.log.detail,
            oldValue: body.log.oldValue,
            newValue: body.log.newValue,
            note: body.log.note ?? null,
          })
          .returning();
        log = inserted;
      }
      return { log };
    });

    return NextResponse.json({ ok: true, log: result.log ? rowToActivityLog(result.log) : null });
  } catch (error) {
    return jsonError(error);
  }
}
