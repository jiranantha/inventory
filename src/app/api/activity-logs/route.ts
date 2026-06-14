import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToActivityLog } from "@/db/mappers";
import { activityLogs } from "@/db/schema";
import { jsonError, requirePermission, requireUser } from "@/lib/auth-helpers";
import type { ActivityLog } from "@/types";

type ActivityLogInput = Omit<ActivityLog, "id" | "createdAt">;

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/activity-logs — recent audit entries (newest first).
export async function GET() {
  try {
    await requirePermission("view");
    const rows = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(500);
    return NextResponse.json({ activityLogs: rows.map(rowToActivityLog) });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/activity-logs — append a log entry (generic; asset/inspection routes
// write their own logs transactionally, this is the fallback path).
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as ActivityLogInput;
    const [inserted] = await db
      .insert(activityLogs)
      .values({
        userName: body.userName || user.name,
        actionType: body.actionType,
        targetId: body.targetId,
        targetTable: "assets",
        detail: body.detail,
        oldValue: body.oldValue,
        newValue: body.newValue,
        note: body.note ?? null,
      })
      .returning();
    return NextResponse.json({ log: rowToActivityLog(inserted) });
  } catch (error) {
    return jsonError(error);
  }
}
