"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { assetStatusColors, inspectionStatusColors } from "@/constants/colors";
import { formatThaiDate } from "@/lib/dates";
import { organizations } from "@/lib/organizations";
import { AssetListRow, AssetSetItem, Organization } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateOption } from "@/lib/i18n";

export function Icon({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackIconButton({ onClick, label = "กลับไปหน้ารายการ" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surfaceSoft text-ink transition hover:border-primary hover:bg-primary-soft hover:text-primary"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path d="M11 6 5 12l6 6M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function CloseIconButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="ปิด"
      title="ปิด"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surfaceSoft text-2xl font-light leading-none text-ink transition hover:border-primary hover:bg-primary-soft hover:text-primary focus:outline-none focus:ring-2 focus:ring-info/60"
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}

export function StatusBadge({ value, variant = "outline" }: { value: string; variant?: "outline" | "soft" }) {
  const { lang } = useLanguage();
  const colors = assetStatusColors[value] ?? { bg: "bg-slate-500/18", text: "text-ink", border: "ring-slate-300/30" };
  const style = `${colors.bg} ${colors.text} ${variant === "outline" ? colors.border : ""}`;

  return <span className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${variant === "outline" ? "ring-1" : "ring-0 border-0 shadow-none outline-none"} ${style}`}>{translateOption(value, lang)}</span>;
}

export function InspectionResultBadge({ inspected }: { inspected: boolean }) {
  const { lang } = useLanguage();
  const colors = inspected ? inspectionStatusColors.inspected : inspectionStatusColors.pending;
  const label = inspected
    ? translateOption("ตรวจสอบแล้ว", lang)
    : translateOption("ยังไม่ได้ตรวจ", lang);
  return (
    <span className={`inline-flex min-h-6 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${colors.badge}`}>
      {label}
    </span>
  );
}

export function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#9CD1FC] bg-[#E1F1FE] px-3 py-1 text-xs font-semibold text-[#044377]">
      <span className="min-w-0 truncate">{label}: {value}</span>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[#044377] hover:bg-white/70"
        aria-label={`ล้างตัวกรอง ${label}`}
      >
        x
      </button>
    </span>
  );
}

export function AssetStructureBadge({ asset }: { asset: AssetListRow }) {
  const isSet = asset.assetStructureType === "set";
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 ring-1 ${isSet ? "bg-sky-400/12 text-sky-200 ring-sky-300/25" : "bg-white/10 text-ink ring-line"}`}>
      {isSet ? `แบบชุด · ${asset.assetSetItems.length} รายการย่อย` : "ครุภัณฑ์เดี่ยว"}
    </span>
  );
}

export function getAssetStructureFilterLabel(asset: AssetListRow) {
  const rawValue = `${asset.assetStructureType ?? ""} ${asset.assetType ?? ""}`.toLowerCase();
  if (
    asset.assetStructureType === "set" ||
    rawValue.includes("ครุภัณฑ์แบบชุด") ||
    rawValue.includes("แบบชุด") ||
    rawValue.includes("ชุด")
  ) {
    return "ครุภัณฑ์แบบชุด";
  }
  return "ครุภัณฑ์เดี่ยว";
}

export function SearchableOrganizationSelect({
  selected,
  onSelect,
  options = organizations,
  label = "ฝ่าย/ชมรมที่รับผิดชอบ",
  required,
  error,
}: {
  selected: Organization | null;
  onSelect: (organization: Organization) => void;
  options?: Organization[];
  label?: string;
  required?: boolean;
  error?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOrganizations = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return options;
    return options.filter((item) =>
      `${item.name} ${item.type}`.toLowerCase().includes(cleanQuery),
    );
  }, [options, query]);

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-ink" htmlFor="organization-search">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className={`mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-left text-sm text-ink ring-1 ring-transparent transition hover:border-primary/60 focus:outline-none focus:ring-info ${error ? "border-red-400" : "border-line"}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold">{selected?.name ?? "เลือกฝ่าย/ชมรม"}</span>
        </span>
        <span className="text-primary">⌄</span>
      </button>
      <input type="hidden" name="organization_name" value={selected?.name ?? ""} />

      {isOpen && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
          <div className="border-b border-line p-3">
            <input
              id="organization-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อฝ่ายหรือชมรม"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOrganizations.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onSelect(item);
                  setQuery("");
                  setIsOpen(false);
                }}
                className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-ink transition hover:bg-primary hover:text-white"
              >
                <span className="truncate font-semibold">{item.name}</span>
              </button>
            ))}
            {filteredOrganizations.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-muted">ไม่พบหน่วยงานในรายการ</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  required,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const isDateInput = props.type === "date";
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputClass = props.type === "date"
    ? "date-input [color-scheme:light] pr-12 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
    : "";
  const openDatePicker = () => {
    const input = inputRef.current;
    if (!input || props.disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <div className={isDateInput ? "relative mt-2" : ""}>
        <input
          {...props}
          ref={inputRef}
          className={`${isDateInput ? "" : "mt-2"} min-h-12 w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-faint focus:border-primary disabled:cursor-not-allowed disabled:text-muted ${dateInputClass} ${className}`}
        />
        {isDateInput && (
          <button
            type="button"
            onClick={openDatePicker}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-info/40 disabled:cursor-not-allowed disabled:text-muted"
            disabled={props.disabled}
            aria-label={`เปิดปฏิทิน${label}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v4M16 2v4M3 10h18" />
              <rect x="3" y="4" width="18" height="18" rx="2" />
            </svg>
          </button>
        )}
      </div>
    </label>
  );
}

export function ThaiDateField({
  label,
  value,
  onChange,
  disabled = false,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openDatePicker = () => {
    const input = inputRef.current;
    if (!input || disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <div className="relative mt-2">
        <button
          type="button"
          onClick={openDatePicker}
          disabled={disabled}
          className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3 text-left text-sm text-ink outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-info/30 disabled:cursor-not-allowed disabled:text-muted ${error ? "border-red-400" : "border-line"}`}
          aria-label={`${label} ${value ? formatThaiDate(value) : "ยังไม่ได้เลือก"}`}
        >
          <span>{value ? formatThaiDate(value) : "วัน/เดือน/ปี พ.ศ."}</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2v4M16 2v4M3 10h18" />
            <rect x="3" y="4" width="18" height="18" rx="2" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          tabIndex={-1}
          className="pointer-events-none absolute bottom-0 right-0 h-px w-px opacity-0"
          aria-hidden="true"
        />
      </div>
    </label>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-danger">{message}</p>;
}

export function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export function PhoneField({
  value,
  onChange,
  error,
  onInvalidInput,
  onBlur,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string;
  onInvalidInput: () => void;
  onBlur: () => void;
  label?: string;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <Field
        label={label ?? t("rec.label.phone")}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const digitsOnly = nextValue.replace(/[^0-9]/g, "");
          if (nextValue !== digitsOnly) onInvalidInput();
          onChange(digitsOnly.slice(0, 10));
        }}
        onBlur={onBlur}
        placeholder={t("rec.ph.phone")}
        aria-invalid={Boolean(error)}
        className={error ? "border-red-400 focus:border-red-400" : ""}
      />
    </div>
  );
}

export function FiscalYearField({
  value,
  onChange,
  error,
  onInvalidInput,
  onBlur,
  disabled,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  error: string;
  onInvalidInput: () => void;
  onBlur: () => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div>
      <Field
        label={t("rec.label.fiscalYear")}
        required={required}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          const digitsOnly = nextValue.replace(/[^0-9]/g, "");
          if (nextValue !== digitsOnly) onInvalidInput();
          onChange(digitsOnly.slice(0, 4));
        }}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={t("rec.ph.fiscalYear")}
        aria-invalid={Boolean(error)}
        className={error ? "border-red-400 focus:border-red-400" : ""}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  required,
  compact = false,
  autoResize = false,
  className = "",
  error,
  onInput,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; compact?: boolean; autoResize?: boolean; error?: string }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, 48)}px`;
  };

  useEffect(() => {
    if (autoResize && textareaRef.current) resizeTextarea(textareaRef.current);
  }, [autoResize, props.value]);

  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <textarea
        {...props}
        ref={textareaRef}
        rows={compact || autoResize ? 1 : props.rows}
        onInput={(event) => {
          if (autoResize) resizeTextarea(event.currentTarget);
          onInput?.(event);
        }}
        className={`mt-2 w-full rounded-lg border bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-faint focus:border-primary ${autoResize ? "min-h-12 resize-none overflow-hidden" : compact ? "h-12 min-h-12 resize-none overflow-hidden" : "min-h-28 resize-y"} ${error ? "border-red-400 focus:border-red-400" : "border-line"} ${className}`}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  getOptionLabel,
  disabled,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  getOptionLabel?: (value: string) => string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`mt-2 min-h-12 w-full min-w-0 truncate rounded-lg border bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-primary disabled:cursor-not-allowed disabled:text-muted ${error ? "border-red-400 focus:border-red-400" : "border-line"}`}
      >
        {placeholder && (
          <option value="" disabled className="bg-surface text-muted">
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option} value={option} className="bg-surface text-ink">
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchableFilterField({
  label,
  value,
  onChange,
  options,
  getOptionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  getOptionLabel?: (value: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return options;
    return options.filter((opt) => opt === "ทั้งหมด" || opt.toLowerCase().includes(clean));
  }, [options, query]);

  return (
    <label className="relative block min-w-0">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {/* Real <select> as trigger — identical rendering and .asset-shell CSS rules as SelectField */}
      <select
        value={value}
        onChange={() => {}}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setIsOpen((v) => !v);
          } else if (e.key === "Escape" || e.key === "Tab") {
            setIsOpen(false);
            setQuery("");
          }
        }}
        className="mt-2 min-h-12 w-full min-w-0 truncate rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-surface text-ink">
            {getOptionLabel ? getOptionLabel(opt) : opt}
          </option>
        ))}
      </select>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setIsOpen(false); setQuery(""); }} />
          <div className="absolute left-0 z-40 mt-1 w-full min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาหน่วยงาน..."
                className="w-full rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-5 text-center text-sm text-muted">ไม่พบหน่วยงาน</p>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setQuery("");
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition ${
                      opt === value
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-ink hover:bg-primary hover:text-white"
                    }`}
                  >
                    <span className="truncate">{getOptionLabel ? getOptionLabel(opt) : opt}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </label>
  );
}

export function MultiSelectFilter({
  label,
  values,
  onChange,
  options,
  getOptionLabel,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  getOptionLabel?: (value: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const actualOptions = options.filter((o) => o !== "ทั้งหมด");
  const displayText =
    values.length === 0
      ? "ทั้งหมด"
      : values.length === 1
        ? (getOptionLabel ? getOptionLabel(values[0]) : values[0])
        : `เลือก ${values.length} รายการ`;

  const toggleValue = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  return (
    <div className="relative min-w-0">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mt-2 flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-left text-sm text-ink outline-none hover:border-primary focus:border-primary"
      >
        <span className="min-w-0 truncate">{displayText}</span>
        <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-40 mt-1 w-full min-w-[160px] overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="max-h-64 overflow-y-auto p-1">
              <button
                type="button"
                onClick={() => { onChange([]); setIsOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${values.length === 0 ? "bg-primary/10 font-semibold text-primary" : "text-ink hover:bg-primary hover:text-white"}`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${values.length === 0 ? "border-primary bg-primary" : "border-line"}`}>
                  {values.length === 0 && (
                    <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span>ทั้งหมด</span>
              </button>
              {actualOptions.map((opt) => {
                const checked = values.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleValue(opt)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${checked ? "bg-primary/10 font-semibold text-primary" : "text-ink hover:bg-primary hover:text-white"}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary" : "border-line"}`}>
                      {checked && (
                        <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 truncate">{getOptionLabel ? getOptionLabel(opt) : opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function SearchableMultiSelectFilter({
  label,
  values,
  onChange,
  options,
  getOptionLabel,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  getOptionLabel?: (value: string) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const actualOptions = useMemo(() => options.filter((o) => o !== "ทั้งหมด"), [options]);
  const filteredOptions = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return actualOptions;
    return actualOptions.filter((opt) => opt.toLowerCase().includes(clean));
  }, [actualOptions, query]);
  const displayText =
    values.length === 0
      ? "ทั้งหมด"
      : values.length === 1
        ? (getOptionLabel ? getOptionLabel(values[0]) : values[0])
        : `เลือก ${values.length} รายการ`;

  const toggleValue = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  return (
    <div className="relative min-w-0">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="mt-2 flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-left text-sm text-ink outline-none hover:border-primary focus:border-primary"
      >
        <span className="min-w-0 truncate">{displayText}</span>
        <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setIsOpen(false); setQuery(""); }} />
          <div className="absolute left-0 z-40 mt-1 w-full min-w-[180px] overflow-hidden rounded-lg border border-line bg-surface shadow-2xl">
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาหน่วยงาน..."
                className="w-full rounded-md border border-line bg-surfaceSoft px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-primary"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {!query.trim() && (
                <button
                  type="button"
                  onClick={() => { onChange([]); setIsOpen(false); setQuery(""); }}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${values.length === 0 ? "bg-primary/10 font-semibold text-primary" : "text-ink hover:bg-primary hover:text-white"}`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${values.length === 0 ? "border-primary bg-primary" : "border-line"}`}>
                    {values.length === 0 && (
                      <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span>ทั้งหมด</span>
                </button>
              )}
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-5 text-center text-sm text-muted">ไม่พบหน่วยงาน</p>
              ) : (
                filteredOptions.map((opt) => {
                  const checked = values.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleValue(opt)}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${checked ? "bg-primary/10 font-semibold text-primary" : "text-ink hover:bg-primary hover:text-white"}`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary" : "border-line"}`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 truncate">{getOptionLabel ? getOptionLabel(opt) : opt}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function RecordFormSection({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-line bg-surfaceSoft/80 p-4 shadow-glow md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-extrabold text-white">
          {number}
        </span>
        <div>
          <h3 className="text-base font-bold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </article>
  );
}

export function AssetSetItemsEditor({
  items,
  onChange,
}: {
  items: AssetSetItem[];
  onChange: (items: AssetSetItem[]) => void;
}) {
  const updateItem = (id: number, patch: Partial<AssetSetItem>) => {
    onChange(items.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toLocaleString("th-TH") } : item));
  };
  const addItem = () => {
    const now = new Date().toLocaleString("th-TH");
    onChange([
      ...items,
      {
        id: Date.now(),
        assetId: 0,
        itemName: "",
        quantity: "1",
        unit: "ตัว",
        description: "",
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };
  const removeItem = (id: number) => {
    onChange(items.filter((item) => item.id !== id));
  };

  return (
    <div className="rounded-xl border border-sky-300/20 bg-sky-400/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-ink">รายการย่อยในชุดครุภัณฑ์</h4>
          <p className="mt-1 text-xs leading-5 text-muted">ใช้สำหรับครุภัณฑ์ที่มีหมายเลขเดียว แต่ภายในประกอบด้วยหลายรายการ</p>
        </div>
        <button type="button" onClick={addItem} className="rounded-md bg-primary px-3 py-2 text-xs font-extrabold text-white hover:bg-primary-hover">
          เพิ่มรายการย่อย
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-lg border border-line bg-surfaceSoft p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-primary">รายการย่อยที่ {index + 1}</p>
              <button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-red-300/30 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-red-500/10">
                ลบรายการย่อย
              </button>
            </div>
            <div className="grid gap-3">
              <Field label="ชื่อรายการย่อย" value={item.itemName} onChange={(event) => updateItem(item.id, { itemName: event.target.value })} placeholder="เช่น โต๊ะประชุม" />
              <TextAreaField label="รายละเอียด/หมายเหตุ" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} placeholder="เช่น โต๊ะไม้สีดำ เก้าอี้เบาะสีดำ" />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-line bg-surfaceSoft p-5 text-center text-sm text-muted">
            ยังไม่มีรายการย่อย กด “เพิ่มรายการย่อย” เพื่อเริ่มกรอกข้อมูลในชุด
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="flex min-h-[360px] flex-col overflow-visible rounded-lg border border-line bg-surface p-4">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <div className="mt-4 min-h-0 flex-1 overflow-visible">{children}</div>
    </article>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  leading,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        {leading}
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-extrabold text-ink md:text-3xl">{title}</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function DetailInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-line py-2 last:border-b-0">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

export function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <div className="mt-3">{children}</div>
    </article>
  );
}

