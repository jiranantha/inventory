import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToActivityLog, rowToUnitResponsiblePerson } from "@/db/mappers";
import { activityLogs, assets, unitResponsiblePersons } from "@/db/schema";
import { jsonError, requirePermission, requireUser } from "@/lib/auth-helpers";
import { normalizeOrganizationName } from "@/lib/organizations";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/unit-responsible-persons — the "current responsible person" for every
// unit that has one set. Any approved user can read this (not admin-only) since
// /record and the Excel import preview use it to auto-fill fields for whichever
// unit the user picks.
export async function GET() {
  try {
    await requireUser();
    const rows = await db.select().from(unitResponsiblePersons);
    return NextResponse.json({ unitResponsiblePersons: rows.map(rowToUnitResponsiblePerson) });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/unit-responsible-persons — admin-only. Records the new "current"
// responsible person for a unit (upsert — one active row per organization,
// never a second row for the same unit) and, in the same transaction, rewrites
// responsiblePerson/responsiblePhone on every asset under that unit regardless
// of fiscal year. Only those two columns are touched.
export async function POST(request: Request) {
  try {
    const { user } = await requirePermission("bulkUpdateResponsible");
    const body = (await request.json()) as {
      organization: string;
      responsiblePerson: string;
      responsiblePhone?: string;
      note?: string;
    };

    const organization = normalizeOrganizationName(body.organization?.trim() ?? "");
    const responsiblePerson = body.responsiblePerson?.trim() ?? "";
    const responsiblePhone = body.responsiblePhone?.trim() || "-";
    const note = body.note?.trim() || "-";

    if (!organization) return NextResponse.json({ error: "กรุณาเลือกหน่วยงาน" }, { status: 400 });
    if (!responsiblePerson) return NextResponse.json({ error: "กรุณาระบุชื่อผู้รับผิดชอบใหม่" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      // Snapshot the distinct old responsible-person values before overwriting them,
      // so the activity log can show what changed (best-effort — asset rows under a
      // unit are not always all the same to begin with).
      const affectedBefore = await tx
        .select({ responsiblePerson: assets.responsiblePerson, responsiblePhone: assets.responsiblePhone })
        .from(assets)
        .where(and(eq(assets.organization, organization), isNull(assets.deletedAt)));
      const oldSummary = [...new Set(affectedBefore.map((row) => `${row.responsiblePerson} (${row.responsiblePhone})`))].join(", ") || "ไม่มีครุภัณฑ์ในหน่วยงานนี้";

      const [savedUnit] = await tx
        .insert(unitResponsiblePersons)
        .values({ organization, responsiblePerson, responsiblePhone, note })
        .onConflictDoUpdate({
          target: unitResponsiblePersons.organization,
          set: { responsiblePerson, responsiblePhone, note, isActive: true, updatedAt: new Date() },
        })
        .returning();

      const updatedAssets = await tx
        .update(assets)
        .set({ responsiblePerson, responsiblePhone, updatedAt: new Date() })
        .where(and(eq(assets.organization, organization), isNull(assets.deletedAt)))
        .returning({ id: assets.id });

      const [log] = await tx
        .insert(activityLogs)
        .values({
          userName: user.name,
          actionType: "อัปเดตผู้รับผิดชอบ",
          targetId: 0,
          targetTable: "assets",
          detail: `เปลี่ยนผู้รับผิดชอบของหน่วยงาน "${organization}" จำนวน ${updatedAssets.length} รายการ`,
          oldValue: `ผู้รับผิดชอบเดิม: ${oldSummary}`,
          newValue: `ผู้รับผิดชอบ: ${responsiblePerson}, เบอร์โทร: ${responsiblePhone}`,
          note: note !== "-" ? note : null,
        })
        .returning();

      return { savedUnit, updatedCount: updatedAssets.length, log };
    });

    return NextResponse.json({
      unitResponsiblePerson: rowToUnitResponsiblePerson(result.savedUnit),
      updatedCount: result.updatedCount,
      log: rowToActivityLog(result.log),
    });
  } catch (error) {
    return jsonError(error);
  }
}
