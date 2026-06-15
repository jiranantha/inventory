"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";
import { assetDetailHref } from "@/lib/routes";

import { useState, useMemo } from "react";
import { AssetSetItemsEditor, BackIconButton, DetailInfoItem, Field, FiscalYearField, PageHeader, PhoneField, RecordFormSection, SearchableOrganizationSelect, SelectField, TextAreaField, ThaiDateField } from "@/components/ui";
import { budgetSourceOptions } from "@/constants/options";
import { getAssetDerivedValues, getNumberPlacementValue, getPurchaseProjectValue, normalizeAssetType } from "@/lib/assets";
import { formatThaiDate, toDateInputValue } from "@/lib/dates";
import { getOrganizationType, normalizeOrganizationName } from "@/lib/organizations";
import { Permissions } from "@/lib/permissions";
import { AssetListRow, AssetSetItem, Organization } from "@/types";
import { allowedAssetStatuses } from "@/constants/statuses";

function AssetEditPage({
  asset,
  permissions,
  onSave,
  onCancel,
  organizationOptions,
  equipmentTypeOptions,
  locationOptions,
  existingAssets,
}: {
  asset: AssetListRow;
  permissions: Permissions;
  onSave: (asset: AssetListRow, oldAsset: AssetListRow) => void;
  onCancel: () => void;
  organizationOptions: Organization[];
  equipmentTypeOptions: string[];
  locationOptions: string[];
  existingAssets: AssetListRow[];
}) {
  const [assetCode] = useState(asset.assetCode);
  const [purchaseProject, setPurchaseProject] = useState(getPurchaseProjectValue(asset) === "-" ? "" : getPurchaseProjectValue(asset));
  const [assetNumber, setAssetNumber] = useState(asset.assetNumber);
  const [numberPlacement, setNumberPlacement] = useState(getNumberPlacementValue(asset) === "-" ? "" : getNumberPlacementValue(asset));
  const [assetStructureType, setAssetStructureType] = useState<"single" | "set">(asset.assetStructureType ?? "single");
  const [assetSetItems, setAssetSetItems] = useState<AssetSetItem[]>(asset.assetSetItems ?? []);
  const [assetName, setAssetName] = useState(asset.assetName);
  const [assetDescription, setAssetDescription] = useState(asset.assetDescription);
  const [assetType, setAssetType] = useState(normalizeAssetType(asset.assetType, `${asset.assetName} ${asset.assetDescription}`));
  const [price, setPrice] = useState(asset.price ?? getAssetDerivedValues(asset).priceValue);
  const [fiscalYear, setFiscalYear] = useState(asset.fiscalYear);
  const [fiscalYearError, setFiscalYearError] = useState("");
  const [budgetSource, setBudgetSource] = useState(asset.budgetSource ?? "");
  const [recordDate, setRecordDate] = useState(toDateInputValue(asset.recordDate));
  const [receivedDate, setReceivedDate] = useState(toDateInputValue(asset.purchaseMonth));
  const [location, setLocation] = useState(asset.location);
  const [status, setStatus] = useState(asset.status);
  const [responsiblePerson, setResponsiblePerson] = useState(asset.responsiblePerson);
  const initialResponsiblePhone = asset.responsiblePhone ?? getAssetDerivedValues(asset).phoneValue;
  const [responsiblePhone, setResponsiblePhone] = useState(/^[0-9]+$/.test(initialResponsiblePhone) ? initialResponsiblePhone.slice(0, 10) : "");
  const [responsiblePhoneError, setResponsiblePhoneError] = useState("");
  const normalizedAssetOrganization = normalizeOrganizationName(asset.organization);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(
    organizationOptions.find((item) => item.name === normalizedAssetOrganization) ?? { name: normalizedAssetOrganization, type: getOrganizationType(normalizedAssetOrganization) },
  );
  const [note, setNote] = useState(asset.note === "-" ? "" : asset.note);
  const formattedPrice = useMemo(() => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return asset.price ?? "";
    return parsedPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [asset.price, price]);

  const handleSave = () => {
    if (!/^[0-9]{4}$/.test(fiscalYear)) {
      setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
      return;
    }
    setFiscalYearError("");
    if (responsiblePhone && !/^[0-9]+$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น");
      return;
    }
    if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
      return;
    }
    setResponsiblePhoneError("");
    if (assetStructureType === "set") {
      const invalidSetItems = assetSetItems.length === 0 || assetSetItems.some((item) => !item.itemName.trim());
      if (invalidSetItems) {
        window.alert("ครุภัณฑ์แบบชุดต้องมีรายการย่อยอย่างน้อย 1 รายการ และต้องกรอกชื่อรายการย่อยให้ครบ");
        return;
      }
    }
    // Full editors must satisfy the same required-field and unique-number invariants the
    // create form enforces. Limited-field editors only change location, so they skip this.
    if (permissions.canEdit) {
      const requiredFields: Array<[string, string]> = [
        [assetName.trim(), "ชื่อรายการครุภัณฑ์"],
        [assetNumber.trim(), "หมายเลขครุภัณฑ์"],
        [responsiblePerson.trim(), "ชื่อผู้รับผิดชอบ"],
        [status.trim(), "สถานะครุภัณฑ์"],
      ];
      const missing = requiredFields.find(([value]) => !value);
      if (missing || !selectedOrganization) {
        window.alert(`กรุณากรอก${missing ? missing[1] : "ฝ่าย/ชมรมที่รับผิดชอบ"}ให้ครบก่อนบันทึก`);
        return;
      }
      const cleanAssetNumber = assetNumber.trim();
      const duplicate = existingAssets.some(
        (item) => item.id !== asset.id && !item.deletedAt && item.assetNumber.trim() === cleanAssetNumber,
      );
      if (duplicate) {
        window.alert("หมายเลขครุภัณฑ์นี้มีอยู่แล้วในระบบ กรุณาใช้หมายเลขอื่น");
        return;
      }
    }
    onSave({
      ...asset,
      assetCode,
      assetNumber,
      assetStructureType,
      assetSetItems: assetStructureType === "set"
        ? assetSetItems.map((item) => ({
            ...item,
            assetId: asset.id,
            itemName: item.itemName.trim(),
            quantity: "1",
            unit: "-",
            description: item.description.trim() || "-",
            updatedAt: new Date().toLocaleString("th-TH"),
          }))
        : [],
      assetName,
      assetDescription: assetDescription.trim() || assetName,
      assetType,
      price: formattedPrice,
      purchaseProject: purchaseProject.trim() || "-",
      numberPlacement: numberPlacement.trim() || "-",
      fiscalYear,
      budgetSource,
      recordDate: formatThaiDate(recordDate),
      purchaseMonth: formatThaiDate(receivedDate),
      location,
      status,
      responsiblePerson: responsiblePerson.trim() || "ยังไม่ได้ระบุ",
      responsiblePhone: responsiblePhone.trim() || "-",
      note: note.trim() || "-",
      organization: selectedOrganization?.name ?? asset.organization,
      organizationType: selectedOrganization?.type ?? asset.organizationType,
      updatedAt: new Date().toLocaleString("th-TH"),
    }, asset);
  };

  const handleStructureTypeChange = (value: string) => {
    const nextType = value === "ครุภัณฑ์แบบชุด" ? "set" : "single";
    if (assetStructureType === "set" && nextType === "single" && assetSetItems.length > 0) {
      const confirmed = window.confirm("หากเปลี่ยนเป็นครุภัณฑ์เดี่ยว รายการย่อยในชุดจะถูกลบ ต้องการดำเนินการต่อหรือไม่");
      if (!confirmed) return;
      setAssetSetItems([]);
    }
    if (assetStructureType === "single" && nextType === "set" && assetSetItems.length === 0) {
      const now = new Date().toLocaleString("th-TH");
      setAssetSetItems([{ id: Date.now(), assetId: asset.id, itemName: "", quantity: "1", unit: "-", description: "", createdAt: now, updatedAt: now }]);
    }
    setAssetStructureType(nextType);
  };

  return (
    <section className="mx-auto w-full max-w-screen-2xl space-y-5">
      <PageHeader
        title="แก้ไขข้อมูลครุภัณฑ์"
        description="แก้ไขข้อมูลครุภัณฑ์ตามสิทธิ์ของผู้ใช้งาน"
        leading={<BackIconButton onClick={onCancel} label="ย้อนกลับ" />}
        actions={<button onClick={handleSave} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-hover">บันทึกการแก้ไข</button>}
      />
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="mb-5 break-words text-sm font-semibold text-muted">รายการที่แก้ไข: <span className="text-ink">{asset.assetName}</span></p>
        <div className="space-y-5">
        <RecordFormSection number={1} title="ข้อมูลระบุตัวตนครุภัณฑ์" description="ระบุหมายเลข ชื่อ ประเภท และรายละเอียดจำเพาะของครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="ชื่อรายการครุภัณฑ์" value={assetName} onChange={(event) => setAssetName(event.target.value)} disabled={permissions.canEditLimitedFields} />
            <Field label="หมายเลขครุภัณฑ์" value={assetNumber} onChange={(event) => setAssetNumber(event.target.value)} disabled={permissions.canEditLimitedFields} />
            <Field
              label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์"
              value={numberPlacement}
              onChange={(event) => setNumberPlacement(event.target.value)}
              placeholder="เช่น ด้านหลังเครื่อง / ใต้โต๊ะ / ข้างกล่อง / บริเวณขาตั้ง / ไม่มีการประทับหมายเลข"
            />
            <SelectField
              label="ลักษณะครุภัณฑ์"
              value={assetStructureType === "set" ? "ครุภัณฑ์แบบชุด" : "ครุภัณฑ์เดี่ยว"}
              onChange={handleStructureTypeChange}
              options={["ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"]}
            />
            <SelectField label="ประเภทครุภัณฑ์" value={assetType} onChange={setAssetType} options={equipmentTypeOptions} />
            <Field label="มูลค่าทรัพย์สิน" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="เช่น 25000.00" />
            <TextAreaField label="รายละเอียดครุภัณฑ์" value={assetDescription} onChange={(event) => setAssetDescription(event.target.value)} placeholder="รายละเอียด รุ่น สี ขนาด ยี่ห้อ หรือข้อมูลจำเพาะ" autoResize />
            <TextAreaField
              label="จัดซื้อในโครงการ"
              value={purchaseProject}
              onChange={(event) => setPurchaseProject(event.target.value)}
              placeholder="เช่น โครงการจัดซื้อครุภัณฑ์และอุปกรณ์เพื่อการจัดเก็บ ดูแล และรักษาความปลอดภัยของครุภัณฑ์ชมรมนักศึกษา"
              autoResize
            />
            {assetStructureType === "set" && (
              <div className="lg:col-span-2">
                <AssetSetItemsEditor items={assetSetItems} onChange={setAssetSetItems} />
              </div>
            )}
          </div>
        </RecordFormSection>

        <RecordFormSection number={2} title="ข้อมูลปีและวันที่" description="ระบุปีงบประมาณ แหล่งงบประมาณ วันที่บันทึกข้อมูล และวันที่ได้รับครุภัณฑ์จริง">
          <div className="grid gap-4 md:grid-cols-2">
            <FiscalYearField
              value={fiscalYear}
              onChange={(value) => {
                setFiscalYear(value);
                if (/^[0-9]{4}$/.test(value)) setFiscalYearError("");
              }}
              error={fiscalYearError}
              onInvalidInput={() => setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก")}
              onBlur={() => {
                if (!/^[0-9]{4}$/.test(fiscalYear)) {
                  setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
                }
              }}
            />
            <SelectField label="แหล่งงบประมาณ" value={budgetSource} onChange={setBudgetSource} options={budgetSourceOptions} placeholder="เลือกแหล่งงบประมาณ" />
            <ThaiDateField label="วันที่บันทึกข้อมูล" value={recordDate} onChange={setRecordDate} disabled={permissions.canEditLimitedFields} />
            <ThaiDateField label="วันที่ได้รับครุภัณฑ์" value={receivedDate} onChange={setReceivedDate} disabled={permissions.canEditLimitedFields} />
          </div>
        </RecordFormSection>

        <RecordFormSection number={3} title="ข้อมูลองค์กร/ฝ่าย/ชมรมและสถานที่จัดเก็บ" description="เลือกฝ่ายหรือชมรมที่รับผิดชอบ และระบุสถานที่จัดเก็บครุภัณฑ์">
          <div className="grid gap-4 lg:grid-cols-2">
            {permissions.canEditLimitedFields ? <DetailInfoItem label="ฝ่าย/ชมรมที่รับผิดชอบ" value={selectedOrganization?.name ?? ""} /> : <SearchableOrganizationSelect selected={selectedOrganization} onSelect={setSelectedOrganization} options={organizationOptions} />}
            <div>
              <SelectField label="สถานที่จัดเก็บ" value={location} onChange={setLocation} options={locationOptions.includes(location) ? locationOptions : [location, ...locationOptions]} placeholder="เลือกสถานที่จัดเก็บ" />
              <p className="mt-2 text-xs leading-5 text-muted">หากเลือก “ห้องชมรม” ระบบจะอ้างอิงจากฝ่าย/ชมรมที่รับผิดชอบ</p>
            </div>
          </div>
        </RecordFormSection>

        <RecordFormSection number={4} title="ข้อมูลผู้รับผิดชอบ" description="ระบุผู้ดูแลครุภัณฑ์และเบอร์โทรสำหรับติดต่อเมื่อตรวจสอบประจำปี">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ชื่อผู้รับผิดชอบ" value={responsiblePerson} onChange={(event) => setResponsiblePerson(event.target.value)} />
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => {
                setResponsiblePhone(value);
                if (/^[0-9]{9,10}$/.test(value) || !value) setResponsiblePhoneError("");
              }}
              error={responsiblePhoneError}
              onInvalidInput={() => setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น")}
              onBlur={() => {
                if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
                  setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
                }
              }}
            />
          </div>
        </RecordFormSection>

        <RecordFormSection number={5} title="ข้อมูลสถานะและหลักฐาน" description="บันทึกสภาพปัจจุบันของครุภัณฑ์ พร้อมแนบรูปภาพหรือหมายเหตุประกอบ">
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField label="สถานะครุภัณฑ์" value={status} onChange={setStatus} options={allowedAssetStatuses} />
            <div className="rounded-lg border border-dashed border-line bg-surfaceSoft px-4 py-3 text-sm text-ink">
              <p className="font-semibold text-ink">รูปภาพครุภัณฑ์</p>
              <p className="mt-2 text-xs text-muted">มีรูปภาพเดิม {asset.imageCount.toLocaleString("th-TH")} รูป</p>
            </div>
            <div className="lg:col-span-2">
              <TextAreaField label="หมายเหตุ" value={note} onChange={(event) => setNote(event.target.value)} autoResize />
            </div>
          </div>
        </RecordFormSection>
        </div>
      </div>
    </section>
  );
}


export default function AssetEditRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { permissions, assets, onSaveAsset, activeOrganizations, activeEquipmentTypes, activeLocations } = useAppData();
  if (!(permissions.canEdit || permissions.canEditLimitedFields)) return <PlaceholderPage title="ไม่มีสิทธิ์แก้ไขข้อมูล" />;
  const asset = assets.find((item) => String(item.id) === params.id);
  if (!asset) return <PlaceholderPage title="ไม่พบครุภัณฑ์รายการนี้" />;
  return (
    <AssetEditPage
      asset={asset}
      permissions={permissions}
      onSave={onSaveAsset}
      onCancel={() => router.push(assetDetailHref(asset))}
      organizationOptions={activeOrganizations}
      equipmentTypeOptions={activeEquipmentTypes}
      locationOptions={activeLocations}
      existingAssets={assets}
    />
  );
}
