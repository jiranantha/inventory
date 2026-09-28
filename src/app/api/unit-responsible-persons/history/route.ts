import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToUnitResponsibleUpdateHistory } from "@/db/mappers";
import { unitResponsibleUpdateHistory } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/unit-responsible-persons/history — admin-only. Every bulk
// "เปลี่ยนผู้รับผิดชอบของหน่วยงาน" batch, newest first — backs the
// "ประวัติการอัปเดตผู้รับผิดชอบ" table and its rollback action in /setting.
export async function GET() {
  try {
    await requirePermission("bulkUpdateResponsible");
    const rows = await db
      .select()
      .from(unitResponsibleUpdateHistory)
      .orderBy(desc(unitResponsibleUpdateHistory.updatedAt));
    return NextResponse.json({ history: rows.map(rowToUnitResponsibleUpdateHistory) });
  } catch (error) {
    return jsonError(error);
  }
}
