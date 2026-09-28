import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToUnitResponsibleUpdateHistory } from "@/db/mappers";
import { activityLogs, assets, unitResponsibleUpdateHistory } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// POST /api/unit-responsible-persons/history/:id/rollback — admin-only.
// Restores responsiblePerson/responsiblePhone to their pre-update values on
// exactly the asset ids recorded in this history batch (not by re-matching on
// organization, which could also touch assets added/reassigned since), then
// marks the batch rolled back. A batch can only be rolled back once — the
// server re-checks this even though the UI also disables the button.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requirePermission("bulkUpdateResponsible");
    const { id } = await params;
    const historyId = Number(id);
    if (!Number.isInteger(historyId)) {
      return NextResponse.json({ error: "รหัสประวัติการอัปเดตไม่ถูกต้อง" }, { status: 400 });
    }

    const [history] = await db
      .select()
      .from(unitResponsibleUpdateHistory)
      .where(eq(unitResponsibleUpdateHistory.id, historyId));
    if (!history) return NextResponse.json({ error: "ไม่พบประวัติการอัปเดตนี้" }, { status: 404 });
    if (history.rolledBack) {
      return NextResponse.json({ error: "ประวัติการอัปเดตนี้ถูกย้อนกลับไปแล้ว" }, { status: 400 });
    }

    const affectedAssetIds = (history.affectedAssetIds ?? []) as number[];

    const updatedHistory = await db.transaction(async (tx) => {
      if (affectedAssetIds.length > 0) {
        await tx
          .update(assets)
          .set({
            responsiblePerson: history.oldResponsiblePerson,
            responsiblePhone: history.oldPhoneNumber,
            updatedAt: new Date(),
          })
          .where(inArray(assets.id, affectedAssetIds));
      }

      const [saved] = await tx
        .update(unitResponsibleUpdateHistory)
        .set({ rolledBack: true, rolledBackAt: new Date(), rolledBackBy: user.name })
        .where(eq(unitResponsibleUpdateHistory.id, historyId))
        .returning();

      await tx.insert(activityLogs).values({
        userName: user.name,
        actionType: "ย้อนกลับผู้รับผิดชอบ",
        targetId: 0,
        targetTable: "assets",
        detail: `ย้อนกลับผู้รับผิดชอบของหน่วยงาน "${history.unitName}" จำนวน ${affectedAssetIds.length} รายการ`,
        oldValue: `ผู้รับผิดชอบ: ${history.newResponsiblePerson}, เบอร์โทร: ${history.newPhoneNumber}`,
        newValue: `ผู้รับผิดชอบ: ${history.oldResponsiblePerson}, เบอร์โทร: ${history.oldPhoneNumber}`,
        note: null,
      });

      return saved;
    });

    return NextResponse.json({ history: rowToUnitResponsibleUpdateHistory(updatedHistory) });
  } catch (error) {
    return jsonError(error);
  }
}
