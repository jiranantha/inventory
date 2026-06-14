import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterData, organizations } from "@/db/schema";
import { jsonError, requirePermission, requireUser } from "@/lib/auth-helpers";
import { getOrganizationType } from "@/lib/organizations";
import type { MasterDataItem } from "@/types";

type Category = "organization" | "location" | "equipment_type";

async function readAll() {
  const [orgRows, locationRows, typeRows] = await Promise.all([
    db.select().from(organizations).orderBy(asc(organizations.name)),
    db.select().from(masterData).where(eq(masterData.category, "location")).orderBy(asc(masterData.name)),
    db.select().from(masterData).where(eq(masterData.category, "equipment_type")).orderBy(asc(masterData.name)),
  ]);
  return {
    organizations: orgRows.map<MasterDataItem>((r) => ({ id: r.id, name: r.name, active: r.active })),
    locations: locationRows.map<MasterDataItem>((r) => ({ id: r.id, name: r.name, active: r.active })),
    equipmentTypes: typeRows.map<MasterDataItem>((r) => ({ id: r.id, name: r.name, active: r.active })),
  };
}

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// GET /api/master-data — organizations + locations + equipment types.
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json(await readAll());
  } catch (error) {
    return jsonError(error);
  }
}

// PUT /api/master-data — replace one category's items (Admin only). Replace-all
// is safe because assets reference organizations by name, not by id.
export async function PUT(request: Request) {
  try {
    await requirePermission("manageUsers");
    const body = (await request.json()) as { category: Category; items: MasterDataItem[] };
    const items = body.items.filter((item) => item.name?.trim());

    await db.transaction(async (tx) => {
      if (body.category === "organization") {
        await tx.delete(organizations);
        if (items.length) {
          await tx.insert(organizations).values(
            items.map((item) => ({
              name: item.name.trim(),
              type: getOrganizationType(item.name.trim()),
              active: item.active,
            })),
          );
        }
      } else {
        await tx.delete(masterData).where(eq(masterData.category, body.category));
        if (items.length) {
          await tx.insert(masterData).values(
            items.map((item) => ({
              category: body.category,
              name: item.name.trim(),
              active: item.active,
            })),
          );
        }
      }
    });

    return NextResponse.json(await readAll());
  } catch (error) {
    return jsonError(error);
  }
}
