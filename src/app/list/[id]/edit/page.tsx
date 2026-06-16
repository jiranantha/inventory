"use client";

import { useParams, useRouter } from "next/navigation";
import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";
import { assetDetailHref } from "@/lib/routes";

import { useState, useMemo } from "react";
import {
  AssetSetItemsEditor,
  BackIconButton,
  DetailInfoItem,
  Field,
  FieldError,
  FiscalYearField,
  PhoneField,
  RecordFormSection,
  SearchableOrganizationSelect,
  SelectField,
  TextAreaField,
  ThaiDateField,
} from "@/components/ui";
import { budgetSourceOptions } from "@/constants/options";
import {
  getAssetDerivedValues,
  getNumberPlacementValue,
  getPurchaseProjectValue,
  normalizeAssetType,
} from "@/lib/assets";
import { formatThaiDate, toDateInputValue } from "@/lib/dates";
import { uploadImage } from "@/lib/image-upload";
import { getOrganizationType, normalizeOrganizationName } from "@/lib/organizations";
import { Permissions } from "@/lib/permissions";
import { AssetListRow, AssetSetItem, EvidenceImage, Organization } from "@/types";
import { allowedAssetStatuses } from "@/constants/statuses";

// ── Inline Alert Dialog ───────────────────────────────────────────────────────
type DialogConfig = {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
};

function AlertDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {message && <p className="mt-2 text-sm leading-6 text-muted">{message}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-hover"
          >
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit page component ───────────────────────────────────────────────────────
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
  // Admin = canManageUsers. Only admins can edit the asset number.
  const isAdmin = permissions.canManageUsers;

  const initialNumberPlacement =
    getNumberPlacementValue(asset) === "-" ? "" : getNumberPlacementValue(asset);
  const initialPurchaseProject =
    getPurchaseProjectValue(asset) === "-" ? "" : getPurchaseProjectValue(asset);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [assetCode] = useState(asset.assetCode);
  const [assetNumber, setAssetNumber] = useState(asset.assetNumber);
  const [numberPlacement, setNumberPlacement] = useState(initialNumberPlacement);
  const [purchaseProject, setPurchaseProject] = useState(initialPurchaseProject);
  const [assetStructureType, setAssetStructureType] = useState<"single" | "set">(
    asset.assetStructureType ?? "single",
  );
  const [assetSetItems, setAssetSetItems] = useState<AssetSetItem[]>(
    asset.assetSetItems ?? [],
  );
  const [assetName, setAssetName] = useState(asset.assetName);
  const [assetDescription, setAssetDescription] = useState(asset.assetDescription);
  const [assetType, setAssetType] = useState(
    normalizeAssetType(asset.assetType, `${asset.assetName} ${asset.assetDescription}`),
  );
  const [price, setPrice] = useState(
    asset.price ?? getAssetDerivedValues(asset).priceValue,
  );
  const [fiscalYear, setFiscalYear] = useState(asset.fiscalYear);
  const [fiscalYearError, setFiscalYearError] = useState("");
  const [budgetSource, setBudgetSource] = useState(asset.budgetSource ?? "");
  const recordDate = toDateInputValue(asset.recordDate);
  const [receivedDate, setReceivedDate] = useState(toDateInputValue(asset.purchaseMonth));
  const [location, setLocation] = useState(asset.location);
  const [status, setStatus] = useState(asset.status);
  const [responsiblePerson, setResponsiblePerson] = useState(asset.responsiblePerson);
  const initialResponsiblePhone =
    asset.responsiblePhone ?? getAssetDerivedValues(asset).phoneValue;
  const [responsiblePhone, setResponsiblePhone] = useState(
    /^[0-9]+$/.test(initialResponsiblePhone)
      ? initialResponsiblePhone.slice(0, 10)
      : "",
  );
  const [responsiblePhoneError, setResponsiblePhoneError] = useState("");
  const normalizedAssetOrganization = normalizeOrganizationName(asset.organization);
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(
      organizationOptions.find((item) => item.name === normalizedAssetOrganization) ??
        {
          name: normalizedAssetOrganization,
          type: getOrganizationType(normalizedAssetOrganization),
        },
    );
  const [note, setNote] = useState(asset.note === "-" ? "" : asset.note);
  const [assetImages, setAssetImages] = useState<EvidenceImage[]>(
    asset.assetImages ?? [],
  );
  const [imageUploadError, setImageUploadError] = useState("");

  // Alert dialog
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const closeDialog = () => setDialog(null);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const formattedPrice = useMemo(() => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return asset.price ?? "";
    return parsedPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [asset.price, price]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!/^[0-9]{4}$/.test(fiscalYear)) {
      setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
      return false;
    }
    setFiscalYearError("");

    if (responsiblePhone && !/^[0-9]+$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น");
      return false;
    }
    if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) {
      setResponsiblePhoneError("กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก");
      return false;
    }
    setResponsiblePhoneError("");

    if (assetStructureType === "set") {
      const invalid =
        assetSetItems.length === 0 ||
        assetSetItems.some((item: AssetSetItem) => !item.itemName.trim());
      if (invalid) {
        setDialog({
          title: "ข้อมูลครุภัณฑ์แบบชุดไม่ครบถ้วน",
          message:
            "ครุภัณฑ์แบบชุดต้องมีรายการย่อยอย่างน้อย 1 รายการ และต้องกรอกชื่อรายการย่อยให้ครบ",
          onConfirm: closeDialog,
        });
        return false;
      }
    }

    if (permissions.canEdit) {
      const requiredFields: Array<[string, string]> = [
        [assetName.trim(), "ชื่อรายการครุภัณฑ์"],
        [assetNumber.trim(), "หมายเลขครุภัณฑ์"],
        [responsiblePerson.trim(), "ชื่อผู้รับผิดชอบ"],
        [status.trim(), "สถานะครุภัณฑ์"],
      ];
      const missing = requiredFields.find(([value]) => !value);
      if (missing || !selectedOrganization) {
        setDialog({
          title: "ข้อมูลไม่ครบถ้วน",
          message: `กรุณากรอก${missing ? missing[1] : "ฝ่าย/ชมรมที่รับผิดชอบ"}ให้ครบก่อนบันทึก`,
          onConfirm: closeDialog,
        });
        return false;
      }
      const duplicate = existingAssets.some(
        (item: AssetListRow) =>
          item.id !== asset.id &&
          !item.deletedAt &&
          item.assetNumber.trim() === assetNumber.trim(),
      );
      if (duplicate) {
        setDialog({
          title: "หมายเลขครุภัณฑ์ซ้ำ",
          message: "หมายเลขครุภัณฑ์นี้มีอยู่แล้วในระบบ กรุณาใช้หมายเลขอื่น",
          onConfirm: closeDialog,
        });
        return false;
      }
    }
    return true;
  };

  // ── Perform the actual save ──────────────────────────────────────────────────
  const performSave = () => {
    onSave(
      {
        ...asset,
        assetCode,
        assetNumber,
        assetStructureType,
        assetSetItems:
          assetStructureType === "set"
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
        assetImages,
        imageCount: assetImages.length,
        updatedAt: new Date().toLocaleString("th-TH"),
      },
      asset,
    );
  };

  // ── Save button handler — chains confirmations for sensitive fields ──────────
  const handleSaveClick = () => {
    if (!validate()) return;

    const numberChanged =
      isAdmin && assetNumber.trim() !== asset.assetNumber.trim();
    const placementChanged =
      numberPlacement.trim() !== initialNumberPlacement.trim();

    const doSave = () => {
      closeDialog();
      performSave();
    };

    const confirmPlacement = () => {
      if (placementChanged) {
        setDialog({
          title: "ยืนยันการแก้ไขตำแหน่งที่ประทับหมายเลขครุภัณฑ์",
          message: `ตำแหน่งใหม่: "${numberPlacement.trim() || "-"}"`,
          onConfirm: doSave,
        });
      } else {
        performSave();
      }
    };

    if (numberChanged) {
      setDialog({
        title: "ยืนยันการแก้ไขหมายเลขครุภัณฑ์",
        message: `หมายเลขใหม่: "${assetNumber.trim()}"`,
        onConfirm: () => {
          closeDialog();
          confirmPlacement();
        },
      });
    } else {
      confirmPlacement();
    }
  };

  // ── Structure type change (replaces window.confirm) ─────────────────────────
  const handleStructureTypeChange = (value: string) => {
    const nextType = value === "ครุภัณฑ์แบบชุด" ? "set" : "single";
    if (
      assetStructureType === "set" &&
      nextType === "single" &&
      assetSetItems.length > 0
    ) {
      setDialog({
        title: "เปลี่ยนเป็นครุภัณฑ์เดี่ยว",
        message:
          "หากเปลี่ยนเป็นครุภัณฑ์เดี่ยว รายการย่อยในชุดจะถูกลบ ต้องการดำเนินการต่อหรือไม่",
        onConfirm: () => {
          setAssetSetItems([]);
          setAssetStructureType("single");
          closeDialog();
        },
      });
      return;
    }
    if (
      assetStructureType === "single" &&
      nextType === "set" &&
      assetSetItems.length === 0
    ) {
      const now = new Date().toLocaleString("th-TH");
      setAssetSetItems([
        {
          id: Date.now(),
          assetId: asset.id,
          itemName: "",
          quantity: "1",
          unit: "-",
          description: "",
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    setAssetStructureType(nextType);
  };

  // ── Image handlers ──────────────────────────────────────────────────────────
  const handleAddImages = (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    setDialog({
      title: "ยืนยันการเพิ่มรูปภาพครุภัณฑ์",
      message: `ต้องการเพิ่มรูปภาพ ${selectedFiles.length} รูป ใช่หรือไม่`,
      onConfirm: async () => {
        closeDialog();
        try {
          setImageUploadError("");
          const newImages = await Promise.all(
            selectedFiles.map((file) => uploadImage(file, "assets")),
          );
          setAssetImages((prev) => [...prev, ...newImages]);
        } catch (error) {
          setImageUploadError(
            error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ",
          );
        }
      },
    });
  };

  const handleDeleteImage = (index: number) => {
    setDialog({
      title: "ยืนยันการลบรูปภาพครุภัณฑ์",
      message: `ต้องการลบรูปภาพ "${assetImages[index]?.name}" ออกจากครุภัณฑ์นี้ใช่หรือไม่`,
      onConfirm: () => {
        setAssetImages((prev) => prev.filter((_, i) => i !== index));
        closeDialog();
      },
    });
  };

  const handleReplaceImage = (index: number, files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const file = selectedFiles[0];
    setDialog({
      title: "ยืนยันการเปลี่ยนรูปภาพครุภัณฑ์",
      message: `ต้องการเปลี่ยนรูปภาพ "${assetImages[index]?.name}" ด้วยรูปใหม่ "${file.name}" ใช่หรือไม่`,
      onConfirm: async () => {
        closeDialog();
        try {
          setImageUploadError("");
          const newImage = await uploadImage(file, "assets");
          setAssetImages((prev) =>
            prev.map((img, i) => (i === index ? newImage : img)),
          );
        } catch (error) {
          setImageUploadError(
            error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ",
          );
        }
      },
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="relative mx-auto w-full max-w-screen-2xl space-y-5">
      {dialog && (
        <AlertDialog
          title={dialog.title}
          message={dialog.message}
          onCancel={closeDialog}
          onConfirm={dialog.onConfirm}
        />
      )}

      {/* Top navigation */}
      <div className="flex items-start gap-3">
        <BackIconButton onClick={onCancel} label="ย้อนกลับ" />
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white">แก้ไขข้อมูลครุภัณฑ์</h1>
          <p className="mt-0.5 truncate text-sm text-muted">{asset.assetName}</p>
        </div>
      </div>

      {/* Identity card — asset number + placement */}
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
          <div>
            <Field
              label="หมายเลขครุภัณฑ์"
              value={assetNumber}
              onChange={(event) => setAssetNumber(event.target.value)}
              disabled={!isAdmin}
              placeholder={asset.assetNumber}
            />
            {!isAdmin && (
              <p className="mt-1.5 text-xs text-muted">
                เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขหมายเลขครุภัณฑ์ได้
              </p>
            )}
          </div>
          <Field
            label="ตำแหน่งที่ประทับหมายเลขครุภัณฑ์"
            value={numberPlacement}
            onChange={(event) => setNumberPlacement(event.target.value)}
            placeholder="เช่น ด้านหลังเครื่อง / ใต้โต๊ะ / ข้างกล่อง / บริเวณขาตั้ง"
          />
        </div>
      </div>

      {/* Form sections — follow record page structure */}
      <div className="space-y-5">
        <RecordFormSection
          number={1}
          title="ข้อมูลทั่วไปของครุภัณฑ์"
          description="ระบุข้อมูลหลัก งบประมาณ โครงการ และวันที่ได้รับครุภัณฑ์"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="ชื่อรายการครุภัณฑ์"
              value={assetName}
              onChange={(event) => setAssetName(event.target.value)}
              disabled={permissions.canEditLimitedFields}
            />
            <SelectField
              label="ลักษณะครุภัณฑ์"
              value={assetStructureType === "set" ? "ครุภัณฑ์แบบชุด" : "ครุภัณฑ์เดี่ยว"}
              onChange={handleStructureTypeChange}
              options={["ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"]}
            />
            <SelectField
              label="ประเภทครุภัณฑ์"
              value={assetType}
              onChange={setAssetType}
              options={equipmentTypeOptions}
            />
            <TextAreaField
              label="ข้อมูลจำเพาะ / คุณลักษณะของครุภัณฑ์"
              value={assetDescription}
              onChange={(event) => setAssetDescription(event.target.value)}
              placeholder="ระบุรุ่น สี ขนาด ยี่ห้อ หรือข้อมูลจำเพาะ"
              autoResize
            />
            <div>
              <FiscalYearField
                value={fiscalYear}
                onChange={(value) => {
                  setFiscalYear(value);
                  if (/^[0-9]{4}$/.test(value)) setFiscalYearError("");
                }}
                error={fiscalYearError}
                onInvalidInput={() =>
                  setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก")
                }
                onBlur={() => {
                  if (!/^[0-9]{4}$/.test(fiscalYear))
                    setFiscalYearError("กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก");
                }}
              />
              <FieldError message={fiscalYearError} />
            </div>
            <SelectField
              label="แหล่งงบประมาณที่ใช้"
              value={budgetSource}
              onChange={setBudgetSource}
              options={budgetSourceOptions}
              placeholder="เลือกแหล่งงบประมาณ"
            />
            <TextAreaField
              label="จัดซื้อในโครงการ"
              value={purchaseProject}
              onChange={(event) => setPurchaseProject(event.target.value)}
              placeholder="เช่น โครงการจัดซื้อครุภัณฑ์และอุปกรณ์"
              autoResize
            />
            <ThaiDateField
              label="วันที่ได้รับครุภัณฑ์"
              value={receivedDate}
              onChange={setReceivedDate}
              disabled={permissions.canEditLimitedFields}
            />
            <Field
              label="มูลค่าทรัพย์สิน"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="เช่น 25000.00"
            />
            {assetStructureType === "set" && (
              <div className="lg:col-span-2">
                <AssetSetItemsEditor items={assetSetItems} onChange={setAssetSetItems} />
              </div>
            )}
          </div>
        </RecordFormSection>

        <RecordFormSection
          number={2}
          title="ข้อมูลสถานะ"
          description="ระบุสถานะการใช้งานและหมายเหตุของครุภัณฑ์"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <SelectField
              label="สถานะการใช้งาน"
              value={status}
              onChange={setStatus}
              options={allowedAssetStatuses}
            />
            <TextAreaField
              label="หมายเหตุ"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="ระบุหมายเหตุเพิ่มเติม"
              autoResize
            />
          </div>
        </RecordFormSection>

        <RecordFormSection
          number={3}
          title="หน่วยงานที่ครอบครองและเก็บรักษา"
          description="ระบุหน่วยงาน สถานที่จัดเก็บ และผู้รับผิดชอบครุภัณฑ์"
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {permissions.canEditLimitedFields ? (
              <DetailInfoItem
                label="ฝ่าย/ชมรมที่รับผิดชอบ"
                value={selectedOrganization?.name ?? ""}
              />
            ) : (
              <SearchableOrganizationSelect
                selected={selectedOrganization}
                onSelect={setSelectedOrganization}
                options={organizationOptions}
                label="องค์กรนักศึกษา/หน่วยงานที่รับผิดชอบ"
              />
            )}
            <div>
              <SelectField
                label="สถานที่จัดเก็บ"
                value={location}
                onChange={setLocation}
                options={
                  locationOptions.includes(location)
                    ? locationOptions
                    : [location, ...locationOptions]
                }
                placeholder="เลือกสถานที่จัดเก็บ"
              />
              <p className="mt-2 text-xs leading-5 text-muted">
                หากเลือก &ldquo;ห้องชมรม&rdquo; ระบบจะอ้างอิงจากฝ่าย/ชมรมที่รับผิดชอบ
              </p>
            </div>
            <Field
              label="ชื่อผู้รับผิดชอบ"
              value={responsiblePerson}
              onChange={(event) => setResponsiblePerson(event.target.value)}
            />
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => {
                setResponsiblePhone(value);
                if (/^[0-9]{9,10}$/.test(value) || !value)
                  setResponsiblePhoneError("");
              }}
              error={responsiblePhoneError}
              onInvalidInput={() =>
                setResponsiblePhoneError(
                  "กรุณากรอกหมายเลขโทรศัพท์เป็นตัวเลขเท่านั้น",
                )
              }
              onBlur={() => {
                if (
                  responsiblePhone &&
                  !/^[0-9]{9,10}$/.test(responsiblePhone)
                ) {
                  setResponsiblePhoneError(
                    "กรุณากรอกหมายเลขโทรศัพท์ให้ถูกต้อง 9-10 หลัก",
                  );
                }
              }}
            />
          </div>
        </RecordFormSection>

        <RecordFormSection
          number={4}
          title="รูปภาพครุภัณฑ์"
          description="อัปโหลด เปลี่ยน หรือลบรูปภาพของครุภัณฑ์ การเปลี่ยนแปลงทุกอย่างต้องยืนยันก่อนบันทึก"
        >
          <div className="space-y-4">
            {imageUploadError && (
              <p className="rounded-md border border-red-400/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {imageUploadError}
              </p>
            )}

            {assetImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {assetImages.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="overflow-hidden rounded-lg border border-line bg-slate-950/40"
                  >
                    <div
                      role="img"
                      aria-label={image.name}
                      className="h-24 w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${image.url})` }}
                    />
                    <div className="space-y-1.5 p-2">
                      <p
                        className="truncate text-xs text-ink"
                        title={image.name}
                      >
                        {image.name}
                      </p>
                      <div className="flex gap-1">
                        <label className="flex-1 cursor-pointer rounded border border-line bg-surfaceSoft px-2 py-1 text-center text-xs font-semibold text-ink hover:border-primary hover:text-primary">
                          เปลี่ยน
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            className="sr-only"
                            onChange={(event) =>
                              handleReplaceImage(index, event.target.files)
                            }
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(index)}
                          className="flex-1 rounded border border-line bg-surfaceSoft px-2 py-1 text-xs font-semibold text-danger hover:border-danger hover:bg-danger/10"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีรูปภาพครุภัณฑ์</p>
            )}

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-surfaceSoft px-4 py-3 hover:border-primary">
              <span className="text-sm font-semibold text-ink">+ เพิ่มรูปภาพ</span>
              <span className="text-xs text-muted">(.jpg, .png, .webp)</span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => handleAddImages(event.target.files)}
              />
            </label>
          </div>
        </RecordFormSection>
      </div>

      {/* Sticky bottom bar — same style as record page */}
      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-line bg-navy/90 p-4 backdrop-blur">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-line bg-surfaceSoft px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={handleSaveClick}
          className="rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-primary-hover"
        >
          บันทึกการแก้ไข
        </button>
      </div>
    </section>
  );
}

// ── Route entry point ─────────────────────────────────────────────────────────
export default function AssetEditRoute() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    permissions,
    assets,
    onSaveAsset,
    activeOrganizations,
    activeEquipmentTypes,
    activeLocations,
  } = useAppData();
  if (!(permissions.canEdit || permissions.canEditLimitedFields))
    return <PlaceholderPage title="ไม่มีสิทธิ์แก้ไขข้อมูล" />;
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
