"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { useAppData } from "@/components/AppDataProvider";
import { Icon, PageHeader } from "@/components/ui";
import { menuItems } from "@/constants/options";
import { menuHref, pageKeyFromPathname } from "@/lib/routes";
import { getRoleDefinition } from "@/lib/permissions";
import { PageKey } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

const SELF_HEADER_PAGES: PageKey[] = ["list", "detail", "edit"];

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
  const { lang, setLang, t } = useLanguage();

  const toggleLang = () => setLang(lang === "th" ? "en" : "th");

  const activePage = pageKeyFromPathname(pathname);

  const allowedMenuItems = menuItems.filter((item) => {
    if (item.key === "dashboard") return permissions.canViewDashboard;
    if (item.key === "list") return permissions.canViewList;
    if (item.key === "record") return permissions.canCreate;
    if (item.key === "audit") return permissions.canInspect;
    if (item.key === "settings") return permissions.canManageUsers;
    return true;
  });

  const navLabelMap: Record<string, string> = {
    dashboard: t("nav.dashboard"),
    list: t("nav.list"),
    audit: t("nav.audit"),
    record: t("nav.record"),
    settings: t("nav.settings"),
  };

  const activeItem = activePage === "detail"
    ? { label: t("det.title") }
    : activePage === "edit"
      ? { label: t("det.editBtn") }
      : (menuItems.find((item) => item.key === activePage) ?? menuItems[0]);

  const roleName = getRoleDefinition(currentUser.role, roles).name;

  const pageTitle =
    activePage === "audit" ? t("page.audit.title") :
    activePage === "record" ? t("page.record.title") :
    activePage === "settings" ? t("page.settings.title") :
    activePage === "dashboard" ? t("page.dashboard.title") :
    activeItem.label;

  const pageDesc =
    activePage === "audit" ? t("page.audit.desc") :
    activePage === "record" ? t("page.record.desc") :
    activePage === "settings" ? t("page.settings.desc") :
    activePage === "dashboard" ? t("page.dashboard.desc") :
    "";

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
            <h2 className="text-xl font-bold text-white">{t("app.delete.title")}</h2>
            <p className="mt-3 text-sm leading-6 text-ink">{t("app.delete.body")}</p>
            <p className="mt-3 rounded-md border border-line bg-slate-950/30 px-3 py-2 text-sm font-semibold text-white">
              {deleteTarget.assetNumber} · {deleteTarget.assetName}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={cancelDelete} className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">{t("app.delete.cancel")}</button>
              <button onClick={confirmDeleteAsset} className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400">{t("app.delete.confirm")}</button>
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#F0F8FF] p-3 lg:static lg:z-auto lg:min-h-screen lg:translate-x-0 lg:p-4 ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[#C3E3FD] bg-surface shadow-sm">

          <div className="flex shrink-0 items-center gap-2.5 border-b border-[#C3E3FD] px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold shadow-glow">
              <Icon path="M12 3l8 4v10l-8 4-8-4V7l8-4Zm0 0v18M4 7l8 4 8-4" />
            </div>
            <div className="group relative min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-ink">{t("app.name")}</p>
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {t("app.desc")}
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg p-1.5 text-ink hover:bg-surfaceSoft lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="ปิดเมนู"
            >
              <Icon path="M6 18L18 6M6 6l12 12" />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {allowedMenuItems.map((item) => {
              const active = item.key === activePage || (item.key === "list" && (activePage === "detail" || activePage === "edit"));
              return (
                <Link
                  key={item.key}
                  href={menuHref[item.key]}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-gold text-white shadow-glow"
                      : "text-ink hover:bg-[#E1F1FE]"
                  }`}
                >
                  <Icon path={item.icon} />
                  <span>{navLabelMap[item.key] ?? item.label}</span>
                </Link>
              );
            })}
          </nav>

        </div>
      </aside>

      {/* ── Right panel: Topbar + Content ─────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        <div className="sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-[#F0F8FF] px-3 py-2 lg:px-4 lg:py-3">
          <button
            className="shrink-0 rounded-xl border border-[#C3E3FD] bg-[#F0F8FF] p-2 text-ink transition hover:border-[#044377] hover:text-[#044377] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="เปิดเมนู"
          >
            <Icon path="M4 6h16M4 12h16M4 18h16" />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink lg:hidden">{t("app.name")}</span>
          <div className="hidden flex-1 lg:block" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleLang}
              title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
              className="flex items-center gap-1.5 rounded-xl border border-[#C3E3FD] bg-[#F0F8FF] px-3 py-2 text-xs font-semibold text-ink transition hover:border-[#044377] hover:text-[#044377]"
            >
              <Icon path="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <span>{lang === "th" ? "TH" : "EN"}</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-[#C3E3FD] bg-[#F0F8FF] px-3 py-2 transition hover:border-[#044377]"
              >
                <span className="hidden max-w-[140px] truncate text-sm font-semibold text-ink sm:block">
                  {currentUser.name}
                </span>
                <svg className="h-3.5 w-3.5 shrink-0 text-[#508ABA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[#C3E3FD] bg-white shadow-xl">
                  <div className="flex items-center gap-3 border-b border-[#E1F1FE] bg-[#F0F8FF] px-4 py-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#044377] text-sm font-extrabold text-white">
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{currentUser.name}</p>
                      <p className="text-xs text-[#508ABA]">{roleName}</p>
                      <p className="truncate text-xs text-[#508ABA]">{currentUser.organization}</p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setUserMenuOpen(false); onLogout(); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink transition hover:bg-[#F0F8FF] hover:text-[#044377]"
                    >
                      <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      {t("app.logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="min-w-0 flex-1 px-3 py-4 md:px-4 lg:px-6 lg:py-6">
          {!SELF_HEADER_PAGES.includes(activePage) && (
            <div className="mx-auto mb-5 w-full max-w-screen-2xl">
              <PageHeader
                title={pageTitle}
                description={pageDesc}
                actions={activePage !== "record" && activePage !== "settings" ? (
                  <>
                    {activePage !== "dashboard" && activePage !== "audit" && permissions.canCreate && (
                      <button onClick={onGoToRecord} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-primary-hover">{t("app.newRecord")}</button>
                    )}
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
