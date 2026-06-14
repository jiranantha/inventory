"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { CloseIconButton, DetailInfoItem, Field, SelectField } from "@/components/ui";
import { AppUser, Permissions, RoleDefinition, UserRole, getPermissionLabel, getPermissions, getRoleDefinition, noPermissions } from "@/lib/permissions";
import { uniqueSorted } from "@/lib/utils";
import { AssetListRow, MasterDataItem } from "@/types";

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

export function MasterDataPanel({ title, description, items, onChange, addLabel }: { title: string; description: string; items: MasterDataItem[]; onChange: (items: MasterDataItem[]) => void; addLabel: string }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const save = () => {
    const name = draft.trim();
    if (!name) return;
    if (editingId === null) onChange([...items, { id: Date.now(), name, active: true }]);
    else onChange(items.map((item) => item.id === editingId ? { ...item, name } : item));
    setDraft("");
    setEditingId(null);
  };
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={addLabel} className="min-h-11 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-gold" />
        <button type="button" onClick={save} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">{editingId === null ? "เพิ่มรายการ" : "บันทึก"}</button>
        {editingId !== null && <button type="button" onClick={() => { setEditingId(null); setDraft(""); }} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">ยกเลิก</button>}
      </div>
      <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
        {items.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/20 px-4 py-3">
            <div className="min-w-0"><p className={`break-words font-semibold ${item.active ? "text-white" : "text-slate-500"}`}>{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setEditingId(item.id); setDraft(item.name); }} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-gold hover:text-gold">แก้ไข</button>
              <button type="button" onClick={() => onChange(items.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry))} className="rounded-md border border-slate-500/40 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/5">{item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UserManagementPage({ users, onAddUser, onUpdateUser, roles, onRolesChange, permissions, organizationItems, onOrganizationItemsChange, locationItems, onLocationItemsChange, equipmentTypeItems, onEquipmentTypeItemsChange, assets }: {
  users: AppUser[];
  onAddUser: (user: AppUser) => void;
  onUpdateUser: (user: AppUser) => void;
  roles: RoleDefinition[];
  onRolesChange: (roles: RoleDefinition[]) => void;
  permissions: Permissions;
  organizationItems: MasterDataItem[];
  onOrganizationItemsChange: (items: MasterDataItem[]) => void;
  locationItems: MasterDataItem[];
  onLocationItemsChange: (items: MasterDataItem[]) => void;
  equipmentTypeItems: MasterDataItem[];
  onEquipmentTypeItemsChange: (items: MasterDataItem[]) => void;
  assets: AssetListRow[];
}) {
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("edit");
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleModalMode, setRoleModalMode] = useState<"add" | "edit">("edit");
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "organizations" | "locations" | "types" | "numbers">("users");

  if (!permissions.canManageUsers) {
    return (
      <section className="rounded-lg border border-white/10 bg-panel p-6">
        <h2 className="text-xl font-bold text-white">ไม่มีสิทธิ์จัดการผู้ใช้งาน</h2>
        <p className="mt-2 text-sm text-slate-400">เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถแก้ไขบทบาท องค์กร และสิทธิ์ส่งออกได้</p>
      </section>
    );
  }

  const saveEditingUser = () => {
    if (!editingUser) return;
    if (!editingUser.name.trim() || !editingUser.email.trim() || !editingUser.role) return;
    if (userModalMode === "add") onAddUser(editingUser);
    else onUpdateUser(editingUser);
    setEditingUser(null);
  };

  const openAddUser = () => {
    setUserModalMode("add");
    setEditingUser({ id: `new-${Date.now()}`, name: "", email: "", role: roles.find((role) => role.active && role.key !== "Admin")?.key ?? "Inspector", organization: "-", viewerCanExport: false, active: true });
  };

  const openAddRole = () => {
    setRoleModalMode("add");
    setEditingRole({ key: `custom-${Date.now()}`, name: "", description: "", permissions: { ...noPermissions }, allowExport: false, active: true });
  };

  const saveRole = () => {
    if (!editingRole?.name.trim()) return;
    const nextRole = { ...editingRole, permissions: { ...editingRole.permissions, canExport: editingRole.allowExport } };
    if (roleModalMode === "add") onRolesChange([...roles, nextRole]);
    else onRolesChange(roles.map((role) => role.key === nextRole.key ? nextRole : role));
    setEditingRole(null);
  };

  const organizationOptions = ["กองพัฒนานักศึกษามหาวิทยาลัยเชียงใหม่", "-", ...organizationItems.map((item) => item.name)];
  const latestSequence = assets.reduce((highest, asset) => Math.max(highest, Number(asset.assetNumber.match(/(\d{1,6})\s*\/\s*\d{4}/)?.[1] ?? 0)), 143);
  const currentThaiYear = new Date().getFullYear() + 543;
  const tabs = [
    ["users", "จัดการผู้ใช้งาน"], ["roles", "จัดการบทบาท"], ["organizations", "องค์กร/หน่วยงาน"], ["locations", "สถานที่จัดเก็บ"], ["types", "ประเภทครุภัณฑ์"], ["numbers", "การออกเลขครุภัณฑ์"],
  ] as const;

  return (
    <>
      <div className="mx-auto mb-4 w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-3">
        <p className="px-2 text-sm text-slate-400">จัดการข้อมูลกลาง ผู้ใช้งาน และสิทธิ์การใช้งานระบบ</p>
        <div className="mt-3 flex gap-2 overflow-x-auto">{tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${activeTab === key ? "bg-gold text-slate-950" : "bg-panelSoft text-slate-300 hover:text-white"}`}>{label}</button>)}</div>
      </div>
      {activeTab === "users" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">จัดการผู้ใช้งาน</h2><p className="mt-2 text-sm text-slate-400">ตรวจสอบบัญชี บทบาท องค์กร และสิทธิ์การใช้งานของผู้ใช้ในระบบ</p></div><button type="button" onClick={openAddUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">เพิ่มผู้ใช้งาน</button></div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-panelSoft text-slate-300">
              <tr>
                {["ชื่อ", "อีเมล", "บทบาท", "องค์กร", "สิทธิ์การใช้งาน", "อนุญาตส่งออก", "จัดการ"].map((heading) => (
                  <th key={heading} className="border-b border-white/10 px-3 py-2.5">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-3 py-3 font-semibold text-white">{user.name}</td>
                  <td className="px-3 py-3 text-slate-300">{user.email}</td>
                  <td className="px-3 py-3"><span className="inline-flex rounded-full border border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-xs font-bold text-sky-200">{getRoleDefinition(user.role, roles).name}</span></td>
                  <td className="max-w-[240px] px-3 py-3 text-slate-300" title={user.organization}>{user.organization || "-"}</td>
                  <td className="max-w-[280px] px-3 py-3 text-slate-300">{getPermissionLabel(getPermissions(user, roles))}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${user.viewerCanExport ? "bg-emerald-400/10 text-emerald-200" : "bg-slate-700/60 text-slate-300"}`}>
                      {user.viewerCanExport ? "อนุญาต" : "ไม่อนุญาต"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-2"><button type="button" onClick={() => { setUserModalMode("edit"); setEditingUser({ ...user }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amberSoft">แก้ไข</button><button type="button" disabled={user.role === "Admin"} onClick={() => onUpdateUser({ ...user, active: !user.active })} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">{user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {activeTab === "roles" && <section className="mx-auto w-full max-w-screen-2xl rounded-lg border border-white/10 bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-white">จัดการบทบาท</h2><p className="mt-2 text-sm text-slate-400">กำหนดบทบาทและสิทธิ์การใช้งานสำหรับผู้ใช้งานในระบบ</p></div><button type="button" onClick={openAddRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">เพิ่มบทบาท</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] border-collapse text-left text-sm"><thead className="bg-panelSoft text-slate-300"><tr>{["ชื่อบทบาท", "คำอธิบาย", "สิทธิ์การใช้งาน", "อนุญาตส่งออก", "สถานะ", "จัดการ"].map((heading) => <th key={heading} className="border-b border-white/10 px-3 py-2.5">{heading}</th>)}</tr></thead><tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">{roles.map((role) => <tr key={role.key}><td className="px-3 py-3 font-semibold text-white">{role.name}</td><td className="px-3 py-3 text-slate-300">{role.description || "-"}</td><td className="max-w-[340px] px-3 py-3 text-slate-300">{getPermissionLabel(role.permissions)}</td><td className="px-3 py-3">{role.allowExport ? "อนุญาต" : "ไม่อนุญาต"}</td><td className="px-3 py-3">{role.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</td><td className="px-3 py-3"><div className="flex gap-2"><button type="button" onClick={() => { setRoleModalMode("edit"); setEditingRole({ ...role, permissions: { ...role.permissions } }); }} className="rounded-md bg-gold px-3 py-1.5 text-xs font-extrabold text-slate-950">แก้ไข</button><button type="button" disabled={role.protected} onClick={() => onRolesChange(roles.map((item) => item.key === role.key ? { ...item, active: !item.active } : item))} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">{role.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button></div></td></tr>)}</tbody></table></div></section>}

      {activeTab === "organizations" && <MasterDataPanel title="จัดการองค์กร/หน่วยงาน" description="จัดการรายชื่อองค์กร หน่วยงาน ฝ่าย และชมรมที่ใช้ในระบบ" items={organizationItems} onChange={onOrganizationItemsChange} addLabel="ระบุชื่อองค์กรหรือหน่วยงาน" />}
      {activeTab === "locations" && <MasterDataPanel title="จัดการสถานที่จัดเก็บ" description="จัดการสถานที่จัดเก็บครุภัณฑ์ที่ใช้ในฟอร์มบันทึกข้อมูลและการตรวจสอบ" items={locationItems} onChange={onLocationItemsChange} addLabel="ระบุสถานที่จัดเก็บ" />}
      {activeTab === "types" && <MasterDataPanel title="จัดการประเภทครุภัณฑ์" description="จัดการหมวดหมู่ครุภัณฑ์ที่ใช้ในฟอร์ม ตาราง รายงาน และตัวกรองข้อมูล" items={equipmentTypeItems} onChange={onEquipmentTypeItemsChange} addLabel="ระบุประเภทครุภัณฑ์" />}
      {activeTab === "numbers" && <section className="rounded-lg border border-white/10 bg-panel p-5"><h2 className="text-xl font-bold text-white">ตั้งค่าการออกเลขครุภัณฑ์</h2><p className="mt-2 text-sm text-slate-400">กำหนดรูปแบบและเลขลำดับล่าสุดสำหรับการออกหมายเลขครุภัณฑ์อัตโนมัติ</p><div className="mt-5 grid gap-4 md:grid-cols-3"><DetailInfoItem label="คำนำหน้าเลขครุภัณฑ์" value="ค.อ.มช." /><DetailInfoItem label="เลขลำดับล่าสุด" value={String(latestSequence).padStart(4, "0")} /><DetailInfoItem label="ตัวอย่างรูปแบบหมายเลขครุภัณฑ์" value={`ค.อ.มช.${String(latestSequence + 1).padStart(4, "0")}/${currentThaiYear}`} /></div><p className="mt-4 rounded-lg border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">ข้อมูลส่วนนี้เป็นแบบอ่านอย่างเดียว เพื่อป้องกันหมายเลขครุภัณฑ์ซ้ำหรือผิดลำดับ</p></section>}

      {editingUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-xl font-bold text-white">{userModalMode === "add" ? "เพิ่มผู้ใช้งาน" : "แก้ไขข้อมูลผู้ใช้งาน"}</h3>
                <p className="mt-1 text-sm text-slate-400">ระบุข้อมูลบัญชีและบทบาทของผู้ใช้งาน</p>
              </div>
              <CloseIconButton onClick={() => setEditingUser(null)} />
            </div>
            <div className="space-y-4 p-5">
              <Field label="ชื่อผู้ใช้งาน" value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} />
              <Field label="อีเมล" type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} />
              <SelectField
                label="บทบาท"
                value={editingUser.role}
                onChange={(value) => setEditingUser({ ...editingUser, role: value as UserRole })}
                options={roles.filter((role) => role.active || role.key === editingUser.role).map((role) => role.key)}
                getOptionLabel={(value) => getRoleDefinition(value, roles).name}
              />
              <SelectField label="องค์กร" value={editingUser.organization} onChange={(value) => setEditingUser({ ...editingUser, organization: value })} options={uniqueSorted(organizationOptions)} />
              <label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3">
                <span>
                  <span className="block text-sm font-semibold text-white">อนุญาตส่งออก</span>
                  <span className="mt-1 block text-xs text-slate-400">อนุญาตให้ผู้ใช้นี้ส่งออกรายงานจากระบบ</span>
                </span>
                <input type="checkbox" checked={editingUser.viewerCanExport} onChange={(event) => setEditingUser({ ...editingUser, viewerCanExport: event.target.checked })} className="h-5 w-5 accent-yellow-400" />
              </label>
              <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">ยกเลิก</button>
                <button type="button" onClick={saveEditingUser} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amberSoft">บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editingRole && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4"><div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-panel shadow-2xl"><div className="flex items-start justify-between gap-3 border-b border-white/10 p-5"><div><h3 className="text-xl font-bold text-white">{roleModalMode === "add" ? "เพิ่มบทบาท" : "แก้ไขบทบาท"}</h3><p className="mt-1 text-sm text-slate-400">กำหนดชื่อ คำอธิบาย และสิทธิ์การใช้งาน</p></div><CloseIconButton onClick={() => setEditingRole(null)} /></div><div className="space-y-4 p-5"><Field label="ชื่อบทบาท" value={editingRole.name} onChange={(event) => setEditingRole({ ...editingRole, name: event.target.value })} /><Field label="คำอธิบายบทบาท" value={editingRole.description} onChange={(event) => setEditingRole({ ...editingRole, description: event.target.value })} /><div><p className="text-sm font-semibold text-white">สิทธิ์การใช้งาน</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{([{ key: "canViewDashboard", label: "หน้าภาพรวม" }, { key: "canViewList", label: "แสดงรายการ" }, { key: "canInspect", label: "ตรวจสอบประจำปี" }, { key: "canCreate", label: "บันทึกข้อมูล" }, { key: "canViewReports", label: "รายงาน" }, { key: "canManageUsers", label: "ตั้งค่า" }, { key: "canEdit", label: "แก้ไขข้อมูลครุภัณฑ์" }, { key: "canDelete", label: "ลบข้อมูลครุภัณฑ์" }] as { key: keyof Permissions; label: string }[]).map((option) => <label key={option.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-slate-200"><input type="checkbox" checked={Boolean(editingRole.permissions[option.key])} onChange={(event) => setEditingRole({ ...editingRole, permissions: { ...editingRole.permissions, [option.key]: event.target.checked } })} className="h-4 w-4 accent-yellow-400" />{option.label}</label>)}</div></div><label className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/30 px-4 py-3"><span className="text-sm font-semibold text-white">อนุญาตส่งออก</span><input type="checkbox" checked={editingRole.allowExport} onChange={(event) => setEditingRole({ ...editingRole, allowExport: event.target.checked, permissions: { ...editingRole.permissions, canExport: event.target.checked } })} className="h-5 w-5 accent-yellow-400" /></label><div className="flex justify-end gap-3 border-t border-white/10 pt-4"><button type="button" onClick={() => setEditingRole(null)} className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200">ยกเลิก</button><button type="button" onClick={saveRole} className="rounded-md bg-gold px-4 py-2 text-sm font-extrabold text-slate-950">บันทึก</button></div></div></div></div>}
    </>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            พื้นที่โครงสร้างสำหรับหน้า {title} เตรียมไว้สำหรับเพิ่มฟอร์ม ตาราง ตัวกรอง และการเชื่อมต่อฐานข้อมูลในขั้นต่อไป
          </p>
        </div>
        <button className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white transition hover:bg-orange/90">
          จัดการข้อมูล
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {["ข้อมูลหลัก", "สถานะงาน", "บันทึกล่าสุด"].map((label) => (
          <div key={label} className="rounded-lg border border-white/10 bg-panelSoft p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-lg font-bold text-white">พร้อมกำหนดรายละเอียด</p>
          </div>
        ))}
      </div>
    </section>
  );
}

