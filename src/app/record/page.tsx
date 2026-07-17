"use client";

import { useAppData } from "@/components/AppDataProvider";
import { PlaceholderPage } from "@/components/StatusPages";

import { useState, useMemo } from "react";
import { AssetSetItemsEditor, CloseIconButton, Field, FieldError, FiscalYearField, PhoneField, RecordFormSection, SearchableOrganizationSelect, SelectField, TextAreaField, ThaiDateField, isValidDateInput } from "@/components/ui";
import { budgetSourceOptions } from "@/constants/options";
import { createAssetFromImportRow, getNextAssetNumber, validateAssetImportRows } from "@/lib/assets";
import { uploadImage } from "@/lib/image-upload";
import { formatThaiDate } from "@/lib/dates";
import { readAssetRowsFromFile } from "@/lib/import-export";
import { AssetImportPreviewRow, AssetListRow, AssetSetItem, EvidenceImage, Organization } from "@/types";
import { allowedAssetStatuses } from "@/constants/statuses";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateOption } from "@/lib/i18n";

function RecordPage({
  assets,
  onCreateAsset,
  organizationOptions,
  equipmentTypeOptions,
  locationOptions,
}: {
  assets: AssetListRow[];
  onCreateAsset: (asset: AssetListRow) => void;
  organizationOptions: Organization[];
  equipmentTypeOptions: string[];
  locationOptions: string[];
}) {
  const { lang, t } = useLanguage();
  const today = new Date().toISOString().slice(0, 10);
  const currentFiscalYear = new Date().getFullYear() + 543;
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(organizationOptions[0] ?? null);
  const [assetStructureType, setAssetStructureType] = useState<"single" | "set">("single");
  const [assetSetItems, setAssetSetItems] = useState<AssetSetItem[]>([]);
  const [purchaseProject, setPurchaseProject] = useState("");
  const [assetNumber, setAssetNumber] = useState("");
  const [assetNumberLocation, setAssetNumberLocation] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [price, setPrice] = useState("");
  const [fiscalYear, setFiscalYear] = useState(String(currentFiscalYear));
  const [fiscalYearError, setFiscalYearError] = useState("");
  const [budgetSource, setBudgetSource] = useState("");
  const [recordDate, setRecordDate] = useState(today);
  const [receivedDate, setReceivedDate] = useState(today);
  const [assetType, setAssetType] = useState(equipmentTypeOptions[0] ?? "");
  const [location, setLocation] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [responsiblePhoneError, setResponsiblePhoneError] = useState("");
  const [status, setStatus] = useState("ใช้งานได้");
  const [imagePreviews, setImagePreviews] = useState<EvidenceImage[]>([]);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewRows, setImportPreviewRows] = useState<AssetImportPreviewRow[]>([]);
  const [importMessage, setImportMessage] = useState("");
  const [importChecking, setImportChecking] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueAssetName, setIssueAssetName] = useState("");
  const [mainFormErrors, setMainFormErrors] = useState<Record<string, string>>({});
  const [issueFormErrors, setIssueFormErrors] = useState<Record<string, string>>({});

  const importReadyRows = importPreviewRows.filter((row) => row.errors.length === 0);
  const importErrorRows = importPreviewRows.filter((row) => row.errors.length > 0);

  const formattedPrice = useMemo(() => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return "0.00";
    return parsedPrice.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }, [price]);

  const validateMainForm = () => {
    const errors: Record<string, string> = {};
    const required = t("rec.err.required");
    if (!assetName.trim()) errors.assetName = required;
    if (!assetStructureType) errors.assetStructureType = required;
    if (!assetType) errors.assetType = required;
    if (!/^[0-9]{4}$/.test(fiscalYear)) errors.fiscalYear = "กรุณากรอกปีงบประมาณเป็นตัวเลข 4 หลัก";
    if (!budgetSource) errors.budgetSource = required;
    if (!purchaseProject.trim()) errors.purchaseProject = required;
    if (!isValidDateInput(receivedDate)) errors.receivedDate = required;
    if (!status) errors.status = required;
    if (!selectedOrganization) errors.organization = required;
    if (!location) errors.location = required;
    if (!responsiblePerson.trim()) errors.responsiblePerson = required;
    if (responsiblePhone && !/^[0-9]{9,10}$/.test(responsiblePhone)) errors.responsiblePhone = " ";

    setMainFormErrors(errors);
    setFiscalYearError(errors.fiscalYear ?? "");
    setResponsiblePhoneError(errors.responsiblePhone ?? "");
    if (Object.keys(errors).length > 0) {
      setToast("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วนก่อนบันทึกและออกเลขครุภัณฑ์");
      window.setTimeout(() => setToast(""), 3500);
      return false;
    }
    if (assetStructureType === "set") {
      const invalidSetItems = assetSetItems.length === 0 || assetSetItems.some((item) => !item.itemName.trim());
      if (invalidSetItems) {
        setToast("กรุณาเพิ่มรายการย่อยอย่างน้อย 1 รายการ และกรอกชื่อรายการย่อยให้ครบ");
        window.setTimeout(() => setToast(""), 3500);
        return false;
      }
    }
    return true;
  };

  const openIssueAssetModal = () => {
    if (!validateMainForm()) return;
    setIssueAssetName(assetName.trim());
    setAssetNumber(getNextAssetNumber(assets, fiscalYear));
    setAssetNumberLocation("");
    setIssueFormErrors({});
    setIssueModalOpen(true);
  };

  const handleSubmit = () => {
    const cleanAssetName = issueAssetName.trim();
    const cleanAssetNumber = assetNumber.trim();
    const organization = selectedOrganization;
    const errors: Record<string, string> = {};
    const requiredMsg = t("rec.err.required");
    if (!cleanAssetName) errors.assetName = requiredMsg;
    if (!cleanAssetNumber) errors.assetNumber = "ไม่สามารถออกหมายเลขครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง";
    if (!assetNumberLocation.trim()) errors.assetNumberLocation = requiredMsg;
    if (imagePreviews.length === 0) errors.images = requiredMsg;
    setIssueFormErrors(errors);
    if (!organization || Object.keys(errors).length > 0) {
      return;
    }
    if (assets.some((asset) => asset.assetNumber.trim() === cleanAssetNumber)) {
      setAssetNumber(getNextAssetNumber(assets, fiscalYear));
      setToast("พบหมายเลขครุภัณฑ์ซ้ำ ระบบสร้างหมายเลขใหม่ให้แล้ว กรุณาตรวจสอบอีกครั้ง");
      window.setTimeout(() => setToast(""), 3500);
      return;
    }

    const createdAt = new Date().toLocaleString("th-TH");
    const generatedId = Date.now();
    const newAsset: AssetListRow = {
      id: generatedId,
      fiscalYear,
      budgetSource,
      recordDate: formatThaiDate(recordDate),
      assetCode: `CMU-ASSET-${fiscalYear}-${String(generatedId).slice(-4)}`,
      assetNumber: cleanAssetNumber,
      assetName: cleanAssetName,
      assetDescription: assetDescription.trim() || cleanAssetName,
      organization: organization.name,
      organizationType: organization.type,
      assetType,
      location: location.trim() || "ยังไม่ได้ระบุ",
      building: "-",
      room: "-",
      responsiblePerson: responsiblePerson.trim() || "ยังไม่ได้ระบุ",
      purchaseProject: purchaseProject.trim() || "-",
      purchaseMonth: formatThaiDate(receivedDate),
      numberPlacement: assetNumberLocation.trim() || "-",
      quantity: "1",
      unit: "-",
      price: formattedPrice,
      responsiblePhone: responsiblePhone || "-",
      status,
      latestInspectionDate: "",
      inspectionResult: "",
      isInspected: false,
      imageCount: imagePreviews.length,
      assetImages: imagePreviews,
      note: note.trim() || "-",
      assetStructureType,
      assetSetItems: assetStructureType === "set"
        ? assetSetItems.map((item, index) => ({
            ...item,
            id: generatedId + index + 1,
            assetId: generatedId,
            itemName: item.itemName.trim(),
            quantity: "1",
            unit: "-",
            description: item.description.trim() || "-",
            updatedAt: createdAt,
          }))
        : [],
      updatedAt: createdAt,
      deletedAt: null,
    };

    onCreateAsset(newAsset);
    setIssueModalOpen(false);
    handleReset(false);
    setToast("บันทึกข้อมูลและออกเลขครุภัณฑ์เรียบร้อยแล้ว");
    window.setTimeout(() => setToast(""), 3500);
  };

  const handleReset = (showToast = true) => {
    setSelectedOrganization(organizationOptions[0] ?? null);
    setAssetStructureType("single");
    setAssetSetItems([]);
    setPurchaseProject("");
    setAssetNumber("");
    setAssetNumberLocation("");
    setAssetName("");
    setAssetDescription("");
    setPrice("");
    setFiscalYear(String(currentFiscalYear));
    setFiscalYearError("");
    setBudgetSource("");
    setRecordDate(today);
    setReceivedDate(today);
    setAssetType(equipmentTypeOptions[0] ?? "");
    setLocation("");
    setResponsiblePerson("");
    setResponsiblePhone("");
    setResponsiblePhoneError("");
    setStatus("ใช้งานได้");
    setImagePreviews([]);
    setNote("");
    setIssueAssetName("");
    setIssueModalOpen(false);
    setMainFormErrors({});
    setIssueFormErrors({});
    if (showToast) {
      setToast("ล้างข้อมูลในฟอร์มแล้ว");
      window.setTimeout(() => setToast(""), 2500);
    }
  };

  const handleStructureTypeChange = (value: string) => {
    const nextType = value === "ครุภัณฑ์แบบชุด" ? "set" : "single";
    setAssetStructureType(nextType);
    if (nextType === "set") {
      if (assetSetItems.length === 0) {
        const now = new Date().toLocaleString("th-TH");
        setAssetSetItems([{ id: Date.now(), assetId: 0, itemName: "", quantity: "1", unit: "-", description: "", createdAt: now, updatedAt: now }]);
      }
    } else {
      setAssetSetItems([]);
    }
  };

  const handleImageChange = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    try {
      const nextImages = await Promise.all(selectedFiles.map((file) => uploadImage(file, "assets")));
      setImagePreviews(nextImages);
      if (nextImages.length > 0) setIssueFormErrors((errors) => ({ ...errors, images: "" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "อัปโหลดรูปภาพไม่สำเร็จ";
      setIssueFormErrors((errors) => ({ ...errors, images: message }));
    }
  };

  const resetImportModal = () => {
    setImportFileName("");
    setImportPreviewRows([]);
    setImportMessage("");
    setImportChecking(false);
  };

  const handleImportFileChange = async (file: File | null) => {
    resetImportModal();
    if (!file) return;
    setImportFileName(file.name);
    setImportChecking(true);
    try {
      const rows = await readAssetRowsFromFile(file);
      const missingHeaders = ["ปีงบประมาณ", "หมายเลขครุภัณฑ์", "ชื่อรายการครุภัณฑ์", "ฝ่าย/ชมรมที่รับผิดชอบ", "สถานะครุภัณฑ์"].filter((header) => !Object.keys(rows[0] ?? {}).includes(header));
      if (missingHeaders.length > 0) {
        setImportMessage(`ไฟล์ยังขาดหัวคอลัมน์สำคัญ: ${missingHeaders.join(", ")}`);
        setImportPreviewRows([]);
        return;
      }
      const previewRows = validateAssetImportRows(rows, assets);
      setImportPreviewRows(previewRows);
      setImportMessage(`ตรวจสอบแล้ว ${previewRows.length.toLocaleString("th-TH")} รายการ พร้อมนำเข้า ${previewRows.filter((row) => row.errors.length === 0).length.toLocaleString("th-TH")} รายการ`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "ไม่สามารถอ่านไฟล์ Excel ได้");
      setImportPreviewRows([]);
    } finally {
      setImportChecking(false);
    }
  };

  const handleImportAssets = () => {
    if (importReadyRows.length === 0) {
      setImportMessage("ยังไม่มีรายการที่พร้อมนำเข้า กรุณาตรวจสอบไฟล์อีกครั้ง");
      return;
    }
    if (importErrorRows.length > 0) {
      setImportMessage("กรุณาแก้ไขรายการที่มีปัญหาก่อนนำเข้าข้อมูล");
      return;
    }
    importReadyRows.forEach((row, index) => onCreateAsset(createAssetFromImportRow(row.data, index)));
    setToast(`นำเข้าข้อมูลสำเร็จ ${importReadyRows.length.toLocaleString("th-TH")} รายการ`);
    window.setTimeout(() => setToast(""), 3500);
    resetImportModal();
    setImportOpen(false);
  };

  return (
    <section className="relative mx-auto w-full max-w-screen-2xl space-y-5">
      {toast && (
        <div className="fixed right-4 top-24 z-50 rounded-lg border border-primary/30 bg-surfaceSoft px-5 py-3 text-sm font-semibold text-primary shadow-glow">
          {toast}
        </div>
      )}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-surface shadow-glow">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h3 className="text-xl font-bold text-ink">นำเข้าข้อมูลครุภัณฑ์จาก Excel</h3>
                <p className="mt-1 text-sm text-muted">ใช้ไฟล์ตาม template ตรวจสอบ Preview แล้วค่อยยืนยันนำเข้าจริง</p>
              </div>
              <CloseIconButton onClick={() => {
                resetImportModal();
                setImportOpen(false);
              }} />
            </div>
            <div className="max-h-[calc(90vh-88px)] space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-muted sm:grid-cols-2 lg:grid-cols-5">
                {["1. ดาวน์โหลดตัวอย่าง", "2. กรอกข้อมูล", "3. อัปโหลดไฟล์", "4. ตรวจสอบ Preview", "5. นำเข้าข้อมูล"].map((step) => (
                  <div key={step} className="rounded-md border border-line bg-surfaceSoft px-3 py-2 text-center">
                    {step}
                  </div>
                ))}
              </div>

              <label className="block rounded-lg border border-dashed border-primary/40 bg-surfaceSoft p-4 hover:border-primary">
                <span className="text-sm font-semibold text-ink">อัปโหลดไฟล์ Excel (.xlsx, .xls)</span>
                <p className="mt-1 text-xs leading-5 text-muted">หากกรอกผ่าน Google Sheets ให้ไปที่ ไฟล์ &gt; ดาวน์โหลด &gt; Microsoft Excel (.xlsx) แล้วนำไฟล์มาอัปโหลดที่นี่</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) => handleImportFileChange(event.target.files?.[0] ?? null)}
                  className="mt-3 w-full rounded-lg border border-lineStrong bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-primary file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:font-bold file:text-white"
                />
              </label>

              {(importChecking || importMessage || importFileName) && (
                <div className="rounded-lg border border-line bg-surfaceSoft p-4">
                  <p className="text-sm font-semibold text-ink">{importFileName || "ยังไม่ได้เลือกไฟล์"}</p>
                  <p className="mt-1 text-sm text-muted">{importChecking ? "กำลังตรวจสอบข้อมูล..." : importMessage}</p>
                </div>
              )}

              {importPreviewRows.length > 0 && (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-sky-400/25 bg-info/10 p-4">
                      <p className="text-xs font-semibold text-info">รายการทั้งหมด</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-ink">{importPreviewRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                    <div className="rounded-lg border border-emerald-400/25 bg-success/10 p-4">
                      <p className="text-xs font-semibold text-success">พร้อมนำเข้า</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-ink">{importReadyRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                    <div className="rounded-lg border border-red-400/25 bg-danger/10 p-4">
                      <p className="text-xs font-semibold text-danger">มีปัญหา</p>
                      <strong className="mt-2 block text-2xl font-extrabold text-ink">{importErrorRows.length.toLocaleString("th-TH")}</strong>
                    </div>
                  </div>

                  {importErrorRows.length > 0 && (
                    <div className="rounded-lg border border-red-400/25 bg-danger/10 p-4">
                      <p className="text-sm font-bold text-danger">รายการที่ต้องแก้ไข</p>
                      <div className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-danger/90">
                        {importErrorRows.slice(0, 8).map((row) => (
                          <p key={row.rowNumber}>แถวที่ {row.rowNumber}: {row.errors.join(", ")}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="min-w-0 overflow-hidden rounded-lg border border-line">
                    <div className="max-h-72 overflow-auto overflow-x-auto">
                      <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                        <thead className="sticky top-0 bg-surfaceSoft text-ink">
                          <tr>
                            {["แถว", "หมายเลขครุภัณฑ์", "ชื่อรายการ", "ฝ่าย/ชมรม", "สถานะ", "ผลตรวจสอบ"].map((heading) => (
                              <th key={heading} className="border-b border-line px-3 py-2 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
                          {importPreviewRows.slice(0, 20).map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="px-3 py-2 text-muted">{row.rowNumber}</td>
                              <td className="px-3 py-2 font-semibold text-primary" title={row.data["หมายเลขครุภัณฑ์"] || "-"}>{row.data["หมายเลขครุภัณฑ์"] || "-"}</td>
                              <td className="px-3 py-2 text-ink" title={row.data["ชื่อรายการครุภัณฑ์"] || "-"}>{row.data["ชื่อรายการครุภัณฑ์"] || "-"}</td>
                              <td className="px-3 py-2" title={row.data["ฝ่าย/ชมรมที่รับผิดชอบ"] || "-"}>{row.data["ฝ่าย/ชมรมที่รับผิดชอบ"] || "-"}</td>
                              <td className="px-3 py-2">{row.data["สถานะครุภัณฑ์"] || "-"}</td>
                              <td className={row.errors.length > 0 ? "px-3 py-2 text-danger" : "px-3 py-2 text-success"}>
                                {row.errors.length > 0 ? row.errors.join(", ") : "พร้อมนำเข้า"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetImportModal();
                    setImportOpen(false);
                  }}
                  className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => importFileName && setImportMessage(importPreviewRows.length > 0 ? "ตรวจสอบข้อมูลแล้ว" : "กรุณาเลือกไฟล์ Excel ก่อน")}
                  className="rounded-md border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
                >
                  ตรวจสอบข้อมูล
                </button>
                <button
                  type="button"
                  onClick={handleImportAssets}
                  disabled={importReadyRows.length === 0 || importErrorRows.length > 0}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-extrabold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  นำเข้าข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <RecordFormSection number={1} title={t("rec.sec1")} description={t("rec.sec1desc")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Field label={t("rec.label.assetName")} required value={assetName} onChange={(event) => { setAssetName(event.target.value); setMainFormErrors((errors) => ({ ...errors, assetName: "" })); }} placeholder={t("rec.ph.assetName")} className={mainFormErrors.assetName ? "border-red-400 focus:border-red-400" : ""} />
            </div>
            <div>
              <SelectField
                label={t("rec.label.assetNature")}
                required
                value={assetStructureType === "set" ? "ครุภัณฑ์แบบชุด" : "ครุภัณฑ์เดี่ยว"}
                onChange={(value) => { handleStructureTypeChange(value); setMainFormErrors((errors) => ({ ...errors, assetStructureType: "" })); }}
                options={["ครุภัณฑ์เดี่ยว", "ครุภัณฑ์แบบชุด"]}
                error={mainFormErrors.assetStructureType}
              />
            </div>
            <div>
              <SelectField label={t("rec.label.assetCategory")} required value={assetType} onChange={(value) => { setAssetType(value); setMainFormErrors((errors) => ({ ...errors, assetType: "" })); }} options={equipmentTypeOptions} error={mainFormErrors.assetType} />
            </div>
            <TextAreaField
              label={t("rec.label.specs")}
              value={assetDescription}
              onChange={(event) => setAssetDescription(event.target.value)}
              placeholder={t("rec.ph.specs")}
              autoResize
            />
            <FiscalYearField
              required
              value={fiscalYear}
              onChange={(value) => {
                setFiscalYear(value);
                setMainFormErrors((errors) => ({ ...errors, fiscalYear: "" }));
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
            <div>
              <SelectField label={t("rec.label.budgetSource")} value={budgetSource} onChange={(value) => { setBudgetSource(value); setMainFormErrors((errors) => ({ ...errors, budgetSource: "" })); }} options={budgetSourceOptions} placeholder={t("rec.ph.budgetSource")} error={mainFormErrors.budgetSource} />
            </div>
            <div>
              <TextAreaField
                label={t("rec.label.project")}
                value={purchaseProject}
                onChange={(event) => { setPurchaseProject(event.target.value); setMainFormErrors((errors) => ({ ...errors, purchaseProject: "" })); }}
                placeholder={t("rec.ph.project")}
                autoResize
                error={mainFormErrors.purchaseProject}
              />
            </div>
            <div>
              <ThaiDateField label={t("rec.label.receivedDate")} value={receivedDate} onChange={(value) => { setReceivedDate(value); setMainFormErrors((errors) => ({ ...errors, receivedDate: "" })); }} error={mainFormErrors.receivedDate} />
            </div>
            {assetStructureType === "set" && (
              <div className="lg:col-span-2">
                <AssetSetItemsEditor items={assetSetItems} onChange={setAssetSetItems} />
              </div>
            )}
          </div>
        </RecordFormSection>

        <RecordFormSection number={2} title={t("rec.sec2")} description={t("rec.sec2desc")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <SelectField
                label={t("rec.label.status")}
                required
                value={status}
                onChange={(value) => { setStatus(value); setMainFormErrors((errors) => ({ ...errors, status: "" })); }}
                options={allowedAssetStatuses}
                getOptionLabel={(v) => translateOption(v, lang)}
                error={mainFormErrors.status}
              />
            </div>
            <TextAreaField value={note} onChange={(event) => setNote(event.target.value)} label={t("rec.label.notes")} placeholder={t("rec.ph.notes")} autoResize />
          </div>
        </RecordFormSection>

        <RecordFormSection number={3} title={t("rec.sec3")} description={t("rec.sec3desc")}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <SearchableOrganizationSelect
                selected={selectedOrganization}
                onSelect={(organization) => { setSelectedOrganization(organization); setMainFormErrors((errors) => ({ ...errors, organization: "" })); }}
                options={organizationOptions}
                label={t("rec.label.org")}
                required
                error={mainFormErrors.organization}
              />
            </div>
            <div>
              <SelectField label={t("rec.label.location")} required value={location} onChange={(value) => { setLocation(value); setMainFormErrors((errors) => ({ ...errors, location: "" })); }} options={locationOptions} placeholder={t("rec.ph.location")} error={mainFormErrors.location} />
            </div>
            <div>
              <Field label={t("rec.label.responsible")} value={responsiblePerson} onChange={(event) => { setResponsiblePerson(event.target.value); setMainFormErrors((errors) => ({ ...errors, responsiblePerson: "" })); }} placeholder={t("rec.ph.responsible")} className={mainFormErrors.responsiblePerson ? "border-red-400 focus:border-red-400" : ""} />
            </div>
            <PhoneField
              value={responsiblePhone}
              onChange={(value) => {
                setResponsiblePhone(value);
                setMainFormErrors((errors) => ({ ...errors, responsiblePhone: "" }));
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
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-line bg-navy/90 p-4 backdrop-blur">
        <button type="button" onClick={() => handleReset()} className="rounded-md border border-line bg-surfaceSoft px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">
          {t("rec.reset")}
        </button>
        <button type="button" onClick={openIssueAssetModal} className="rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-slate-950 transition hover:bg-primary-hover">
          {t("rec.save")}
        </button>
      </div>

      {issueModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h3 className="text-xl font-bold text-white">{t("rec.issue.title")}</h3>
                <p className="mt-1 text-sm text-muted">{t("rec.issue.sub")}</p>
              </div>
              <CloseIconButton onClick={() => setIssueModalOpen(false)} />
            </div>
            <div className="max-h-[calc(90vh-88px)] space-y-4 overflow-y-auto p-5">
              <div>
                <Field label={t("rec.modal.assetName")} value={issueAssetName} onChange={(event) => { setIssueAssetName(event.target.value); setIssueFormErrors((errors) => ({ ...errors, assetName: "" })); }} />
              </div>
              <div>
                <Field label={t("rec.modal.assetNumber")} value={assetNumber} readOnly />
                <FieldError message={issueFormErrors.assetNumber} />
              </div>
              <div>
                <Field
                  label={t("rec.modal.numberLocation")}
                  required
                  value={assetNumberLocation}
                  onChange={(event) => { setAssetNumberLocation(event.target.value); setIssueFormErrors((errors) => ({ ...errors, assetNumberLocation: "" })); }}
                  placeholder={t("rec.ph.numberLocation")}
                  className={issueFormErrors.assetNumberLocation ? "border-red-400 focus:border-red-400" : ""}
                />
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-ink">
                  {t("rec.modal.photos")}
                  <span className="ml-0.5 text-danger">*</span>
                </span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => handleImageChange(event.target.files)}
                  className={`mt-2 w-full rounded-lg border border-dashed bg-slate-950/40 px-4 py-6 text-sm text-ink file:mr-4 file:rounded-md file:border-0 file:bg-gold file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:border-primary ${issueFormErrors.images ? "border-red-400" : "border-primary/40"}`}
                />
                <span className="mt-2 block text-xs text-muted">{t("rec.modal.multiPhoto")}{imagePreviews.length > 0 ? ` (${imagePreviews.length} ${t("rec.modal.photoUnit")})` : ""}</span>
              </label>
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {imagePreviews.map((image) => (
                    <figure key={image.url} className="overflow-hidden rounded-lg border border-line bg-slate-950/40">
                      <div role="img" aria-label={image.name} className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${image.url})` }} />
                      <figcaption className="truncate px-2 py-1.5 text-xs text-ink" title={image.name}>{image.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
              <div className="flex justify-end border-t border-line pt-4">
                <button type="button" onClick={handleSubmit} className="rounded-md bg-gold px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-primary-hover">
                  {t("rec.issue.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


export default function RecordRoute() {
  const { permissions, assets, onCreateAsset, activeOrganizations, activeEquipmentTypes, activeLocations } = useAppData();
  if (!permissions.canCreate) return <PlaceholderPage title="ไม่มีสิทธิ์เพิ่มข้อมูล" />;
  return (
    <RecordPage
      assets={assets}
      onCreateAsset={onCreateAsset}
      organizationOptions={activeOrganizations}
      equipmentTypeOptions={activeEquipmentTypes}
      locationOptions={activeLocations}
    />
  );
}
