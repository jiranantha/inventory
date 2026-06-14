import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionToColumns, rowToActivityLog, rowToInspection } from "@/db/mappers";
import { activityLogs, annualInspections } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
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
export async function POST(request: Request) {
  try {
    await requirePermission("inspect");
    const body = (await request.json()) as { inspection: AnnualInspection };
    const columns = inspectionToColumns(body.inspection);

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
export async function DELETE(request: Request) {
  try {
    const { user } = await requirePermission("inspect");
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
