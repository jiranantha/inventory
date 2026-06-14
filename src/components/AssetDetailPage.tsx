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
    if (actionType === "ลบ") return "border-danger/30 bg-danger/10 text-danger";
    if (actionType === "กู้คืน") return "border-success/30 bg-success/10 text-success";
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
          className={`rounded-md px-2 py-1 text-sm leading-6 ${row.changed ? "border-l-2 border-warning bg-warning/10" : ""}`}
        >
          <span className={row.changed ? "font-bold text-warning" : "font-semibold text-muted"}>{row.label} : </span>
          <span className={row.changed ? "font-bold text-warning" : "text-ink"}>{row.value || "-"}</span>
        </div>
      )) : <p className="text-sm text-muted">-</p>}
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
          {(permissions.canEdit || permissions.canEditLimitedFields) && <button onClick={() => onEdit(asset)} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover">แก้ไขข้อมูล</button>}
          {permissions.canDelete && <button onClick={() => onDelete(asset)} className="min-h-11 rounded-md border border-danger/30 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10">ลบ</button>}
          <button type="button" onClick={() => setHistoryOpen(true)} className="min-h-11 rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary">
            ประวัติ
          </button>
          </>
        )}
      />
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
        <h3 className="mr-auto min-w-0 break-words text-lg font-extrabold text-ink">{asset.assetName}</h3>
        <span className="text-sm text-muted">{asset.assetNumber}</span>
        <span className="text-muted">·</span>
        <span className="text-sm text-muted">{asset.organization}</span>
        <StatusBadge value={asset.status} />
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[0.82fr_1.45fr]">
        <div className="min-w-0">
        <DetailSection title="สถานะและหลักฐาน">
          <div className="space-y-4">
            <div className="border-b border-line pb-3">
              <p className="text-xs font-semibold text-muted">สถานะครุภัณฑ์</p>
              <div className="mt-2"><StatusBadge value={asset.status} /></div>
            </div>
            <div>
              <p className="text-sm font-bold text-ink">รูปภาพครุภัณฑ์</p>
              {asset.assetImages?.length ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {asset.assetImages.map((image) => (
                    <figure key={image.url} className="overflow-hidden rounded-md border border-line bg-surfaceSoft">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                      <figcaption className="truncate px-2 py-1.5 text-xs text-muted" title={image.name}>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : hasStoredImages ? (
                <p className="mt-3 rounded-md border border-line bg-surfaceSoft px-3 py-4 text-center text-sm text-muted">มีข้อมูลรูปภาพเดิม {asset.imageCount.toLocaleString("th-TH")} รูป</p>
              ) : (
                <p className="mt-3 rounded-md border border-dashed border-line bg-surfaceSoft px-3 py-8 text-center text-sm text-muted">ยังไม่มีรูปภาพครุภัณฑ์</p>
              )}
            </div>
            <DetailInfoItem label="หมายเหตุ" value={safeText(asset.note)} />
          </div>
        </DetailSection>
        </div>

        <div className="min-w-0 space-y-5">
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
              <div className="min-w-0 border-b border-line py-2">
                <p className="text-xs font-semibold text-muted">ลักษณะครุภัณฑ์</p>
                <div className="mt-2"><AssetStructureBadge asset={asset} /></div>
              </div>
            </div>
            {asset.assetStructureType === "set" && (
              <>
                <div className="mt-4 space-y-3 md:hidden">
                  {asset.assetSetItems.map((item, index) => (
                    <article key={item.id} className="rounded-lg border border-line bg-surfaceSoft p-4">
                      <p className="text-xs font-semibold text-muted">ลำดับ {index + 1}</p>
                      <h4 className="mt-1 break-words text-sm font-semibold text-ink">{item.itemName}</h4>
                      <dl className="mt-3 text-sm">
                        <dt className="text-xs font-semibold text-muted">รายละเอียด/หมายเหตุ</dt>
                        <dd className="mt-1 break-words text-ink">{item.description || "-"}</dd>
                      </dl>
                    </article>
                  ))}
                  {asset.assetSetItems.length === 0 && (
                    <div className="rounded-lg border border-line bg-surfaceSoft px-4 py-8 text-center text-sm text-muted">ยังไม่มีรายการย่อยในชุดครุภัณฑ์</div>
                  )}
                </div>
                <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line md:block">
                  <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                    <thead className="bg-surfaceSoft text-ink">
                      <tr>
                        {["ลำดับ", "ชื่อรายการย่อย", "รายละเอียด/หมายเหตุ"].map((heading) => (
                          <th key={heading} className="border-b border-line px-3 py-2.5 font-semibold">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
                      {asset.assetSetItems.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-3 py-3 text-muted">{index + 1}</td>
                          <td className="px-3 py-3 font-semibold text-ink">{item.itemName}</td>
                          <td className="px-3 py-3 text-ink">{item.description || "-"}</td>
                        </tr>
                      ))}
                      {asset.assetSetItems.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-muted">ยังไม่มีรายการย่อยในชุดครุภัณฑ์</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-extrabold text-ink">ประวัติการแก้ไขและลบข้อมูล</h3>
                <p className="mt-2 text-sm font-bold text-ink">{asset.assetName}</p>
                <p className="mt-1 text-sm text-primary">{asset.assetNumber}</p>
              </div>
              <CloseIconButton onClick={() => setHistoryOpen(false)} />
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-5">
              {assetLogs.length > 0 ? (
                <div className="space-y-3">
                  {assetLogs.map((log) => {
                    const { oldRows, newRows } = buildHistoryRows(log.oldValue, log.newValue);
                    return (
                      <article key={log.id} className="rounded-lg border border-line bg-surfaceSoft p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted">{formatThaiDateTime(log.createdAt)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getActionBadgeClass(log.actionType)}`}>
                                {getActionLabel(log.actionType)}
                              </span>
                              <span className="text-sm text-ink">โดย <b className="text-ink">{log.userName}</b></span>
                            </div>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-ink">{log.detail}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-line bg-surfaceSoft p-3">
                            <p className="text-xs font-bold text-muted">ข้อมูลเดิม</p>
                            {renderHistoryRows(oldRows)}
                          </div>
                          <div className="rounded-md border border-line bg-surfaceSoft p-3">
                            <p className="text-xs font-bold text-muted">ข้อมูลใหม่</p>
                            {renderHistoryRows(newRows)}
                          </div>
                        </div>
                        {log.note && (
                          <p className="mt-3 rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm text-ink">
                            <span className="font-bold text-ink">หมายเหตุ: </span>{log.note}
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-line bg-surfaceSoft p-6 text-center text-sm text-muted">
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

