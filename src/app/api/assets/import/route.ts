import { randomUUID } from "node:crypto";
import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { assetToColumns, rowToAsset } from "@/db/mappers";
import { activityLogs, assets } from "@/db/schema";
import { jsonError, requirePermission } from "@/lib/auth-helpers";
import { allowedAssetStatuses } from "@/constants/statuses";
import { normalizeNumberForMatch } from "@/lib/assets";
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
// Admin-only (see canImportAssets in src/lib/permissions.ts): the client only
// ever sends rows it classified as "ready" (genuinely new, unambiguous) during
// preview — "review" and "existing" rows are never submitted, by design (see
// buildAdminAssetImportPreview). Nothing here trusts that classification for
// the one thing that actually matters server-side though: whether the row
// already exists live in the database right now — the preview can go stale
// between when a file is checked and when the admin clicks confirm (another
// admin may have imported the same file in the meantime, or this exact file
// may be a re-upload — see requirement 8's idempotency rule), so that check
// is redone here against the current table, using the same normalized
// matching key buildAdminAssetImportPreview uses (requirement 13: preview and
// execution must apply the same rules).
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
      existingRows.map((row) => normalizeNumberForMatch(row.assetNumber)).filter((value) => value && value !== "-"),
    );
    const existingUniversityNumbers = new Set(
      existingRows.map((row) => normalizeNumberForMatch(row.universityAssetNumber)).filter((value) => value && value !== "-"),
    );

    let existingCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    const inserted: AssetListRow[] = [];
    const failedRows: { assetName: string; assetNumber: string; universityAssetNumber: string; error: string }[] = [];
    const toInsert: AssetListRow[] = [];
    const seenInThisBatch = new Set<string>();

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

      const normalizedAssetNumber = normalizeNumberForMatch(assetNumber);
      const normalizedUniversityNumber = normalizeNumberForMatch(universityAssetNumber);
      const existsAlready =
        (hasActivityNumber && existingAssetNumbers.has(normalizedAssetNumber)) ||
        (hasUniversityNumber && existingUniversityNumbers.has(normalizedUniversityNumber));
      if (existsAlready) {
        existingCount += 1;
        continue;
      }

      // Idempotency guard within this one request: if the exact same number
      // appears twice in what was submitted (e.g. a double-submitted click),
      // only the first copy inserts — the client only ever sends "ready"
      // rows, which by definition have no duplicate within the file, so this
      // only ever fires on an accidental double submission, not on genuine
      // distinct assets.
      const batchKey = hasActivityNumber ? `a:${normalizedAssetNumber}` : hasUniversityNumber ? `u:${normalizedUniversityNumber}` : null;
      if (batchKey) {
        if (seenInThisBatch.has(batchKey)) {
          existingCount += 1;
          continue;
        }
        seenInThisBatch.add(batchKey);
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
