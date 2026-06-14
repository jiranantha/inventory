import { compressToBlob } from "@/lib/image-compression";
import type { EvidenceImage } from "@/types";

// Client helper: compress a selected photo, upload it to Supabase Storage via the
// /api/uploads route, and return the stored image (whose `url` is a public URL,
// not a base64 blob — keeping the database row small).
export async function uploadImage(file: File, folder: "assets" | "evidence"): Promise<EvidenceImage> {
  const { blob, name } = await compressToBlob(file);

  const form = new FormData();
  form.append("file", blob, name);
  form.append("folder", folder);

  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `อัปโหลดรูปภาพไม่สำเร็จ (${res.status})`);
  }
  const data = (await res.json()) as { name: string; url: string; size: number };
  return { name: data.name ?? name, url: data.url, size: data.size ?? blob.size };
}
