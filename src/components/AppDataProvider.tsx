"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { LoginPage, PendingApprovalPage } from "@/components/StatusPages";
import { api, type ActivityLogInput } from "@/lib/api-client";
import { formatThaiDateTimeWithSeconds } from "@/lib/dates";
import { exportDashboardToPDF } from "@/lib/import-export";
import { getOrganizationType, mergeOrganizationItems } from "@/lib/organizations";
import { assetDetailHref, assetEditHref, ROUTES } from "@/lib/routes";
import {
  AppUser,
  Permissions,
  RoleDefinition,
  canAccessAsset,
  getPermissions,
  initialRoleDefinitions,
} from "@/lib/permissions";
import { ActivityLog, AnnualInspection, AssetListRow, MasterDataItem, Organization } from "@/types";

// Everything every page needs, lifted out of the old single-page component and
// shared through context so navigating between routes never refetches the data.
type AppData = {
  currentUser: AppUser;
  permissions: Permissions;
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  activityLogs: ActivityLog[];
  users: AppUser[];
  roles: RoleDefinition[];
  organizationItems: MasterDataItem[];
  locationItems: MasterDataItem[];
  equipmentTypeItems: MasterDataItem[];
  activeOrganizations: Organization[];
  activeLocations: string[];
  activeEquipmentTypes: string[];
  isDashboardExporting: boolean;
  toast: string;
  deleteTarget: AssetListRow | null;
  showToast: (message: string) => void;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onGoToRecord: () => void;
  onCreateAsset: (asset: AssetListRow) => void;
  onSaveAnnualInspection: (inspection: AnnualInspection) => void;
  onCancelAnnualInspection: (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => void;
  onSaveAsset: (asset: AssetListRow, oldAsset: AssetListRow) => void;
  onSaveInspectionStatus: (asset: AssetListRow, status: string, inspectionDate: string, note: string) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
  confirmDeleteAsset: () => void;
  cancelDelete: () => void;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
  onBackToList: () => void;
  onViewAllAssets: () => void;
  onDashboardExport: () => void;
  onOrganizationItemsChange: (items: MasterDataItem[]) => void;
  onLocationItemsChange: (items: MasterDataItem[]) => void;
  onEquipmentTypeItemsChange: (items: MasterDataItem[]) => void;
  onRolesChange: (roles: RoleDefinition[]) => void;
  onLogout: () => void;
};

const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within <AppDataProvider>");
  return ctx;
}

function LoadingScreen({ message = "กำลังเตรียมระบบ..." }: { message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-4 text-sm font-semibold text-[#64748B] shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        {message}
      </div>
    </main>
  );
}

// Shown when the session never resolves (e.g. a stale cached bundle whose chunks
// 404 and silently break hydration, or a network/auth hiccup). Without this, the
// loading screen would hang indefinitely with no way out and no diagnostic.
function ConnectionErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 font-thai text-[#0F172A]">
      <div className="max-w-md rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold text-[#0F172A]">เชื่อมต่อระบบไม่สำเร็จ</p>
        <p className="mt-2 text-xs leading-relaxed text-[#64748B]">
          ระบบใช้เวลานานผิดปกติในการเตรียมข้อมูล อาจเกิดจากการเชื่อมต่อเครือข่ายหรือข้อมูลแคชเดิมของเบราว์เซอร์
          กรุณาโหลดหน้าใหม่อีกครั้ง
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#1E293B]"
        >
          โหลดใหม่อีกครั้ง
        </button>
      </div>
    </main>
  );
}

// How long the session may sit in "loading" before we surface an error instead
// of an endless spinner.
const SESSION_LOADING_TIMEOUT_MS = 15000;

// Gates the authenticated app on session state, then hands off to the data layer.
export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (status !== "loading") {
      setLoadingTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadingTimedOut(true), SESSION_LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "loading") {
    return loadingTimedOut ? (
      <ConnectionErrorScreen onRetry={() => window.location.reload()} />
    ) : (
      <LoadingScreen />
    );
  }
  if (!session?.user) return <LoginPage />;
  if (!session.user.active || !session.user.role) {
    return <PendingApprovalPage email={session.user.email ?? ""} onSignOut={() => signOut()} />;
  }
  return <AuthenticatedDataProvider sessionUser={session.user}>{children}</AuthenticatedDataProvider>;
}

function AuthenticatedDataProvider({ sessionUser, children }: { sessionUser: Session["user"]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const currentUser = useMemo<AppUser>(
    () => ({
      id: sessionUser.id,
      name: sessionUser.name ?? sessionUser.email ?? "ผู้ใช้งาน",
      email: sessionUser.email ?? "",
      role: sessionUser.role ?? "",
      organization: sessionUser.organization,
      viewerCanExport: sessionUser.viewerCanExport,
      active: sessionUser.active,
    }),
    [
      sessionUser.id,
      sessionUser.name,
      sessionUser.email,
      sessionUser.role,
      sessionUser.organization,
      sessionUser.viewerCanExport,
      sessionUser.active,
    ],
  );

  const [roles, setRoles] = useState<RoleDefinition[]>(initialRoleDefinitions);
  const [organizationItems, setOrganizationItems] = useState<MasterDataItem[]>([]);
  const [locationItems, setLocationItems] = useState<MasterDataItem[]>([]);
  const [equipmentTypeItems, setEquipmentTypeItems] = useState<MasterDataItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [assets, setAssets] = useState<AssetListRow[]>([]);
  const [annualInspections, setAnnualInspections] = useState<AnnualInspection[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AssetListRow | null>(null);
  const [toast, setToast] = useState("");
  const [isDashboardExporting, setIsDashboardExporting] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const permissions = getPermissions(currentUser, roles);

  // Initial data load from the backend.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assetsData, inspectionsData, rolesData, masterData, logsData] = await Promise.all([
          api.getAssets(),
          api.getInspections(),
          api.getRoles(),
          api.getMasterData(),
          api.getActivityLogs().catch(() => [] as ActivityLog[]),
        ]);
        if (cancelled) return;
        setAssets(assetsData);
        setAnnualInspections(inspectionsData);
        const filteredRoles = (rolesData.length ? rolesData : initialRoleDefinitions)
          .filter((r) => r.key !== "Inspector")
          .map((r) => ({ ...r, permissions: { ...r.permissions, canViewAllOrganizations: true } }));
        setRoles(filteredRoles);
        setOrganizationItems(mergeOrganizationItems(masterData.organizations));
        setLocationItems(masterData.locations);
        setEquipmentTypeItems(masterData.equipmentTypes);
        setActivityLogs(logsData);
      } catch (error) {
        if (!cancelled) {
          setToast(`โหลดข้อมูลไม่สำเร็จ: ${(error as Error).message}`);
          window.setTimeout(() => setToast(""), 4000);
        }
      } finally {
        if (!cancelled) setDataReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Admins additionally load the user list for the settings page.
  useEffect(() => {
    if (!permissions.canManageUsers) return;
    api.getUsers().then(setUsers).catch(() => undefined);
  }, [permissions.canManageUsers]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const prependLog = (log: ActivityLog | null) => {
    if (log) setActivityLogs((items) => [log, ...items]);
  };

  const handleViewDetails = (asset: AssetListRow) => {
    if (!canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์ดูข้อมูลครุภัณฑ์รายการนี้");
      return;
    }
    router.push(assetDetailHref(asset));
  };

  const handleEditAsset = (asset: AssetListRow) => {
    if (!(permissions.canEdit || permissions.canEditLimitedFields) || !canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์แก้ไขข้อมูลครุภัณฑ์รายการนี้");
      return;
    }
    router.push(assetEditHref(asset));
  };

  const handleGoToRecord = () => {
    router.push(ROUTES.record);
  };

  const handleDashboardExport = async () => {
    setIsDashboardExporting(true);
    showToast("กำลังสร้าง PDF...");
    try {
      await exportDashboardToPDF();
      showToast("ดาวน์โหลดไฟล์ PDF Dashboard แล้ว");
    } catch (error) {
      console.error(error);
      showToast("ไม่สามารถส่งออก PDF ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDashboardExporting(false);
    }
  };

  const handleSaveAsset = async (nextAsset: AssetListRow, oldAsset: AssetListRow) => {
    if (!(permissions.canEdit || permissions.canEditLimitedFields) || !canAccessAsset(currentUser, permissions, oldAsset)) {
      showToast("ไม่มีสิทธิ์บันทึกการแก้ไข");
      return;
    }
    const historyUpdatedAt = formatThaiDateTimeWithSeconds(new Date().toISOString());
    const savedAsset = permissions.canEditLimitedFields
      ? { ...oldAsset, location: nextAsset.location }
      : { ...nextAsset };
    const logInput: ActivityLogInput = {
      userName: currentUser.name,
      actionType: "แก้ไข",
      targetId: savedAsset.id,
      targetTable: "assets",
      detail: `แก้ไขข้อมูลครุภัณฑ์ ${savedAsset.assetName}`,
      oldValue: `ชื่อ: ${oldAsset.assetName}, หมายเลขครุภัณฑ์: ${oldAsset.assetNumber}, จัดซื้อในโครงการ: ${oldAsset.purchaseProject || "-"}, ตำแหน่งที่ประทับหมายเลขครุภัณฑ์: ${oldAsset.numberPlacement || "-"}, วันที่บันทึกข้อมูล: ${oldAsset.recordDate}, วันที่ได้รับครุภัณฑ์: ${oldAsset.purchaseMonth}, สถานะ: ${oldAsset.status}, สถานที่: ${oldAsset.location}`,
      newValue: `ชื่อ: ${savedAsset.assetName}, หมายเลขครุภัณฑ์: ${savedAsset.assetNumber}, จัดซื้อในโครงการ: ${savedAsset.purchaseProject || "-"}, ตำแหน่งที่ประทับหมายเลขครุภัณฑ์: ${savedAsset.numberPlacement || "-"}, วันที่บันทึกข้อมูล: ${savedAsset.recordDate}, วันที่ได้รับครุภัณฑ์: ${savedAsset.purchaseMonth}, สถานะ: ${savedAsset.status}, สถานที่: ${savedAsset.location}, updated_at: ${historyUpdatedAt}`,
    };
    try {
      const { asset: updated, log } = await api.updateAsset(savedAsset.id, savedAsset, logInput);
      setAssets((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      prependLog(log);
      showToast("บันทึกการแก้ไขและ activity_logs สำเร็จ");
      router.push(assetDetailHref(updated));
    } catch (error) {
      showToast(`บันทึกไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleSaveInspectionStatus = async (asset: AssetListRow, status: string, inspectionDate: string, note: string) => {
    const updatedAsset = { ...asset, status, latestInspectionDate: inspectionDate, inspectionResult: status, note: note || asset.note };
    try {
      const { asset: saved } = await api.updateAsset(asset.id, updatedAsset);
      setAssets((items) => items.map((item) => (item.id === saved.id ? saved : item)));
    } catch (error) {
      showToast(`บันทึกสถานะไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleSaveAnnualInspection = async (inspection: AnnualInspection) => {
    try {
      const saved = await api.saveInspection(inspection);
      setAnnualInspections((items) => [
        ...items.filter((item) => !(item.assetId === saved.assetId && item.inspectionYear === saved.inspectionYear)),
        saved,
      ]);
    } catch (error) {
      showToast(`บันทึกผลตรวจสอบไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleCancelAnnualInspection = async (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => {
    const previousStatus = inspection?.previousStatus;
    const logInput: ActivityLogInput = {
      userName: currentUser.name,
      actionType: "ยกเลิกผลตรวจ",
      targetId: asset.id,
      targetTable: "assets",
      detail: `ยกเลิกผลตรวจสอบประจำปี ${inspectionYear}`,
      oldValue: inspection
        ? `ปีตรวจสอบ: ${inspection.inspectionYear}, วันที่ตรวจสอบ: ${inspection.inspectionDate}, สถานะหลังตรวจ: ${inspection.result}`
        : `ปีตรวจสอบ: ${inspectionYear}`,
      newValue: previousStatus
        ? `ย้อนสถานะครุภัณฑ์จาก "${inspection?.result}" กลับเป็น "${previousStatus}"`
        : "ลบเฉพาะ annual_inspections ของปีที่เลือก",
      note: previousStatus ? "ย้อนสถานะครุภัณฑ์โดยอัตโนมัติ" : "ไม่ได้ย้อนสถานะครุภัณฑ์โดยอัตโนมัติ (ไม่มีข้อมูลสถานะก่อนหน้า)",
    };
    try {
      const { log } = await api.deleteInspection(asset.id, inspectionYear, logInput);
      setAnnualInspections((items) => items.filter((item) => !(item.assetId === asset.id && item.inspectionYear === inspectionYear)));
      prependLog(log);
      if (previousStatus) {
        const restoredAsset = { ...asset, status: previousStatus, inspectionResult: previousStatus };
        const { asset: saved } = await api.updateAsset(asset.id, restoredAsset);
        setAssets((items) => items.map((item) => (item.id === saved.id ? saved : item)));
      }
      showToast(`ยกเลิกผลตรวจสอบประจำปี ${inspectionYear} แล้ว`);
    } catch (error) {
      showToast(`ยกเลิกผลตรวจสอบไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleCreateAsset = async (asset: AssetListRow) => {
    if (!permissions.canCreate) {
      showToast("ไม่มีสิทธิ์เพิ่มข้อมูลครุภัณฑ์");
      return;
    }
    const logInput: ActivityLogInput = {
      userName: currentUser.name,
      actionType: "แก้ไข",
      targetId: 0,
      targetTable: "assets",
      detail: `เพิ่มข้อมูลครุภัณฑ์ ${asset.assetCode}`,
      oldValue: "ยังไม่มีข้อมูลเดิม",
      newValue: `ชื่อ: ${asset.assetName}, สถานะ: ${asset.status}, สถานที่: ${asset.location}`,
    };
    try {
      const { asset: created, log } = await api.createAsset(asset, logInput);
      setAssets((items) => [created, ...items]);
      prependLog(log);
      showToast("เพิ่มข้อมูลครุภัณฑ์ใหม่เรียบร้อยแล้ว");
    } catch (error) {
      showToast(`เพิ่มข้อมูลไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleDeleteAsset = (asset: AssetListRow) => {
    if (!permissions.canDelete || !canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์ลบข้อมูลครุภัณฑ์");
      return;
    }
    setDeleteTarget(asset);
  };

  const confirmDeleteAsset = async () => {
    if (!deleteTarget) return;
    if (!permissions.canDelete || !canAccessAsset(currentUser, permissions, deleteTarget)) {
      setDeleteTarget(null);
      showToast("ไม่มีสิทธิ์ลบข้อมูลครุภัณฑ์");
      return;
    }
    const target = deleteTarget;
    const logInput: ActivityLogInput = {
      userName: currentUser.name,
      actionType: "ลบ",
      targetId: target.id,
      targetTable: "assets",
      detail: `ลบข้อมูลครุภัณฑ์ ${target.assetName}`,
      oldValue: `หมายเลขครุภัณฑ์: ${target.assetNumber}, ชื่อ: ${target.assetName}, สถานะ: ${target.status}`,
      newValue: `soft delete โดย ${currentUser.name}`,
      note: "ลบแบบ soft delete เพื่อให้ตรวจสอบย้อนหลังได้",
    };
    try {
      const { asset: updated, log } = await api.deleteAsset(target.id, logInput);
      setAssets((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      prependLog(log);
      setDeleteTarget(null);
      showToast("ลบข้อมูลแบบ soft delete และบันทึก activity_logs แล้ว");
      // If we were looking at the asset we just deleted, fall back to the list.
      if (pathname.startsWith(`/list/${target.id}`)) {
        router.push(ROUTES.list);
      }
    } catch (error) {
      setDeleteTarget(null);
      showToast(`ลบข้อมูลไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleBackToList = () => {
    const returnUrl = sessionStorage.getItem("listReturnUrl");
    if (returnUrl?.startsWith("/list")) {
      sessionStorage.removeItem("listReturnUrl");
      router.push(returnUrl);
    } else {
      router.push(ROUTES.list);
    }
  };

  const handleUpdateUser = async (nextUser: AppUser) => {
    if (!permissions.canManageUsers) {
      showToast("ไม่มีสิทธิ์จัดการผู้ใช้งาน");
      return;
    }
    try {
      const updated = await api.updateUser(nextUser.id, nextUser);
      setUsers((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      showToast(
        updated.id === currentUser.id
          ? "อัปเดตบัญชีของคุณแล้ว โปรดออกจากระบบและเข้าใหม่เพื่อใช้สิทธิ์ใหม่"
          : "บันทึกการตั้งค่าผู้ใช้งานแล้ว",
      );
    } catch (error) {
      showToast(`บันทึกผู้ใช้งานไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleAddUser = async (nextUser: AppUser) => {
    if (!permissions.canManageUsers) return;
    try {
      const created = await api.createUser({
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
        organization: nextUser.organization,
        viewerCanExport: nextUser.viewerCanExport,
        active: nextUser.active,
      });
      setUsers((items) => [...items, created]);
      showToast("เพิ่มผู้ใช้งานแล้ว ผู้ใช้ต้องเข้าสู่ระบบด้วย Google อีเมลนี้");
    } catch (error) {
      showToast((error as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!permissions.canManageUsers) return;
    try {
      await api.deleteUser(userId);
      setUsers((items) => items.filter((item) => item.id !== userId));
      showToast("ลบผู้ใช้งานออกจากระบบแล้ว");
    } catch (error) {
      showToast(`ลบผู้ใช้งานไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleRolesChange = async (nextRoles: RoleDefinition[]) => {
    try {
      const saved = await api.saveRoles(nextRoles);
      setRoles(saved.length ? saved : nextRoles);
    } catch (error) {
      showToast(`บันทึกบทบาทไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleOrganizationItemsChange = async (items: MasterDataItem[]) => {
    const previousItems = organizationItems;
    setOrganizationItems(items);
    try {
      const data = await api.saveMasterData("organization", items);
      setOrganizationItems(mergeOrganizationItems(data.organizations));
    } catch (error) {
      setOrganizationItems(previousItems);
      showToast(`บันทึกองค์กรไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleLocationItemsChange = async (items: MasterDataItem[]) => {
    const previousItems = locationItems;
    setLocationItems(items);
    try {
      const data = await api.saveMasterData("location", items);
      setLocationItems(data.locations);
    } catch (error) {
      setLocationItems(previousItems);
      showToast(`บันทึกสถานที่จัดเก็บไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleEquipmentTypeItemsChange = async (items: MasterDataItem[]) => {
    const previousItems = equipmentTypeItems;
    setEquipmentTypeItems(items);
    try {
      const data = await api.saveMasterData("equipment_type", items);
      setEquipmentTypeItems(data.equipmentTypes);
    } catch (error) {
      setEquipmentTypeItems(previousItems);
      showToast(`บันทึกประเภทครุภัณฑ์ไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  if (!dataReady) return <LoadingScreen message="กำลังโหลดข้อมูลจากระบบ..." />;

  const visibleAssets = assets.filter((asset) => !asset.deletedAt && canAccessAsset(currentUser, permissions, asset));
  const activeOrganizations = organizationItems
    .filter((item) => item.active)
    .map((item) => ({ name: item.name, type: getOrganizationType(item.name) }));
  const activeLocations = locationItems.filter((item) => item.active).map((item) => item.name);
  const activeEquipmentTypes = equipmentTypeItems.filter((item) => item.active).map((item) => item.name);

  const value: AppData = {
    currentUser,
    permissions,
    assets: visibleAssets,
    annualInspections,
    activityLogs,
    users,
    roles,
    organizationItems,
    locationItems,
    equipmentTypeItems,
    activeOrganizations,
    activeLocations,
    activeEquipmentTypes,
    isDashboardExporting,
    toast,
    deleteTarget,
    showToast,
    onViewDetails: handleViewDetails,
    onEditAsset: handleEditAsset,
    onGoToRecord: handleGoToRecord,
    onCreateAsset: handleCreateAsset,
    onSaveAnnualInspection: handleSaveAnnualInspection,
    onCancelAnnualInspection: handleCancelAnnualInspection,
    onSaveAsset: handleSaveAsset,
    onSaveInspectionStatus: handleSaveInspectionStatus,
    onDeleteAsset: handleDeleteAsset,
    confirmDeleteAsset,
    cancelDelete: () => setDeleteTarget(null),
    onAddUser: handleAddUser,
    onUpdateUser: handleUpdateUser,
    onDeleteUser: handleDeleteUser,
    onBackToList: handleBackToList,
    onViewAllAssets: () => router.push(ROUTES.list),
    onDashboardExport: handleDashboardExport,
    onOrganizationItemsChange: handleOrganizationItemsChange,
    onLocationItemsChange: handleLocationItemsChange,
    onEquipmentTypeItemsChange: handleEquipmentTypeItemsChange,
    onRolesChange: handleRolesChange,
    onLogout: () => signOut(),
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
