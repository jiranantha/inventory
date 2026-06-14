"use client";

import { signIn } from "next-auth/react";

// Full-screen status pages that are shown by app chrome (the data provider and
// the per-route permission guards) rather than belonging to any single page.

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[#1E40AF]">ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[#0F172A]">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm text-[#64748B]">เข้าสู่ระบบด้วยบัญชี Google ของคุณ</p>
        <button
          type="button"
          onClick={() => signIn("google")}
          className="mt-6 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-[#CBD5E1] bg-[#FFFFFF] px-4 py-3 text-sm font-bold text-[#0F172A] transition hover:bg-[#F8FAFC]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
            <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
          </svg>
          เข้าสู่ระบบด้วย Google
        </button>
        <p className="mt-4 text-xs leading-5 text-[#94A3B8]">
          บัญชีใหม่จะอยู่ในสถานะรอการอนุมัติ และจะใช้งานได้เมื่อผู้ดูแลระบบกำหนดบทบาทและเปิดใช้งานบัญชีแล้ว
        </p>
      </section>
    </main>
  );
}

export function PendingApprovalPage({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <section className="w-full max-w-[460px] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 text-center shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF3C7] text-2xl">⏳</div>
        <h1 className="mt-4 text-2xl font-extrabold text-[#0F172A]">บัญชีรอการอนุมัติ</h1>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          เข้าสู่ระบบด้วย <span className="font-semibold text-[#0F172A]">{email}</span> สำเร็จแล้ว
          แต่บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบเพื่อกำหนดบทบาทและเปิดใช้งานบัญชี
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 w-full rounded-md border border-[#1E40AF] bg-[#1E40AF] px-4 py-3 font-extrabold text-[#FFFFFF] transition hover:bg-[#1D4ED8]"
        >
          ออกจากระบบ
        </button>
      </section>
    </main>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            พื้นที่โครงสร้างสำหรับหน้า {title} เตรียมไว้สำหรับเพิ่มฟอร์ม ตาราง ตัวกรอง และการเชื่อมต่อฐานข้อมูลในขั้นต่อไป
          </p>
        </div>
        <button className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-orange/90">
          จัดการข้อมูล
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["ข้อมูลหลัก", "สถานะงาน", "บันทึกล่าสุด"].map((label) => (
          <div key={label} className="rounded-lg border border-line bg-surfaceSoft p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-3 text-lg font-bold text-white">พร้อมกำหนดรายละเอียด</p>
          </div>
        ))}
      </div>
    </section>
  );
}
