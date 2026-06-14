// Compress uploaded photos in the browser before they are uploaded to storage,
// to keep Supabase Storage usage small (free-tier friendly) while preserving
// enough detail to read the image clearly.
const MAX_DIMENSION = 1600; // longest edge, in pixels
const JPEG_QUALITY = 0.8; // 0..1 — high enough to keep details sharp

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`ไม่สามารถอ่านไฟล์ ${file.name} ได้`));
    reader.readAsDataURL(file);
  });

const loadImage = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"));
    image.src = dataUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));

export type CompressedImage = { blob: Blob; name: string };

/**
 * Resizes and re-encodes an image file to a compressed JPEG Blob ready to upload.
 * Falls back to the original file (which is itself a Blob) if the browser cannot
 * process it, or if compression does not actually reduce the size.
 */
export const compressToBlob = async (file: File): Promise<CompressedImage> => {
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const { width, height } = image;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas context unavailable");

    // White background so transparent PNGs flatten cleanly onto JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await canvasToBlob(canvas);
    if (blob && blob.size < file.size) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return { blob, name };
    }
  } catch {
    // Fall through to the original file below.
  }

  return { blob: file, name: file.name };
};
