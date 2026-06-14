"use client";

import { useState } from "react";
import { AssetStructureBadge, BackIconButton, CloseIconButton, DetailInfoItem, DetailSection, PageHeader, StatusBadge } from "@/components/ui";
import { getAssetDerivedValues, getNumberPlacementValue, getPurchaseProjectValue } from "@/lib/assets";
import { formatThaiDateTime } from "@/lib/dates";
import { Permissions } from "@/lib/permissions";
import { ActivityLog, AssetListRow, HistoryFieldRow } from "@/types";

export function AssetDetailPage({
  asset,
  activityLogs,
  permissions,
  onEdit,
  onDelete,
  onBack,
}: {
  asset: AssetListRow;
  activityLogs: ActivityLog[];
  permissions: Permissions;
  onEdit: (asset: AssetListRow) => void;
  onDelete: (asset: AssetListRow) => void;
  onBack: () => void;
}) {
  const safeText = (value: string | undefined | null) => value && value !== "-" ? value : "-";
  const [historyOpen, setHistoryOpen] = useState(false);
  const { priceValue, phoneValue } = getAssetDerivedValues(asset);
  const assetLogs = activityLogs.filter(
    (log) =>
      log.targetId === asset.id &&
      ["แก้ไข", "ลบ", "กู้คืน"].includes(log.actionType) &&
      !log.detail.includes("ตรวจสอบประจำปี"),
  );
  const hasStoredImages = false;
  const getActionBadgeClass = (actionType: ActivityLog["actionType"]) => {
    if (actionType === "ลบ") return "border-red-300/30 bg-red-500/10 text-red-200";
    if (actionType === "กู้คืน") return "border-emerald-300/30 bg-emerald-500/10 text-emerald-200";
    return "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]";
  };
  const getActionLabel = (actionType: ActivityLog["actionType"]) => {
    if (actionType === "ลบ") return "ลบข้อมูล";
    if (actionType === "กู้คืน") return "กู้คืนข้อมูล";
    return "แก้ไขข้อมูล";
  };
  const parseHistoryValue = (value: string) => {
    const result: Record<string, string> = {};
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const separatorIndex = item.indexOf(":");
        if (separatorIndex === -1) return;
        const key = item.slice(0, separatorIndex).trim();
        const fieldValue = item.slice(separatorIndex + 1).trim();
        if (!key) return;
        result[key] = fieldValue || "-";
      });
    return result;
  };
  const buildHistoryRows = (oldValue: string, newValue: string) => {
    const oldMap = parseHistoryValue(oldValue);
    const newMap = parseHistoryValue(newValue);
    const hiddenLocationFields = new Set(["อาคาร", "ห้อง"]);
    const hiddenAssetFields = new Set(["จำนวน", "หน่วยนับ"]);
    const fieldOrder = ["ชื่อ", "หมายเลขครุภัณฑ์", "จัดซื้อในโครงการ", "ตำแหน่งที่ประทับหมายเลขครุภัณฑ์", "สถานะ", "สถานที่", "ผู้รับผิดชอบ", "เบอร์โทรผู้รับผิดชอบ", "หมายเหตุ", "deleted_at", "deleted_by", "updated_at"];
    const allKeys = Array.from(new Set([...fieldOrder, ...Object.keys(oldMap), ...Object.keys(newMap)]))
      .filter((key) => !hiddenLocationFields.has(key) && !hiddenAssetFields.has(key) && (oldMap[key] !== undefined || newMap[key] !== undefined));
    const changedKeys = new Set(allKeys.filter((key) => (oldMap[key] ?? "") !== (newMap[key] ?? "")));
    const oldRows: HistoryFieldRow[] = allKeys
      .filter((key) => key !== "updated_at")
      .map((key) => ({ label: key, value: oldMap[key] ?? "-", changed: changedKeys.has(key) }));
    const newRows: HistoryFieldRow[] = allKeys
      .map((key) => ({ label: key, value: newMap[key] ?? "-", changed: changedKeys.has(key) }));
    return { oldRows, newRows };
  };
  const renderHistoryRows = (rows: HistoryFieldRow[]) => (
    <div className="mt-2 space-y-2">
      {rows.length > 0 ? rows.map((row) => (
        <div
          key={row.label}
          className={`rounded-md px-2 py-1 text-sm leading-6 ${row.changed ? "border-l-2 border-amber-400 bg-amber-500/10" : ""}`}
        >
          <span className={row.changed ? "font-bold text-amber-300" : "font-semibold text-slate-400"}>{row.label} : </span>
          <span className={row.changed ? "font-bold text-amber-100" : "text-slate-100"}>{row.value || "-"}</span>
        </div>
      )) : <p className="text-sm text-slate-400">-</p>}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-4">
      <PageHeader
        title="รายละเอียดครุภัณฑ์"
        description="อ่านข้อมูลสำคัญของครุภัณฑ์และประวัติการเปลี่ยนแปลง"
        leading={<BackIconButton onClick={onBack} label="กลับไปหน้ารายการ" />}
        actions={(
          <>
          {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEdit(asset)} className="rounded-md bg-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange/90">แก้ไขข้อมูล</button>}
          {permissions.canDelete && <button onClick={() => onDelete(asset)} className="rounded-md border border-red-300/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10">ลบ</button>}
          <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-md border border-white/15 bg-panelSoft px-4 py-2 text-sm font-semibold text-slate-200 hover:border-gold hover:text-gold">
            ประวัติ
          </button>
          </>
        )}
      />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-panel px-4 py-3">
        <h3 className="mr-auto break-words text-lg font-extrabold text-white">{asset.assetName}</h3>
        <span className="text-sm text-slate-400">{asset.assetNumber}</span>
        <span className="text-slate-400">·</span>
        <span className="text-sm text-slate-400">{asset.organization}</span>
        <StatusBadge value={asset.status} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.45fr]">
        <DetailSection title="สถานะและหลักฐาน">
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <p className="text-xs font-semibold text-slate-400">สถานะครุภัณฑ์</p>
              <div className="mt-2"><StatusBadge value={asset.status} /></div>
            </div>
            <div>
              <p className="text-sm font-bold text-white">รูปภาพครุภัณฑ์</p>
              {asset.assetImages?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {asset.assetImages.map((image) => (
                    <figure key={image.url} className="overflow-hidden rounded-md border border-white/10 bg-panelSoft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                      <figcaption className="truncate px-2 py-1.5 text-xs text-slate-400" title={image.name}>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : hasStoredImages ? (
                <p className="mt-3 rounded-md border border-white/10 bg-panelSoft px-3 py-4 text-center text-sm text-slate-400">มีข้อมูลรูปภาพเดิม {asset.imageCount.toLocaleString("th-TH")} รูป</p>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-white/15 bg-slate-950/25 px-3 py-8 text-center text-sm text-slate-400">ยังไม่มีรูปภาพครุภัณฑ์</p>
              )}
            </div>
            <DetailInfoItem label="หมายเหตุ" value={safeText(asset.note)} />
          </div>
        </DetailSection>

        <div className="space-y-5">
          <DetailSection title="ข้อมูลทั่วไป">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailInfoItem label="ชื่อรายการครุภัณฑ์" value={safeText(asset.assetName)} />
              <DetailInfoItem label="หมายเลขครุภัณฑ์" value={safeText(asset.assetNumber)} />
              <DetailInfoItem label="รหัสอ้างอิงภายในระบบ" value={safeText(asset.assetCode)} />
              <DetailInfoItem label="ประเภทครุภัณฑ์" value={safeText(asset.assetType)} />
              <DetailInfoItem label="ข้อมูลจำเพาะ / คุณลักษณะของครุภัณฑ์" value={safeText(asset.assetDescription)} />
              <DetailInfoItem label="จัดซื้อในโครงการ" value={getPurchaseProjectValue(asset)} />
              <DetailInfoItem label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์" value={getNumberPlacementValue(asset)} />
              <DetailInfoItem label="ปีงบประมาณ" value={safeText(asset.fiscalYear)} />
              <DetailInfoItem label="แหล่งงบประมาณ" value={safeText(asset.budgetSource)} />
              <DetailInfoItem label="วันที่บันทึกข้อมูล" value={safeText(asset.recordDate)} />
              <DetailInfoItem label="วันที่ได้รับครุภัณฑ์" value={safeText(asset.purchaseMonth)} />
              <div className="min-w-0 border-b border-white/10 py-2">
                <p className="text-xs font-semibold text-slate-400">ลักษณะครุภัณฑ์</p>
                <div className="mt-2"><AssetStructureBadge asset={asset} /></div>
              </div>
            </div>
            {asset.assetStructureType === "set" && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-panelSoft text-slate-300">
                    <tr>
                      {["ลำดับ", "ชื่อรายการย่อย", "รายละเอียด/หมายเหตุ"].map((heading) => (
                        <th key={heading} className="border-b border-white/10 px-3 py-2.5 font-semibold">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-slate-950/20 text-slate-200">
                    {asset.assetSetItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-3 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-3 py-3 font-semibold text-white">{item.itemName}</td>
                        <td className="px-3 py-3 text-slate-300">{item.description || "-"}</td>
                      </tr>
                    ))}
                    {asset.assetSetItems.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-slate-400">ยังไม่มีรายการย่อยในชุดครุภัณฑ์</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DetailSection>

          <DetailSection title="ข้อมูลมูลค่า">
            <div className="grid gap-3">
              <DetailInfoItem label="มูลค่าทรัพย์สิน" value={priceValue ? `${priceValue} บาท` : "-"} />
            </div>
          </DetailSection>

          <DetailSection title="สถานที่จัดเก็บ">
            <div className="grid gap-3">
              <DetailInfoItem label="สถานที่จัดเก็บ" value={safeText(asset.location)} />
            </div>
          </DetailSection>

          <DetailSection title="ฝ่าย/ชมรมที่รับผิดชอบ">
            <DetailInfoItem label="ฝ่าย/ชมรมที่รับผิดชอบ" value={safeText(asset.organization)} />
          </DetailSection>

          <DetailSection title="ผู้รับผิดชอบ">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailInfoItem label="ชื่อผู้รับผิดชอบ" value={safeText(asset.responsiblePerson)} />
              <DetailInfoItem label="เบอร์โทรผู้รับผิดชอบ" value={phoneValue && phoneValue !== "-" ? phoneValue : "-"} />
            </div>
          </DetailSection>
        </div>
      </div>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-white/10 bg-panel shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
              <div>
                <h3 className="text-xl font-extrabold text-white">ประวัติการแก้ไขและลบข้อมูล</h3>
                <p className="mt-2 text-sm font-bold text-white">{asset.assetName}</p>
                <p className="mt-1 text-sm text-gold">{asset.assetNumber}</p>
              </div>
              <CloseIconButton onClick={() => setHistoryOpen(false)} />
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              {assetLogs.length > 0 ? (
                <div className="space-y-3">
                  {assetLogs.map((log) => {
                    const { oldRows, newRows } = buildHistoryRows(log.oldValue, log.newValue);
                    return (
                      <article key={log.id} className="rounded-lg border border-white/10 bg-slate-950/25 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-400">{formatThaiDateTime(log.createdAt)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getActionBadgeClass(log.actionType)}`}>
                                {getActionLabel(log.actionType)}
                              </span>
                              <span className="text-sm text-slate-300">โดย <b className="text-white">{log.userName}</b></span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-100">{log.detail}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
                            <p className="text-xs font-bold text-slate-400">ข้อมูลเดิม</p>
                            {renderHistoryRows(oldRows)}
                          </div>
                          <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
                            <p className="text-xs font-bold text-slate-400">ข้อมูลใหม่</p>
                            {renderHistoryRows(newRows)}
                          </div>
                        </div>
                        {log.note && (
                          <p className="mt-3 rounded-md border border-white/10 bg-panelSoft px-3 py-2 text-sm text-slate-300">
                            <span className="font-bold text-slate-100">หมายเหตุ: </span>{log.note}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-white/10 bg-slate-950/25 p-6 text-center text-sm text-slate-400">
                  ยังไม่มีประวัติการแก้ไขหรือลบข้อมูลสำหรับครุภัณฑ์รายการนี้
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

