import { AssetListRow, PageKey } from "@/types";

// One real URL per screen. Each page in the app is now its own Next.js route
// instead of a branch inside a single switch-case component.
export const ROUTES = {
  dashboard: "/dashboard",
  list: "/list",
  audit: "/audit",
  record: "/record",
  reports: "/reports",
  settings: "/setting",
} as const;

// Where each sidebar menu entry should navigate to.
export const menuHref: Record<PageKey, string> = {
  dashboard: ROUTES.dashboard,
  list: ROUTES.list,
  audit: ROUTES.audit,
  record: ROUTES.record,
  reports: ROUTES.reports,
  settings: ROUTES.settings,
  detail: ROUTES.list,
  edit: ROUTES.list,
};

export const assetDetailHref = (asset: Pick<AssetListRow, "id">) => `/list/${asset.id}`;
export const assetEditHref = (asset: Pick<AssetListRow, "id">) => `/list/${asset.id}/edit`;

// Reverse-map the current pathname back to the logical page key so the shell
// (sidebar highlight, page header) can keep its existing per-page behaviour.
export function pageKeyFromPathname(pathname: string): PageKey {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/record")) return "record";
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/setting")) return "settings";
  if (/^\/list\/[^/]+\/edit/.test(pathname)) return "edit";
  if (/^\/list\/[^/]+/.test(pathname)) return "detail";
  if (pathname.startsWith("/list")) return "list";
  return "dashboard";
}
