import { NextResponse } from "next/server";
import { AuthError, jsonError, requireUser } from "@/lib/auth-helpers";
import { uploadImageToStorage } from "@/lib/supabase-storage";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB — generous; client already compresses.
const ALLOWED_FOLDERS = new Set(["assets", "evidence"]);

// POST /api/uploads — accepts a multipart "file" (and optional "folder"), stores
// it in Supabase Storage, and returns { name, url, size }. The URL is what gets
// persisted on the asset/inspection record.
export async function POST(request: Request) {
  try {
    await requireUser();

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AuthError(400, "ไม่พบไฟล์ที่อัปโหลด");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      throw new AuthError(400, "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WebP)");
    }
    if (file.size > MAX_SIZE) throw new AuthError(400, "ขนาดไฟล์ต้องไม่เกิน 8MB");

    const folderInput = String(form.get("folder") ?? "evidence");
    const folder = ALLOWED_FOLDERS.has(folderInput) ? folderInput : "evidence";

    const url = await uploadImageToStorage(file, folder);
    return NextResponse.json({ name: file.name, url, size: file.size });
  } catch (error) {
    return jsonError(error);
  }
}
