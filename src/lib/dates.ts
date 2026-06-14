import { padDatePart } from "@/lib/utils";

export function getCurrentInspectionYear(date = new Date()) {
  const thaiYear = date.getFullYear() + 543;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const isNewInspectionCycle = month > 5 || (month === 5 && day >= 1);
  return isNewInspectionCycle ? thaiYear : thaiYear - 1;
}

export function formatThaiDate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";

  const renderDate = (date: Date, yearOverride?: number) => {
    if (Number.isNaN(date.getTime())) return "-";
    const day = padDatePart(date.getUTCDate());
    const month = padDatePart(date.getUTCMonth() + 1);
    const christianYear = date.getUTCFullYear();
    const thaiYear = yearOverride ?? (christianYear > 2400 ? christianYear : christianYear + 543);
    return `${day}/${month}/${thaiYear}`;
  };

  if (typeof value === "number") {
    const excelDate = new Date(Date.UTC(1899, 11, 30));
    excelDate.setUTCDate(excelDate.getUTCDate() + value);
    return renderDate(excelDate);
  }

  const rawValue = value.trim();
  if (!rawValue || rawValue === "-") return "-";

  if (/^\d+(\.\d+)?$/.test(rawValue)) {
    return formatThaiDate(Number(rawValue));
  }

  const isoMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const christianYear = Number(year);
    const thaiYear = christianYear > 2400 ? christianYear : christianYear + 543;
    return `${day}/${month}/${thaiYear}`;
  }

  const date = new Date(rawValue);
  if (!Number.isNaN(date.getTime())) return renderDate(date);

  return "-";
}

export function formatThaiDateTime(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const rawValue = String(value).trim();
  const thaiDateTimeMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})/);
  if (thaiDateTimeMatch) {
    const [, day, month, year, hour, minute] = thaiDateTimeMatch;
    return `${padDatePart(Number(day))}/${padDatePart(Number(month))}/${year} ${padDatePart(Number(hour))}:${minute} น.`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  const day = padDatePart(date.getDate());
  const month = padDatePart(date.getMonth() + 1);
  const thaiYear = date.getFullYear() + 543;
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());
  return `${day}/${month}/${thaiYear} ${hour}:${minute} น.`;
}

export function formatThaiDateTimeWithSeconds(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const rawValue = String(value).trim();
  const thaiDateTimeMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (thaiDateTimeMatch) {
    const [, day, month, year, hour, minute, second = "00"] = thaiDateTimeMatch;
    return `${padDatePart(Number(day))}/${padDatePart(Number(month))}/${year} ${padDatePart(Number(hour))}:${minute}:${second}`;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return rawValue;

  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear() + 543} ${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}:${padDatePart(date.getSeconds())}`;
}

export function toDateInputValue(value: string | null | undefined) {
  if (!value || value === "-") return "";
  const thaiDateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (thaiDateMatch) {
    const [, day, month, year] = thaiDateMatch;
    const christianYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);
    return `${christianYear}-${month}-${day}`;
  }
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return "";
}

export function getDateSortTime(value: string | number | null | undefined) {
  const normalizedDate = formatThaiDate(value);
  if (normalizedDate === "-") return Number.NEGATIVE_INFINITY;
  const thaiDateMatch = normalizedDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!thaiDateMatch) return Number.NEGATIVE_INFINITY;
  const [, day, month, year] = thaiDateMatch;
  const christianYear = Number(year) > 2400 ? Number(year) - 543 : Number(year);
  const date = new Date(Date.UTC(christianYear, Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
}

export function formatExportDate() {
  return new Date().toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

