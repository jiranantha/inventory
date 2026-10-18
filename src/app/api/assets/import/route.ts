import { randomUUID } from "node:crypto";
import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetToColumns, rowToAsset } from "@/db/mappers";
import { activityLogs, assets } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import { allowedAssetStatuses } from "@/constants/statuses";
import type { AssetListRow } from "@/types";

// Backstop only, not the expected runtime: chunked bulk inserts below bring a
// 150+ row import down to a handful of DB round trips, so this should finish
// in a few seconds. (Previously this route inserted one row — plus a second,
// separate activity-log row — per DB round trip; at ~150 rows that was 300+
// sequential awaits, which is what silently cut a real import off partway
// through once this route's old 30s maxDuration elapsed: whatever had already
// committed stayed in the database, but the response summarizing the result
// never made it back to the browser.)
export const maxDuration = 60;

// Rows insert in chunks, not one by one and not as a single all-or-nothing
// batch: a chunk-sized multi-row INSERT is still atomic, so one bad row in a
// chunk is retried row-by-row *within that chunk only* — large enough to cut
// round trips drastically, small enough that one bad row never blocks a big
// batch.
const CHUNK_SIZE = 25;

// POST /api/assets/import — bulk-insert asset rows from /setting's Excel importer.
// Admin-only (see canImportAssets in src/lib/permissions.ts): the client sends
// every row it classified as "ready" or "review" during preview (both get
// inserted — "review" just means the admin should double-check it afterward,
// e.g. a number shared with another row in the same file). Nothing here
// trusts that classification for the one thing that actually matters server-
// side though: whether the row already exists live in the database — the
// preview can go stale between when a file is checked and when the admin
// clicks confirm, so that check is redone here against the current table.
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

    let existingCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    const inserted: AssetListRow[] = [];
    const failedRows: { assetName: string; assetNumber: string; universityAssetNumber: string; error: string }[] = [];
    const toInsert: AssetListRow[] = [];

    // Pass 1: classify every row. A number shared by two rows *within this
    // same incoming batch* is intentionally NOT treated as a duplicate here
    // — the DB has no unique constraint on either number column, so both are
    // real, separate assets; the client already flagged that pair as
    // "review" for the admin to look at, this route's job is only to catch
    // rows that already exist live (requirement 6).
    for (const asset of incoming) {
      const assetNumber = (asset?.assetNumber ?? "").trim();
      const universityAssetNumber = (asset?.universityAssetNumber ?? "").trim();
      const name = (asset?.assetName ?? "").trim();
      const hasActivityNumber = Boolean(assetNumber && assetNumber !== "-");
      const hasUniversityNumber = Boolean(universityAssetNumber && universityAssetNumber !== "-");

      if (!name || !asset?.status || !allowedAssetStatuses.includes(asset.status)) {
        invalidCount += 1;
        continue;
      }

      const existsAlready =
        (hasActivityNumber && existingAssetNumbers.has(assetNumber)) ||
        (hasUniversityNumber && existingUniversityNumbers.has(universityAssetNumber));
      if (existsAlready) {
        existingCount += 1;
        continue;
      }

      toInsert.push(asset);
    }

    // Pass 2: bulk-insert in chunks of CHUNK_SIZE — a few round trips total
    // instead of one per row. assetCode is always regenerated here (not
    // trusted from the client) using a UUID so two rows can never collide on
    // it, even across overlapping import attempts.
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      const columnsList = chunk.map((asset) => ({ ...assetToColumns(asset), assetCode: `CMU-ASSET-IMPORT-${randomUUID()}` }));
      try {
        const rows = await db.insert(assets).values(columnsList).returning();
        rows.forEach((row) => inserted.push(rowToAsset(row)));
      } catch {
        // Something in this chunk failed — retry one row at a time so the
        // rest of the chunk still goes in, and the bad row is identifiable.
        for (let j = 0; j < chunk.length; j++) {
          try {
            const [row] = await db
              .insert(assets)
              .values({ ...columnsList[j], assetCode: `CMU-ASSET-IMPORT-${randomUUID()}` })
              .returning();
            inserted.push(rowToAsset(row));
          } catch (rowError) {
            errorCount += 1;
            failedRows.push({
              assetName: chunk[j].assetName,
              assetNumber: chunk[j].assetNumber,
              universityAssetNumber: chunk[j].universityAssetNumber ?? "-",
              error: rowError instanceof Error ? rowError.message : "insert failed",
            });
          }
        }
      }
    }

    // Activity log — one bulk insert for the whole batch, best-effort: a
    // logging failure must never undo asset rows that already committed.
    if (inserted.length) {
      try {
        await db.insert(activityLogs).values(
          inserted.map((row) => ({
            userName: user.name,
            actionType: "แก้ไข" as const,
            targetId: row.id,
            targetTable: "assets",
            detail: `นำเข้าข้อมูลครุภัณฑ์จาก Excel: ${row.assetCode}`,
            oldValue: "ยังไม่มีข้อมูลเดิม",
            newValue: `ชื่อ: ${row.assetName}, สถานะ: ${row.status}`,
          })),
        );
      } catch {
        // Logging failure shouldn't undo successful inserts.
      }
    }

    return NextResponse.json({
      inserted,
      summary: {
        totalRows: incoming.length,
        insertedCount: inserted.length,
        existingCount,
        invalidCount,
        errorCount,
        ...(failedRows.length ? { failedRows } : {}),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
