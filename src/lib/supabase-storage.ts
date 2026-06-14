import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side Supabase Storage helper. Uses the service-role key (never exposed
// to the browser) so uploads bypass storage RLS. Images live in a single public
// bucket; only their public URL is stored in the database, keeping rows small.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "inventory-images";

let cachedClient: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage is not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

// Ensure the bucket exists (public). Cached per cold start so we only probe once.
let bucketReady: Promise<void> | null = null;
function ensureBucket(client: SupabaseClient): Promise<void> {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await client.storage.getBucket(STORAGE_BUCKET);
      if (data) return;
      const { error } = await client.storage.createBucket(STORAGE_BUCKET, { public: true });
      // Ignore races where a concurrent request already created it.
      if (error && !/already exists/i.test(error.message)) throw error;
    })().catch((error) => {
      // Reset so a transient failure can be retried on the next request.
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

const safeName = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-80) || "image";

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 * `folder` namespaces the object path (e.g. "assets" or "evidence").
 */
export async function uploadImageToStorage(
  file: File | Blob,
  folder: string,
): Promise<string> {
  const client = getClient();
  await ensureBucket(client);

  const originalName = file instanceof File ? file.name : "image.jpg";
  const path = `${folder}/${globalThis.crypto.randomUUID()}-${safeName(originalName)}`;

  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
