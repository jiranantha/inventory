import { inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { jsonError, loadRoleDefinitions, requirePermission, requireUser } from "@/lib/auth-helpers";
import type { RoleDefinition } from "@/lib/permissions";

// GET /api/roles — role definitions (every signed-in user needs these to compute
// their own permissions client-side).
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ roles: await loadRoleDefinitions() });
  } catch (error) {
    return jsonError(error);
  }
}

// PUT /api/roles — replace the role set (Admin only). Upserts every provided role
// and removes non-protected roles that are no longer present.
export async function PUT(request: Request) {
  try {
    await requirePermission("manageUsers");
    const body = (await request.json()) as RoleDefinition[];
    const providedKeys = body.map((role) => role.key);

    await db.transaction(async (tx) => {
      for (const role of body) {
        await tx
          .insert(roles)
          .values({
            key: role.key,
            name: role.name,
            description: role.description ?? "",
            permissions: role.permissions,
            allowExport: role.allowExport,
            active: role.active,
            protected: role.protected ?? false,
          })
          .onConflictDoUpdate({
            target: roles.key,
            set: {
              name: role.name,
              description: role.description ?? "",
              permissions: role.permissions,
              allowExport: role.allowExport,
              active: role.active,
            },
          });
      }
      const existing = await tx.select({ key: roles.key, protected: roles.protected }).from(roles);
      const toDelete = existing
        .filter((row) => !row.protected && !providedKeys.includes(row.key))
        .map((row) => row.key);
      if (toDelete.length) await tx.delete(roles).where(inArray(roles.key, toDelete));
    });

    return NextResponse.json({ roles: await loadRoleDefinitions() });
  } catch (error) {
    return jsonError(error);
  }
}
