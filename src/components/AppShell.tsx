"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { Icon, PageHeader } from "@/components/ui";
import { menuItems, pageDescriptions } from "@/constants/options";
import { menuHref, pageKeyFromPathname } from "@/lib/routes";
import { getRoleDefinition } from "@/lib/permissions";
import { PageKey } from "@/types";

// Pages that render their own header/toolbar, so the shell skips the shared one.
const SELF_HEADER_PAGES: PageKey[] = ["list", "detail", "edit"];

// The persistent chrome (header, sidebar, toast, delete modal) wrapped around
// every authenticated route. Lives in the layout so it survives navigation.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const {
    currentUser,
    permissions,
    roles,
    toast,
    deleteTarget,
    isDashboardExporting,
    confirmDeleteAsset,
    cancelDelete,
    onGoToRecord,
    onDashboardExport,
    onLogout,
  } = useAppData();

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

  return (
    <main className="asset-shell min-h-screen w-full max-w-full overflow-x-hidden font-thai text-ink transition-colors duration-200">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-primary/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-primary shadow-glow">
          {toast}
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
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
      <header className="sticky top-0 z-20 border-b border-line bg-navy/90 backdrop-blur">
        <div className="flex min-h-20 items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold text-slate-950 shadow-glow sm:h-12 sm:w-12">
            <Icon path="M12 3l8 4v10l-8 4-8-4V7l8-4Zm0 0v18M4 7l8 4 8-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-sm font-extrabold leading-5 text-white sm:text-lg md:text-2xl">
              ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา
            </h1>
            <p className="mt-1 hidden text-sm text-muted sm:block md:text-base">
              ระบบบริหารจัดการครุภัณฑ์ ฝ่าย/ชมรม มหาวิทยาลัยเชียงใหม่
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-line bg-surface p-1.5 text-sm sm:px-2 sm:py-2 md:gap-3 md:px-3">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-white">{currentUser.name}</p>
              <p className="max-w-[220px] truncate text-xs text-primary">{getRoleDefinition(currentUser.role, roles).name} · {currentUser.organization}</p>
            </div>
            <button onClick={onLogout} className="min-h-10 rounded-md border border-line px-2 py-2 text-xs font-semibold text-ink hover:border-primary hover:text-primary sm:px-3">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="grid w-full min-w-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-line bg-slate-950/30 p-3 lg:min-h-[calc(100vh-80px)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {allowedMenuItems.map((item) => {
              const active = item.key === activePage || (item.key === "list" && (activePage === "detail" || activePage === "edit"));
              return (
                <Link
                  key={item.key}
                  href={menuHref[item.key]}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-gold text-blue-800 shadow-glow"
                      : "bg-surface text-ink ring-1 ring-line hover:bg-surfaceSoft hover:text-white"
                  }`}
                >
                  <Icon path={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-3 py-4 md:px-4 lg:px-5 lg:py-6">
          {!SELF_HEADER_PAGES.includes(activePage) && (
            <div className="mx-auto mb-5 w-full max-w-screen-2xl">
              <PageHeader
                title={activePage === "audit" ? "ตรวจสอบครุภัณฑ์ประจำปี" : activePage === "record" ? "บันทึกข้อมูลครุภัณฑ์" : activeItem.label}
                description={pageDescriptions[activePage]}
                actions={activePage !== "record" && activePage !== "settings" ? (
                  <>
                    {permissions.canExport && activePage === "dashboard" && (
                      <button
                        onClick={onDashboardExport}
                        disabled={isDashboardExporting}
                        className="rounded-md border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surfaceSoft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isDashboardExporting ? "กำลังสร้าง PDF..." : "ส่งออก"}
                      </button>
                    )}
                    {activePage !== "dashboard" && permissions.canCreate && <button onClick={onGoToRecord} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-primary-hover">บันทึกใหม่</button>}
                  </>
                ) : undefined}
              />
            </div>
          )}

          <div className="mx-auto w-full max-w-screen-2xl min-w-0">{children}</div>
        </section>
      </div>
    </main>
  );
}
