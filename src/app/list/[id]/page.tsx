"use client";

import { useParams } from "next/navigation";
import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useEffect } from "react";
import { AssetStructureBadge, BackIconButton, CloseIconButton, DetailInfoItem, PageHeader, RecordFormSection, StatusBadge } from "@/components/ui";
import { getAssetDerivedValues, getNumberPlacementValue, getPurchaseProjectValue } from "@/lib/assets";
import { formatThaiDateTime } from "@/lib/dates";
import { Permissions } from "@/lib/permissions";
import { ActivityLog, AssetListRow, HistoryFieldRow } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

function AssetDetailPage({
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
  const { t } = useLanguage();
  const safeText = (value: string | undefined | null) =>
    value && value !== "-" ? value : "-";
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
  const { phoneValue } = getAssetDerivedValues(asset);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxImage(null); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);

  const assetLogs = activityLogs.filter(
    (log) =>
      log.targetId === asset.id &&
      ["แก้ไข", "ลบ", "กู้คืน"].includes(log.actionType) &&
      !log.detail.includes("ตรวจสอบประจำปี"),
  );

  const getActionBadgeClass = (actionType: ActivityLog["actionType"]) => {
    if (actionType === "ลบ") return "border-danger/30 bg-danger/10 text-danger";
    if (actionType === "กู้คืน") return "border-success/30 bg-success/10 text-success";
    return "border-[#9CD1FC] bg-[#E1F1FE] text-[#044377]";
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
    const fieldOrder = [
      "ชื่อ", "หมายเลขครุภัณฑ์", "จัดซื้อในโครงการ",
      "ตำแหน่งที่ประทับหมายเลขครุภัณฑ์", "สถานะ", "สถานที่",
      "ผู้รับผิดชอบ", "เบอร์โทรผู้รับผิดชอบ", "หมายเหตุ",
      "deleted_at", "deleted_by", "updated_at",
    ];
    const allKeys = Array.from(
      new Set([...fieldOrder, ...Object.keys(oldMap), ...Object.keys(newMap)]),
    ).filter(
      (key) =>
        !hiddenLocationFields.has(key) &&
        !hiddenAssetFields.has(key) &&
        (oldMap[key] !== undefined || newMap[key] !== undefined),
    );
    const changedKeys = new Set(
      allKeys.filter((key) => (oldMap[key] ?? "") !== (newMap[key] ?? "")),
    );
    const oldRows: HistoryFieldRow[] = allKeys
      .filter((key) => key !== "updated_at")
      .map((key) => ({ label: key, value: oldMap[key] ?? "-", changed: changedKeys.has(key) }));
    const newRows: HistoryFieldRow[] = allKeys.map((key) => ({
      label: key,
      value: newMap[key] ?? "-",
      changed: changedKeys.has(key),
    }));
    return { oldRows, newRows };
  };

  const renderHistoryRows = (rows: HistoryFieldRow[]) => (
    <div className="mt-2 space-y-2">
      {rows.length > 0 ? (
        rows.map((row) => (
          <div
            key={row.label}
            className={`rounded-md px-2 py-1 text-sm leading-6 ${row.changed ? "border-l-2 border-warning bg-warning/10" : ""}`}
          >
            <span className={row.changed ? "font-bold text-warning" : "font-semibold text-muted"}>
              {row.label} :{" "}
            </span>
            <span className={row.changed ? "font-bold text-warning" : "text-ink"}>
              {row.value || "-"}
            </span>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted">-</p>
      )}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      <PageHeader
        title={t("det.title")}
        description={t("det.desc")}
        leading={<BackIconButton onClick={onBack} label={t("c.back")} />}
        actions={(
          <>
            {(permissions.canEdit || permissions.canEditLimitedFields) && (
              <button
                onClick={() => onEdit(asset)}
                className="min-h-11 rounded-md bg-gold px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
              >
                {t("det.editBtn")}
              </button>
            )}
            {permissions.canDelete && (
              <button
                onClick={() => onDelete(asset)}
                className="min-h-11 rounded-md border border-danger/30 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10"
              >
                {t("c.delete")}
              </button>
            )}
            {permissions.canEdit && (
              <button
                type="button"
                onClick={() => { if (permissions.canEdit) setHistoryOpen(true); }}
                className="min-h-11 rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
              >
                {t("det.historyBtn")}
              </button>
            )}
          </>
        )}
      />

      {/* Top summary bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3">
        <h3 className="mr-auto min-w-0 break-words text-lg font-extrabold text-ink">
          {asset.assetName}
        </h3>
        <span className="text-sm text-muted">{asset.assetNumber}</span>
        <span className="text-muted">·</span>
        <span className="text-sm text-muted">{asset.organization}</span>
        <StatusBadge value={asset.status} />
      </div>

      {/* Identity card: [1] หมายเลขครุภัณฑ์  [2] ตำแหน่งประทับ  [3] รูปถ่าย */}
      <div className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-extrabold text-slate-950">
            ID
          </span>
          <div>
            <p className="text-sm font-bold text-ink">หมายเลขครุภัณฑ์และตำแหน่งประทับ</p>
            <p className="text-xs text-muted">รหัสและตำแหน่งสติกเกอร์หมายเลขบนตัวครุภัณฑ์จริง</p>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailInfoItem label="หมายเลขครุภัณฑ์" value={safeText(asset.assetNumber)} />
          <DetailInfoItem
            label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์"
            value={getNumberPlacementValue(asset)}
          />
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-bold text-ink">รูปถ่ายครุภัณฑ์</p>
          {asset.assetImages?.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {asset.assetImages.map((image) => (
                <figure
                  key={image.url}
                  className="overflow-hidden rounded-md border border-line bg-surfaceSoft"
                >
                  <button
                    type="button"
                    className="block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    onClick={() => setLightboxImage({ url: image.url, name: image.name })}
                    aria-label={`ดูรูปภาพ: ${image.name}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.name}
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                  <figcaption
                    className="truncate px-2 py-1.5 text-xs text-muted"
                    title={image.name}
                  >
                    {image.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-line bg-surfaceSoft px-3 py-8 text-center text-sm text-muted">
              {t("det.noImages")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {/* Section 1: fields 4-11 */}
        <RecordFormSection
          number={1}
          title={t("det.sec1")}
          description={t("det.sec1desc")}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <DetailInfoItem label="ชื่อรายการครุภัณฑ์" value={safeText(asset.assetName)} />
            <div className="min-w-0 border-b border-line py-2">
              <p className="text-xs font-semibold text-muted">ลักษณะครุภัณฑ์</p>
              <div className="mt-2">
                <AssetStructureBadge asset={asset} />
              </div>
            </div>
            <DetailInfoItem label="ประเภทครุภัณฑ์" value={safeText(asset.assetType)} />
            <DetailInfoItem
              label="ข้อมูลจำเพาะ / คุณลักษณะของครุภัณฑ์"
              value={safeText(asset.assetDescription)}
            />
            <DetailInfoItem label="ปีงบประมาณที่จัดซื้อ" value={safeText(asset.fiscalYear)} />
            <DetailInfoItem label="แหล่งงบประมาณที่ใช้" value={safeText(asset.budgetSource)} />
            <DetailInfoItem label="จัดซื้อในโครงการ" value={getPurchaseProjectValue(asset)} />
            <DetailInfoItem label="วันที่ได้รับครุภัณฑ์" value={safeText(asset.purchaseMonth)} />
          </div>

          {asset.assetStructureType === "set" && (
            <>
              <div className="mt-4 space-y-3 md:hidden">
                {asset.assetSetItems.map((item, index) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-line bg-surfaceSoft p-4"
                  >
                    <p className="text-xs font-semibold text-muted">ลำดับ {index + 1}</p>
                    <h4 className="mt-1 break-words text-sm font-semibold text-ink">
                      {item.itemName}
                    </h4>
                    <dl className="mt-3 text-sm">
                      <dt className="text-xs font-semibold text-muted">รายละเอียด/หมายเหตุ</dt>
                      <dd className="mt-1 break-words text-ink">{item.description || "-"}</dd>
                    </dl>
                  </article>
                ))}
                {asset.assetSetItems.length === 0 && (
                  <div className="rounded-lg border border-line bg-surfaceSoft px-4 py-8 text-center text-sm text-muted">
                    ยังไม่มีรายการย่อยในชุดครุภัณฑ์
                  </div>
                )}
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-line md:block">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-surfaceSoft text-ink">
                    <tr>
                      {["ลำดับ", "ชื่อรายการย่อย", "รายละเอียด/หมายเหตุ"].map((heading) => (
                        <th
                          key={heading}
                          className="border-b border-line px-3 py-2.5 font-semibold"
                        >
                          {heading}
                        </th>
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
                        <td colSpan={3} className="px-3 py-8 text-center text-muted">
                          ยังไม่มีรายการย่อยในชุดครุภัณฑ์
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </RecordFormSection>

        {/* Section 2: fields 12-13 */}
        <RecordFormSection
          number={2}
          title={t("det.sec2")}
          description={t("det.sec2desc")}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 border-b border-line py-2">
              <p className="text-xs font-semibold text-muted">สถานะการใช้งาน</p>
              <div className="mt-2">
                <StatusBadge value={asset.status} />
              </div>
            </div>
            <DetailInfoItem label="หมายเหตุ" value={safeText(asset.note)} />
          </div>
        </RecordFormSection>

        {/* Section 3: fields 14-17 */}
        <RecordFormSection
          number={3}
          title={t("det.sec3")}
          description={t("det.sec3desc")}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <DetailInfoItem
              label="องค์กรนักศึกษา/หน่วยงานที่รับผิดชอบ"
              value={safeText(asset.organization)}
            />
            <DetailInfoItem label="สถานที่จัดเก็บ" value={safeText(asset.location)} />
            <DetailInfoItem
              label="ผู้รับผิดชอบ"
              value={safeText(asset.responsiblePerson)}
            />
            <DetailInfoItem
              label="หมายเลขโทรศัพท์"
              value={phoneValue && phoneValue !== "-" ? phoneValue : "-"}
            />
          </div>
        </RecordFormSection>
      </div>

      {/* History modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-extrabold text-ink">{t("det.history.title")}</h3>
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
                      <article
                        key={log.id}
                        className="rounded-lg border border-line bg-surfaceSoft p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted">
                              {formatThaiDateTime(log.createdAt)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getActionBadgeClass(log.actionType)}`}
                              >
                                {getActionLabel(log.actionType)}
                              </span>
                              <span className="text-sm text-ink">
                                โดย <b className="text-ink">{log.userName}</b>
                              </span>
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
                            <span className="font-bold text-ink">หมายเหตุ: </span>
                            {log.note}
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

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="ดูรูปภาพขนาดใหญ่"
        >
          <div
            className="relative flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              aria-label="ปิดการดูรูปภาพ"
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            />
            {lightboxImage.name && (
              <p className="mt-2 text-center text-sm text-slate-300">{lightboxImage.name}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


export default function AssetDetailRoute() {
  const params = useParams<{ id: string }>();
  const { permissions, assets, activityLogs, onEditAsset, onDeleteAsset, onBackToList } =
    useAppData();
  if (!permissions.canViewList)
    return <PlaceholderPage title="ไม่มีสิทธิ์ดูรายละเอียดครุภัณฑ์" />;
  const asset = assets.find((item) => String(item.id) === params.id);
  if (!asset) return <PlaceholderPage title="ไม่พบครุภัณฑ์รายการนี้" />;
  return (
    <AssetDetailPage
      asset={asset}
      activityLogs={activityLogs}
      permissions={permissions}
      onEdit={onEditAsset}
      onDelete={onDeleteAsset}
      onBack={onBackToList}
    />
  );
}
