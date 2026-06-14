import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rowToAppUser } from "@/db/mappers";
import { users } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import type { AppUser } from "@/lib/permissions";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/users — all users (Admin only).
export async function GET() {
  try {
    await requirePermission("manageUsers");
    const rows = await db.select().from(users).orderBy(asc(users.createdAt));
    return NextResponse.json({ users: rows.map(rowToAppUser) });
  } catch (error) {
    return jsonError(error);
  }
}

// POST /api/users — pre-provision a user by email (Admin only). On their first
// Google sign-in the OAuth account links to this row (verified-email linking).
export async function POST(request: Request) {
  try {
    await requirePermission("manageUsers");
    const body = (await request.json()) as Partial<AppUser> & { email: string };
    const email = body.email?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "ต้องระบุอีเมล" }, { status: 400 });

    try {
      const [inserted] = await db
        .insert(users)
        .values({
          name: body.name ?? email,
          email,
          role: body.role ?? null,
          organization: body.organization ?? "-",
          active: body.active ?? false,
          viewerCanExport: body.viewerCanExport ?? false,
        })
        .returning();
      return NextResponse.json({ user: rowToAppUser(inserted) });
    } catch {
      return NextResponse.json({ error: "อีเมลนี้มีผู้ใช้งานอยู่แล้ว" }, { status: 409 });
    }
  } catch (error) {
    return jsonError(error);
  }
}
