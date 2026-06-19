"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { Icon, PageHeader } from "@/components/ui";
import { menuItems, pageDescriptions } from "@/constants/options";
import { menuHref, pageKeyFromPathname } from "@/lib/routes";
import { getRoleDefinition } from "@/lib/permissions";
import { PageKey } from "@/types";

const SELF_HEADER_PAGES: PageKey[] = ["list", "detail", "edit"];
const SYSTEM_DESCRIPTION = "ระบบบริหารจัดการครุภัณฑ์ ฝ่าย/ชมรม มหาวิทยาลัยเชียงใหม่";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return name.slice(0, 2);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    currentUser,
    permissions,
    roles,
    toast,
    deleteTarget,
    confirmDeleteAsset,
    cancelDelete,
    onGoToRecord,
    onLogout,
  } = useAppData();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [lang, setLang] = useState<"TH" | "EN">("TH");

  useEffect(() => {
    const saved = localStorage.getItem("appLang");
    if (saved === "TH" || saved === "EN") setLang(saved);
  }, []);

  const toggleLang = () => {
    const next = lang === "TH" ? "EN" : "TH";
    setLang(next);
    localStorage.setItem("appLang", next);
  };

  const activePage = pageKeyFromPathname(pathname);

  const allowedMenuItems = menuItems.filter((item) => {
    if (item.key === "dashboard") return permissions.canViewDashboard;
    if (item.key === "list") return permissions.canViewList;
    if (item.key === "record") return permissions.canCreate;
    if (item.key === "audit") return permissions.canInspect;
    if (item.key === "settings") return permissions.canManageUsers;
    return true;
  });

  const activeItem = activePage === "detail"
    ? { label: "รายละเอียดครุภัณฑ์" }
    : activePage === "edit"
      ? { label: "แก้ไขข้อมูลครุภัณฑ์" }
      : (menuItems.find((item) => item.key === activePage) ?? menuItems[0]);

  const roleName = getRoleDefinition(currentUser.role, roles).name;

  return (
    <main className="asset-shell flex min-h-screen w-full max-w-full font-thai text-ink">

      {/* Toast notification */}
      {toast && (
        <div className="fixed right-4 top-20 z-[70] rounded-lg border border-primary/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-primary shadow-glow">
          {toast}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-white">ยืนยันการลบข้อมูล</h2>
            <p className="mt-3 text-sm leading-6 text-ink">
              ต้องการลบครุภัณฑ์รายการนี้หรือไม่? ข้อมูลจะถูกเก็บไว้ในประวัติและสามารถตรวจสอบย้อนหลังได้
            </p>
            <p className="mt-3 rounded-md border border-line bg-slate-950/30 px-3 py-2 text-sm font-semibold text-white">
              {deleteTarget.assetNumber} · {deleteTarget.assetName}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={cancelDelete} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">ยกเลิก</button>
              <button onClick={confirmDeleteAsset} className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop: closes user menu on outside click */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
      )}

      {/* Backdrop: dims content when mobile sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left Sidebar ──────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-line bg-surface lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header: logo + shortened system name */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold shadow-glow">
            <Icon path="M12 3l8 4v10l-8 4-8-4V7l8-4Zm0 0v18M4 7l8 4 8-4" />
          </div>
          {/* System name with tooltip revealing the full description on hover */}
          <div className="group relative min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-ink">ระบบครุภัณฑ์นักศึกษา</p>
            <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-line bg-surface px-3 py-2.5 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {SYSTEM_DESCRIPTION}
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            className="shrink-0 rounded-md p-1.5 text-ink hover:bg-surfaceSoft lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="ปิดเมนู"
          >
            <Icon path="M6 18L18 6M6 6l12 12" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {allowedMenuItems.map((item) => {
            const active = item.key === activePage || (item.key === "list" && (activePage === "detail" || activePage === "edit"));
            return (
              <Link
                key={item.key}
                href={menuHref[item.key]}
                onClick={() => setSidebarOpen(false)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-gold text-white shadow-glow"
                    : "text-ink hover:bg-surfaceSoft"
                }`}
              >
                <Icon path={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Right panel: Topbar + Content ─────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-line bg-navy/90 px-4 backdrop-blur sm:px-6">

          {/* Hamburger button — mobile only */}
          <button
            className="mr-3 rounded-lg border border-line bg-surface p-2 text-ink transition hover:border-primary hover:text-primary lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" />
          </button>

          {/* System name shown in topbar on mobile (sidebar is hidden) */}
          <span className="text-sm font-extrabold text-ink lg:hidden">ระบบครุภัณฑ์นักศึกษา</span>

          <div className="flex-1" />

          {/* Right controls */}
          <div className="flex shrink-0 items-center gap-2">

            {/* Language switch — UI placeholder (no i18n system exists) */}
            <button
              onClick={toggleLang}
              title={lang === "TH" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary"
            >
              <Icon path="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <span>{lang}</span>
            </button>

            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5 transition hover:border-primary"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-[11px] font-extrabold text-white">
                  {getInitials(currentUser.name)}
                </div>
                <span className="hidden max-w-[140px] truncate text-sm font-semibold text-ink md:block">
                  {currentUser.name}
                </span>
                <Icon path="M19 9l-7 7-7-7" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
                  <div className="border-b border-line px-4 py-3">
                    <p className="font-bold text-ink">{currentUser.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{roleName}</p>
                    <p className="truncate text-xs text-muted">{currentUser.organization}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setUserMenuOpen(false); onLogout(); }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-surfaceSoft hover:text-primary"
                    >
                      <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <section className="min-w-0 flex-1 px-3 py-4 md:px-4 lg:px-6 lg:py-6">
          {!SELF_HEADER_PAGES.includes(activePage) && (
            <div className="mx-auto mb-5 w-full max-w-screen-2xl">
              <PageHeader
                title={activePage === "audit" ? "ตรวจสอบครุภัณฑ์ประจำปี" : activePage === "record" ? "บันทึกข้อมูลครุภัณฑ์" : activeItem.label}
                description={pageDescriptions[activePage]}
                actions={activePage !== "record" && activePage !== "settings" ? (
                  <>
{activePage !== "dashboard" && activePage !== "audit" && permissions.canCreate && <button onClick={onGoToRecord} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-primary-hover">บันทึกใหม่</button>}
                  </>
                ) : undefined}
              />
            </div>
          )}
          <div className="mx-auto min-w-0 w-full max-w-screen-2xl">{children}</div>
        </section>
      </div>
    </main>
  );
}
