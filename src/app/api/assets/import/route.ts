import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetToColumns, rowToAsset } from "@/db/mappers";
import { activityLogs, assets } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import { allowedAssetStatuses } from "@/constants/statuses";
import type { AssetListRow } from "@/types";

// Backstop: surface an error within 30s instead of burning Vercel's 300s max
// when a DB query stalls (statement_timeout in src/db bounds the query itself).
export const maxDuration = 30;

// POST /api/assets/import — bulk-insert asset rows from /setting's Excel importer.
// Admin-only (see canImportAssets in src/lib/permissions.ts): the client only ever
// sends rows it already classified as "ready" during preview, but nothing here
// trusts that classification — every row is re-validated and re-checked for
// duplicates against the LIVE database, because the preview can go stale between
// when a file is checked and when the admin clicks confirm (another admin may have
// imported or edited data in the meantime). Rows insert one at a time (not one big
// transaction) so a single bad row can't roll back the rest of a large batch.
export async function POST(request: Request) {
  try {
    const { user } = await requirePermission("importAssets");
    const body = (await request.json()) as { assets?: AssetListRow[] };
    const incoming = Array.isArray(body.assets) ? body.assets : [];

    const existingRows = await db
      .select({ assetNumber: assets.assetNumber, universityAssetNumber: assets.universityAssetNumber })
      .from(assets)
      .where(isNull(assets.deletedAt));

    const existingAssetNumbers = new Set(
      existingRows.map((row) => row.assetNumber.trim()).filter((value) => value && value !== "-"),
    );
    const existingUniversityNumbers = new Set(
      existingRows.map((row) => row.universityAssetNumber.trim()).filter((value) => value && value !== "-"),
    );
    const seenAssetNumbers = new Set<string>();
    const seenUniversityNumbers = new Set<string>();

    let duplicateCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    const inserted: AssetListRow[] = [];

    for (const asset of incoming) {
      const assetNumber = (asset?.assetNumber ?? "").trim();
      const universityAssetNumber = (asset?.universityAssetNumber ?? "").trim();
      const name = (asset?.assetName ?? "").trim();
      const hasActivityNumber = Boolean(assetNumber && assetNumber !== "-");
      const hasUniversityNumber = Boolean(universityAssetNumber && universityAssetNumber !== "-");

      if (!name || !asset?.status || !allowedAssetStatuses.includes(asset.status) || (!hasActivityNumber && !hasUniversityNumber)) {
        invalidCount += 1;
        continue;
      }

      const duplicateAssetNumber = hasActivityNumber && (existingAssetNumbers.has(assetNumber) || seenAssetNumbers.has(assetNumber));
      const duplicateUniversityNumber = hasUniversityNumber && (existingUniversityNumbers.has(universityAssetNumber) || seenUniversityNumbers.has(universityAssetNumber));
      if (duplicateAssetNumber || duplicateUniversityNumber) {
        duplicateCount += 1;
        continue;
      }

      if (hasActivityNumber) seenAssetNumbers.add(assetNumber);
      if (hasUniversityNumber) seenUniversityNumbers.add(universityAssetNumber);

      try {
        const columns = assetToColumns(asset);
        const assetCode = columns.assetCode?.trim() || `CMU-ASSET-IMPORT-${Date.now()}-${inserted.length}`;
        const [row] = await db.insert(assets).values({ ...columns, assetCode }).returning();
        inserted.push(rowToAsset(row));
        try {
          await db.insert(activityLogs).values({
            userName: user.name,
            actionType: "แก้ไข",
            targetId: row.id,
            targetTable: "assets",
            detail: `นำเข้าข้อมูลครุภัณฑ์จาก Excel: ${row.assetCode}`,
            oldValue: "ยังไม่มีข้อมูลเดิม",
            newValue: `ชื่อ: ${row.assetName}, สถานะ: ${row.status}`,
          });
        } catch {
          // Logging failure shouldn't undo a successful insert.
        }
      } catch {
        errorCount += 1;
      }
    }

    return NextResponse.json({
      inserted,
      summary: {
        totalRows: incoming.length,
        insertedCount: inserted.length,
        duplicateCount,
        invalidCount,
        errorCount,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
