import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToAppUser } from "@/db/mappers";
import { users } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import type { AppUser } from "@/lib/permissions";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// PATCH /api/users/:id — update role / organization / active / export flag / name.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("manageUsers");
    const { id } = await params;
    const body = (await request.json()) as Partial<AppUser>;

    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role || null;
    if (body.organization !== undefined) updates.organization = body.organization;
    if (body.active !== undefined) updates.active = body.active;
    if (body.viewerCanExport !== undefined) updates.viewerCanExport = body.viewerCanExport;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });

    return NextResponse.json({ user: rowToAppUser(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
