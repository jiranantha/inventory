"use client";

import { useEffect } from "react";

// Route-level error boundary. Without this, any exception thrown while rendering
// the app (e.g. malformed data from the API) unmounts the whole React tree and
// Next.js shows an opaque "Application error" with no message. This surfaces the
// real error text + digest and offers recovery instead of a blank screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App render error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <div className="max-w-lg rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[#0F172A]">เกิดข้อผิดพลาดในการแสดงผล</p>
        <p className="mt-2 break-words text-xs leading-relaxed text-[#64748B]">
          {error.message || "เกิดข้อผิดพลาดที่ไม่คาดคิด"}
        </p>
        {error.digest && (
          <p className="mt-1 text-[10px] text-[#94A3B8]">digest: {error.digest}</p>
        )}
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#1E293B]"
          >
            ลองใหม่
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-semibold text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
          >
            โหลดหน้าใหม่
          </button>
        </div>
      </div>
    </main>
  );
}
