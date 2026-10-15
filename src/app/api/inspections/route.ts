import { and, desc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionToColumns, rowToActivityLog, rowToAsset, rowToInspection } from "@/db/mappers";
import { activityLogs, annualInspections, assets } from "@/db/schema";
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
//
// Canceling the LATEST inspection for an asset must restore the asset's
// usage status to whatever it should be without that inspection — not just
// leave the status/result it set sitting there as if it still applied. This
// runs the lookup, the delete, and the status write in one transaction so the
// asset can never be left half-updated:
//   1. If a newer inspection than the one being canceled still exists, that
//      newer one already governs the current status — leave status untouched.
//   2. Otherwise, only restore status if the asset's CURRENT status still
//      matches what this inspection set (asset.status === target.result). If
//      it doesn't, something changed the status independently afterward —
//      that's a conflict, so status is left alone and the admin is told to
//      resolve it manually rather than silently overwriting their change.
//   3. With no conflict: restore to the next-most-recent remaining
//      inspection's result, or — if this was the asset's only inspection —
//      the snapshot already captured in `previousStatus` when this
//      inspection was first created. If neither exists, there is nothing
//      reliable to restore to, so status is left untouched and the caller is
//      told explicitly rather than guessing a value.
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
      const [target] = await tx
        .select()
        .from(annualInspections)
        .where(and(eq(annualInspections.assetId, body.assetId), eq(annualInspections.inspectionYear, year)));
      if (!target) throw new AuthError(404, "ไม่พบผลการตรวจสอบที่ต้องการยกเลิก");

      const [asset] = await tx.select().from(assets).where(eq(assets.id, body.assetId));
      if (!asset) throw new AuthError(404, "ไม่พบครุภัณฑ์");

      // Every OTHER inspection year for this asset — used both to check for a
      // still-active newer inspection and to find the next-latest remaining
      // one to restore to. Fetched before the delete so "others" never
      // includes the row being removed.
      const others = await tx
        .select()
        .from(annualInspections)
        .where(and(eq(annualInspections.assetId, body.assetId), ne(annualInspections.inspectionYear, year)));

      await tx
        .delete(annualInspections)
        .where(and(eq(annualInspections.assetId, body.assetId), eq(annualInspections.inspectionYear, year)));

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

      // See the function-level comment above for the exact decision rules.
      const newerInspectionStillActive = others.some((item) => item.inspectionYear > year);
      let statusOutcome: "restored" | "preservedNewer" | "conflict" | "noSource" = "preservedNewer";
      let restoredStatus: string | null = null;

      if (!newerInspectionStillActive) {
        if (asset.status !== target.result) {
          statusOutcome = "conflict";
        } else {
          const nextLatest = others
            .filter((item) => item.inspectionYear < year)
            .sort((a, b) => b.inspectionYear - a.inspectionYear)[0];
          if (nextLatest) {
            restoredStatus = nextLatest.result;
            statusOutcome = "restored";
          } else if (target.previousStatus) {
            restoredStatus = target.previousStatus;
            statusOutcome = "restored";
          } else {
            statusOutcome = "noSource";
          }
        }
      }

      // The audit modal's note gets written into the shared asset.note field
      // on save (see handleSaveInspectionStatus client-side), so it's cleared
      // here regardless of the status outcome — otherwise a stale inspection
      // note keeps showing even after the inspection it came from is gone.
      const [updatedAsset] = await tx
        .update(assets)
        .set({
          note: "-",
          updatedAt: new Date(),
          ...(restoredStatus ? { status: restoredStatus, inspectionResult: restoredStatus } : {}),
        })
        .where(eq(assets.id, body.assetId))
        .returning();

      return { log, asset: updatedAsset, statusOutcome, restoredStatus };
    });

    return NextResponse.json({
      ok: true,
      log: result.log ? rowToActivityLog(result.log) : null,
      asset: rowToAsset(result.asset),
      statusOutcome: result.statusOutcome,
      restoredStatus: result.restoredStatus,
    });
  } catch (error) {
    return jsonError(error);
  }
}
