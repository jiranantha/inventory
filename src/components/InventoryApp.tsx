"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import { AssetDetailPage } from "@/components/AssetDetailPage";
import { AssetEditPage } from "@/components/AssetEditPage";
import { ListPage } from "@/components/AssetListPage";
import { AuditPage } from "@/components/AuditPage";
import { DashboardPage } from "@/components/DashboardPage";
import { RecordPage } from "@/components/RecordPage";
import { ReportsPage } from "@/components/ReportsPage";
import { LoginPage, PendingApprovalPage, PlaceholderPage, UserManagementPage } from "@/components/SettingsPage";
import { Icon, PageHeader } from "@/components/ui";
import { menuItems, pageDescriptions } from "@/constants/options";
import { api, type ActivityLogInput } from "@/lib/api-client";
import { formatThaiDateTimeWithSeconds } from "@/lib/dates";
import { exportDashboardToPDF } from "@/lib/import-export";
import { getOrganizationType } from "@/lib/organizations";
import { AppUser, Permissions, RoleDefinition, canAccessAsset, getPermissions, getRoleDefinition, initialRoleDefinitions } from "@/lib/permissions";
import { ActivityLog, AnnualInspection, AssetListRow, MasterDataItem, PageKey } from "@/types";

export function PageContent({
  activePage,
  assets,
  annualInspections,
  activityLogs,
  permissions,
  users,
  selectedAsset,
  onViewDetails,
  onEditAsset,
  onGoToRecord,
  onCreateAsset,
  onSaveAnnualInspection,
  onCancelAnnualInspection,
  onSaveAsset,
  onSaveInspectionStatus,
  onDeleteAsset,
  onAddUser,
  onUpdateUser,
  onBackToList,
  onViewAllAssets,
  organizationItems,
  onOrganizationItemsChange,
  locationItems,
  onLocationItemsChange,
  equipmentTypeItems,
  onEquipmentTypeItemsChange,
  roles,
  onRolesChange,
}: {
  activePage: PageKey;
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  activityLogs: ActivityLog[];
  permissions: Permissions;
  users: AppUser[];
  selectedAsset: AssetListRow | null;
  onViewDetails: (asset: AssetListRow) => void;
  onEditAsset: (asset: AssetListRow) => void;
  onGoToRecord: () => void;
  onCreateAsset: (asset: AssetListRow) => void;
  onSaveAnnualInspection: (inspection: AnnualInspection) => void;
  onCancelAnnualInspection: (asset: AssetListRow, inspectionYear: string, inspection?: AnnualInspection) => void;
  onSaveAsset: (asset: AssetListRow, oldAsset: AssetListRow) => void;
  onSaveInspectionStatus: (asset: AssetListRow, status: string, inspectionDate: string, note: string) => void;
  onDeleteAsset: (asset: AssetListRow) => void;
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  onBackToList: () => void;
  onViewAllAssets: () => void;
  organizationItems: MasterDataItem[];
  onOrganizationItemsChange: (items: MasterDataItem[]) => void;
  locationItems: MasterDataItem[];
  onLocationItemsChange: (items: MasterDataItem[]) => void;
  equipmentTypeItems: MasterDataItem[];
  onEquipmentTypeItemsChange: (items: MasterDataItem[]) => void;
  roles: RoleDefinition[];
  onRolesChange: (roles: RoleDefinition[]) => void;
}) {
  const activeOrganizations = organizationItems.filter((item) => item.active).map((item) => ({ name: item.name, type: getOrganizationType(item.name) }));
  const activeLocations = locationItems.filter((item) => item.active).map((item) => item.name);
  const activeEquipmentTypes = equipmentTypeItems.filter((item) => item.active).map((item) => item.name);
  const title = menuItems.find((item) => item.key === activePage)?.label ?? "Dashboard";
  if (activePage === "dashboard") return permissions.canViewDashboard ? <DashboardPage assets={assets} annualInspections={annualInspections} onViewAllAssets={onViewAllAssets} /> : <PlaceholderPage title="ไม่มีสิทธิ์เข้าถึง Dashboard" />;
  if (activePage === "record") return permissions.canCreate ? <RecordPage assets={assets} onCreateAsset={onCreateAsset} organizationOptions={activeOrganizations} equipmentTypeOptions={activeEquipmentTypes} locationOptions={activeLocations} /> : <PlaceholderPage title="ไม่มีสิทธิ์เพิ่มข้อมูล" />;
  if (activePage === "list") return permissions.canViewList ? <ListPage assets={assets} annualInspections={annualInspections} permissions={permissions} onAddAsset={onGoToRecord} onViewDetails={onViewDetails} onEditAsset={onEditAsset} onDeleteAsset={onDeleteAsset} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายการครุภัณฑ์" />;
  if (activePage === "detail") return permissions.canViewList ? <AssetDetailPage asset={selectedAsset ?? assets[0]} activityLogs={activityLogs} permissions={permissions} onEdit={onEditAsset} onDelete={onDeleteAsset} onBack={onBackToList} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายละเอียดครุภัณฑ์" />;
  if (activePage === "edit") return (permissions.canEdit || permissions.canEditLimitedFields) ? <AssetEditPage asset={selectedAsset ?? assets[0]} permissions={permissions} onSave={onSaveAsset} onCancel={() => selectedAsset ? onViewDetails(selectedAsset) : onBackToList()} organizationOptions={activeOrganizations} equipmentTypeOptions={activeEquipmentTypes} locationOptions={activeLocations} existingAssets={assets} /> : <PlaceholderPage title="ไม่มีสิทธิ์แก้ไขข้อมูล" />;
  if (activePage === "audit") return permissions.canInspect ? <AuditPage assets={assets} annualInspections={annualInspections} onSaveAnnualInspection={onSaveAnnualInspection} onCancelAnnualInspection={onCancelAnnualInspection} onSaveInspectionStatus={onSaveInspectionStatus} /> : <PlaceholderPage title="ไม่มีสิทธิ์ตรวจสอบประจำปี" />;
  if (activePage === "reports") return permissions.canViewReports ? <ReportsPage assets={assets} annualInspections={annualInspections} permissions={permissions} /> : <PlaceholderPage title="ไม่มีสิทธิ์ดูรายงาน" />;
  if (activePage === "settings") return permissions.canManageUsers ? <UserManagementPage users={users} onAddUser={onAddUser} permissions={permissions} onUpdateUser={onUpdateUser} roles={roles} onRolesChange={onRolesChange} organizationItems={organizationItems} onOrganizationItemsChange={onOrganizationItemsChange} locationItems={locationItems} onLocationItemsChange={onLocationItemsChange} equipmentTypeItems={equipmentTypeItems} onEquipmentTypeItemsChange={onEquipmentTypeItemsChange} assets={assets} /> : <PlaceholderPage title="ไม่มีสิทธิ์เข้าถึงการตั้งค่า" />;
  return <PlaceholderPage title={title} />;
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

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") return <LoadingScreen />;
  if (!session?.user) return <LoginPage />;
  if (!session.user.active || !session.user.role) {
    return <PendingApprovalPage email={session.user.email ?? ""} onSignOut={() => signOut()} />;
  }
  return <AuthenticatedApp sessionUser={session.user} />;
}

function AuthenticatedApp({ sessionUser }: { sessionUser: Session["user"] }) {
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
  const [selectedAsset, setSelectedAsset] = useState<AssetListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetListRow | null>(null);
  const [toast, setToast] = useState("");
  const [isDashboardExporting, setIsDashboardExporting] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");

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
        setRoles(rolesData.length ? rolesData : initialRoleDefinitions);
        setOrganizationItems(masterData.organizations);
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

  // Keep the active page within what the current role is allowed to see.
  useEffect(() => {
    const currentPermissions = getPermissions(currentUser, roles);
    const pageAllowed =
      ((activePage === "list" || activePage === "detail") && currentPermissions.canViewList) ||
      (activePage === "dashboard" && currentPermissions.canViewDashboard) ||
      (activePage === "record" && currentPermissions.canCreate) ||
      (activePage === "edit" && (currentPermissions.canEdit || currentPermissions.canEditLimitedFields)) ||
      (activePage === "audit" && currentPermissions.canInspect) ||
      (activePage === "reports" && currentPermissions.canViewReports) ||
      (activePage === "settings" && currentPermissions.canManageUsers);
    if (!pageAllowed) {
      setActivePage(currentPermissions.canViewList ? "list" : currentPermissions.canInspect ? "audit" : currentPermissions.canViewDashboard ? "dashboard" : "list");
      setSelectedAsset(null);
    }
  }, [activePage, currentUser, roles]);

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
    setSelectedAsset(asset);
    setActivePage("detail");
  };

  const handleEditAsset = (asset: AssetListRow) => {
    if (!(permissions.canEdit || permissions.canEditLimitedFields) || !canAccessAsset(currentUser, permissions, asset)) {
      showToast("ไม่มีสิทธิ์แก้ไขข้อมูลครุภัณฑ์รายการนี้");
      return;
    }
    setSelectedAsset(asset);
    setActivePage("edit");
  };

  const handleGoToRecord = () => {
    setSelectedAsset(null);
    setActivePage("record");
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
      setSelectedAsset(updated);
      prependLog(log);
      showToast("บันทึกการแก้ไขและ activity_logs สำเร็จ");
      setActivePage("detail");
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
    const logInput: ActivityLogInput = {
      userName: currentUser.name,
      actionType: "ยกเลิกผลตรวจ",
      targetId: asset.id,
      targetTable: "assets",
      detail: `ยกเลิกผลตรวจสอบประจำปี ${inspectionYear}`,
      oldValue: inspection
        ? `ปีตรวจสอบ: ${inspection.inspectionYear}, วันที่ตรวจสอบ: ${inspection.inspectionDate}, สถานะหลังตรวจ: ${inspection.result}`
        : `ปีตรวจสอบ: ${inspectionYear}`,
      newValue: "ลบเฉพาะ annual_inspections ของปีที่เลือก",
      note: "ไม่ได้ย้อนสถานะครุภัณฑ์โดยอัตโนมัติ",
    };
    try {
      const { log } = await api.deleteInspection(asset.id, inspectionYear, logInput);
      setAnnualInspections((items) => items.filter((item) => !(item.assetId === asset.id && item.inspectionYear === inspectionYear)));
      prependLog(log);
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
      setSelectedAsset(created);
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
      if (selectedAsset?.id === target.id) {
        setSelectedAsset(null);
        setActivePage("list");
      }
    } catch (error) {
      setDeleteTarget(null);
      showToast(`ลบข้อมูลไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleBackToList = () => {
    setActivePage("list");
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

  const handleRolesChange = async (nextRoles: RoleDefinition[]) => {
    try {
      const saved = await api.saveRoles(nextRoles);
      setRoles(saved.length ? saved : nextRoles);
    } catch (error) {
      showToast(`บันทึกบทบาทไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleOrganizationItemsChange = async (items: MasterDataItem[]) => {
    try {
      const data = await api.saveMasterData("organization", items);
      setOrganizationItems(data.organizations);
    } catch (error) {
      showToast(`บันทึกองค์กรไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleLocationItemsChange = async (items: MasterDataItem[]) => {
    try {
      const data = await api.saveMasterData("location", items);
      setLocationItems(data.locations);
    } catch (error) {
      showToast(`บันทึกสถานที่จัดเก็บไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleEquipmentTypeItemsChange = async (items: MasterDataItem[]) => {
    try {
      const data = await api.saveMasterData("equipment_type", items);
      setEquipmentTypeItems(data.equipmentTypes);
    } catch (error) {
      showToast(`บันทึกประเภทครุภัณฑ์ไม่สำเร็จ: ${(error as Error).message}`);
    }
  };

  const handleLogout = () => {
    signOut();
  };

  if (!dataReady) return <LoadingScreen message="กำลังโหลดข้อมูลจากระบบ..." />;

  const visibleAssets = assets.filter((asset) => !asset.deletedAt && canAccessAsset(currentUser, permissions, asset));
  const allowedMenuItems = menuItems.filter((item) => {
    if (item.key === "dashboard") return permissions.canViewDashboard;
    if (item.key === "list") return permissions.canViewList;
    if (item.key === "record") return permissions.canCreate;
    if (item.key === "audit") return permissions.canInspect;
    if (item.key === "reports") return permissions.canViewReports;
    if (item.key === "settings") return permissions.canManageUsers;
    return true;
  });
  const activeItem = activePage === "detail"
    ? { label: "รายละเอียดครุภัณฑ์" }
    : activePage === "edit"
      ? { label: "แก้ไขข้อมูลครุภัณฑ์" }
    : (menuItems.find((item) => item.key === activePage) ?? menuItems[0]);

  return (
    <main className="asset-shell min-h-screen w-full max-w-full overflow-x-hidden font-thai text-slate-100 transition-colors duration-200">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-gold/30 bg-slate-950 px-5 py-3 text-sm font-semibold text-gold shadow-glow">
          {toast}
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-md rounded-lg border border-white/10 bg-panel p-5 shadow-2xl">
            <h2 className="text-xl font-bold text-white">ยืนยันการลบข้อมูล</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              ต้องการลบครุภัณฑ์รายการนี้หรือไม่? ข้อมูลจะถูกเก็บไว้ในประวัติและสามารถตรวจสอบย้อนหลังได้
            </p>
            <p className="mt-3 rounded-md border border-white/10 bg-slate-950/30 px-3 py-2 text-sm font-semibold text-white">
              {deleteTarget.assetNumber} · {deleteTarget.assetName}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ยกเลิก</button>
              <button onClick={confirmDeleteAsset} className="rounded-md bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400">ยืนยันลบ</button>
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy/90 backdrop-blur">
        <div className="flex min-h-20 items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold text-slate-950 shadow-glow sm:h-12 sm:w-12">
            <Icon path="M12 3l8 4v10l-8 4-8-4V7l8-4Zm0 0v18M4 7l8 4 8-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-2 text-sm font-extrabold leading-5 text-white sm:text-lg md:text-2xl">
              ระบบจัดเก็บและตรวจสอบครุภัณฑ์องค์กรนักศึกษา
            </h1>
            <p className="mt-1 hidden text-sm text-slate-400 sm:block md:text-base">
              ระบบบริหารจัดการครุภัณฑ์ ฝ่าย/ชมรม มหาวิทยาลัยเชียงใหม่
            </p>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-panel p-1.5 text-sm sm:px-2 sm:py-2 md:gap-3 md:px-3">
            <div className="hidden text-right sm:block">
              <p className="font-bold text-white">{currentUser.name}</p>
              <p className="max-w-[220px] truncate text-xs text-gold">{getRoleDefinition(currentUser.role, roles).name} · {currentUser.organization}</p>
            </div>
            <button onClick={handleLogout} className="min-h-10 rounded-md border border-white/15 px-2 py-2 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold sm:px-3">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="grid w-full min-w-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 border-b border-white/10 bg-slate-950/30 p-3 lg:min-h-[calc(100vh-80px)] lg:border-b-0 lg:border-r">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {allowedMenuItems.map((item) => {
              const active = item.key === activePage;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActivePage(item.key);
                    if (item.key !== "detail" && item.key !== "edit") setSelectedAsset(null);
                  }}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-gold text-blue-800 shadow-glow"
                      : "bg-panel text-slate-300 ring-1 ring-white/10 hover:bg-panelSoft hover:text-white"
                  }`}
                >
                  <Icon path={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-3 py-4 md:px-4 lg:px-5 lg:py-6">
          {!(["list", "reports", "detail", "edit"] as PageKey[]).includes(activePage) && (
            <div className="mx-auto mb-5 w-full max-w-screen-2xl">
              <PageHeader
                title={activePage === "audit" ? "ตรวจสอบครุภัณฑ์ประจำปี" : activePage === "record" ? "บันทึกข้อมูลครุภัณฑ์" : activeItem.label}
                description={pageDescriptions[activePage]}
                actions={activePage !== "record" && activePage !== "settings" ? (
                  <>
                    {permissions.canExport && (
                  <button
                    onClick={activePage === "dashboard" ? handleDashboardExport : () => setActivePage("reports")}
                    disabled={activePage === "dashboard" && isDashboardExporting}
                    className="rounded-md border border-white/15 bg-panel px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-panelSoft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activePage === "dashboard" && isDashboardExporting ? "กำลังสร้าง PDF..." : "ส่งออก"}
                  </button>
                    )}
                    {activePage !== "dashboard" && permissions.canCreate && <button onClick={handleGoToRecord} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amberSoft">บันทึกใหม่</button>}
                  </>
                ) : undefined}
              />
            </div>
          )}

          <div className="mx-auto w-full max-w-screen-2xl min-w-0">
            <PageContent
              activePage={activePage}
              assets={visibleAssets}
              annualInspections={annualInspections}
              activityLogs={activityLogs}
              permissions={permissions}
              users={users}
              selectedAsset={selectedAsset}
              onViewDetails={handleViewDetails}
              onEditAsset={handleEditAsset}
              onGoToRecord={handleGoToRecord}
              onCreateAsset={handleCreateAsset}
              onSaveAnnualInspection={handleSaveAnnualInspection}
              onCancelAnnualInspection={handleCancelAnnualInspection}
              onSaveAsset={handleSaveAsset}
              onSaveInspectionStatus={handleSaveInspectionStatus}
              onDeleteAsset={handleDeleteAsset}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onBackToList={handleBackToList}
              onViewAllAssets={() => {
                setSelectedAsset(null);
                setActivePage("list");
              }}
              organizationItems={organizationItems}
              onOrganizationItemsChange={handleOrganizationItemsChange}
              locationItems={locationItems}
              onLocationItemsChange={handleLocationItemsChange}
              equipmentTypeItems={equipmentTypeItems}
              onEquipmentTypeItemsChange={handleEquipmentTypeItemsChange}
              roles={roles}
              onRolesChange={handleRolesChange}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
