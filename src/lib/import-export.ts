import { getReportRowValue } from "@/lib/assets";
import { formatThaiDateTime, getCurrentInspectionYear } from "@/lib/dates";
import { padDatePart } from "@/lib/utils";
import { AssetImportRow, ReportColumn, ReportFormat } from "@/types";

export function getExcelColumnIndex(cellRef: string) {
  const letters = cellRef.replace(/\d+/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

export async function inflateRawData(data: Uint8Array) {
  const maybeDecompressionStream = (globalThis as unknown as { DecompressionStream?: new (format: string) => TransformStream<Uint8Array, Uint8Array> }).DecompressionStream;
  if (!maybeDecompressionStream) throw new Error("เบราว์เซอร์นี้ยังไม่รองรับการอ่านไฟล์ .xlsx ที่บีบอัด");
  const stream = new Blob([new Uint8Array(data).buffer]).stream().pipeThrough(new maybeDecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readZipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocdOffset = -1;
  for (let index = bytes.length - 22; index >= 0; index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("ไม่พบโครงสร้างไฟล์ Excel");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let pointer = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) throw new Error("โครงสร้างไฟล์ Excel ไม่ถูกต้อง");
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localOffset = view.getUint32(pointer + 42, true);
    const name = decoder.decode(bytes.slice(pointer + 46, pointer + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressedData : method === 8 ? await inflateRawData(compressedData) : null;
    if (!data) throw new Error(`ไม่รองรับ compression method ${method}`);
    entries.set(name, decoder.decode(data));
    pointer += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

export function parseSheetXml(sheetXml: string, sharedStrings: string[]) {
  const xml = new DOMParser().parseFromString(sheetXml, "application/xml");
  const rows = Array.from(xml.getElementsByTagName("row")).map((rowElement) => {
    const cells: string[] = [];
    Array.from(rowElement.getElementsByTagName("c")).forEach((cell) => {
      const ref = cell.getAttribute("r") ?? "";
      const columnIndex = getExcelColumnIndex(ref);
      const type = cell.getAttribute("t");
      const valueNode = cell.getElementsByTagName("v")[0];
      const inlineNode = cell.getElementsByTagName("t")[0];
      const rawValue = type === "s" ? sharedStrings[Number(valueNode?.textContent ?? 0)] : inlineNode?.textContent ?? valueNode?.textContent ?? "";
      cells[columnIndex] = rawValue.trim();
    });
    return cells;
  });
  const [headers = [], ...dataRows] = rows;
  return dataRows
    .filter((row) => row.some(Boolean))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

export async function readAssetRowsFromFile(file: File): Promise<AssetImportRow[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "xlsx") {
    const entries = await readZipEntries(await file.arrayBuffer());
    const sharedStringsXml = entries.get("xl/sharedStrings.xml");
    const sharedStrings = sharedStringsXml
      ? Array.from(new DOMParser().parseFromString(sharedStringsXml, "application/xml").getElementsByTagName("si")).map((item) => Array.from(item.getElementsByTagName("t")).map((text) => text.textContent ?? "").join(""))
      : [];
    const sheetXml = entries.get("xl/worksheets/sheet1.xml") ?? Array.from(entries.entries()).find(([name]) => name.startsWith("xl/worksheets/sheet"))?.[1];
    if (!sheetXml) throw new Error("ไม่พบ sheet สำหรับนำเข้า");
    return parseSheetXml(sheetXml, sharedStrings);
  }

  const text = await file.text();
  const documentHtml = new DOMParser().parseFromString(text, "text/html");
  const tableRows = Array.from(documentHtml.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("th,td")).map((cell) => cell.textContent?.trim() ?? ""));
  const rows = tableRows.length > 0 ? tableRows : text.split(/\r?\n/).filter(Boolean).map((line) => line.split(line.includes("\t") ? "\t" : ",").map((cell) => cell.trim()));
  const [headers = [], ...dataRows] = rows;
  return dataRows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function formatExportDateTh() {
  const now = new Date();
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const thaiYear = now.getFullYear() + 543;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${now.getDate()} ${months[now.getMonth()]} ${thaiYear} เวลา ${hh}:${mm} น.`;
}

function formatExportDateEn() {
  const now = new Date();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${hh}:${mm}`;
}

const COL_WIDTHS: Record<string, string> = {
  fiscalYear: "46px", recordDate: "76px", assetNumber: "148px",
  assetName: "175px", budgetSource: "85px", purchaseProject: "135px",
  numberPlacement: "88px", assetStructureLabel: "66px", price: "66px",
  organization: "118px", location: "84px", responsiblePerson: "88px",
  responsiblePhone: "76px", status: "66px", note: "96px",
};

export function buildReportHtml(
  title: string,
  columns: ReportColumn[],
  rows: Array<Record<string, string | number>>,
  filterSummary: string,
  lang: "th" | "en" = "th",
) {
  const isEn = lang === "en";
  const systemName    = isEn ? "Activity Inventory Management System" : "ระบบครุภัณฑ์กิจกรรม";
  const exportedLabel = isEn ? "Exported on" : "วันที่ส่งออก";
  const totalLabel    = isEn ? "Total records" : "จำนวนข้อมูลทั้งหมด";
  const filterLabel   = isEn ? "Filters" : "เงื่อนไขตัวกรอง";
  const allLabel      = isEn ? "All records" : "ข้อมูลทั้งหมด";
  const noDataLabel   = isEn ? "No records found for the selected filters." : "ไม่พบรายการตามเงื่อนไขที่เลือก";
  const footerText    = isEn ? "Activity Inventory Management System · Auto-generated report" : "ระบบครุภัณฑ์กิจกรรม · รายงานสร้างจากระบบอัตโนมัติ";
  const unitLabel     = isEn ? "items" : "รายการ";
  const exportDate    = isEn ? formatExportDateEn() : formatExportDateTh();
  const filterDisplay = filterSummary.trim() || allLabel;

  const colGroup = [
    '<col style="width:34px" />',
    ...columns.map((c) => `<col style="width:${COL_WIDTHS[c.key] ?? "100px"}" />`),
  ].join("");
  const headerCells = columns.map((c) => `<th>${c.label}</th>`).join("");
  const bodyRows = rows.map((row, i) =>
    `<tr><td class="n">${i + 1}</td>${columns.map((c) => `<td>${getReportRowValue(row, c.key)}</td>`).join("")}</tr>`,
  ).join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
@page { size: A4 landscape; margin: 10mm 12mm; }
*{box-sizing:border-box}
body{font-family:"Noto Sans Thai","TH Sarabun New",Tahoma,sans-serif;color:#0F172A;margin:0;padding:0;font-size:10px}
.hdr{margin-bottom:12px;padding-bottom:9px;border-bottom:2.5px solid #1E40AF}
.sys{font-size:11px;font-weight:700;color:#1E40AF;margin:0 0 3px}
.ttl{font-size:17px;font-weight:800;color:#0F172A;margin:0 0 8px;line-height:1.25}
.meta{display:flex;flex-wrap:wrap;gap:4px 20px;font-size:9.5px}
.mi{display:flex;gap:4px}
.ml{font-weight:700;color:#0F172A}
.mv{color:#475569}
table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;line-height:1.45}
thead{display:table-header-group}
th{background:#1E40AF;color:#fff;text-align:left;font-weight:700;padding:5px 6px;border:1px solid #1E3A8A;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{border:1px solid #CBD5E1;padding:4px 6px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}
td.n{text-align:center;color:#64748B;font-size:9px;width:34px}
tr{page-break-inside:avoid}
tr:nth-child(even) td{background:#F0F8FF}
.ftr{margin-top:10px;padding-top:7px;border-top:1px solid #CBD5E1;font-size:9px;color:#64748B;text-align:center}
.nd{text-align:center;padding:20px;color:#64748B;font-style:italic}
</style>
</head>
<body>
<div class="hdr">
  <p class="sys">${systemName}</p>
  <h1 class="ttl">${title}</h1>
  <div class="meta">
    <div class="mi"><span class="ml">${exportedLabel}:</span><span class="mv">${exportDate}</span></div>
    <div class="mi"><span class="ml">${totalLabel}:</span><span class="mv">${rows.length.toLocaleString("th-TH")} ${unitLabel}</span></div>
    <div class="mi"><span class="ml">${filterLabel}:</span><span class="mv">${filterDisplay}</span></div>
  </div>
</div>
<table>
  <colgroup>${colGroup}</colgroup>
  <thead><tr><th style="width:34px">#</th>${headerCells}</tr></thead>
  <tbody>${bodyRows || `<tr><td class="nd" colspan="${columns.length + 1}">${noDataLabel}</td></tr>`}</tbody>
</table>
<div class="ftr">${footerText}</div>
</body>
</html>`;
}

export function downloadReportFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function getDashboardExportFileName() {
  const now = new Date();
  const thaiYear = now.getFullYear() + 543;
  const month = padDatePart(now.getMonth() + 1);
  const day = padDatePart(now.getDate());
  return `dashboard-ครุภัณฑ์-${thaiYear}${month}${day}.pdf`;
}

export function getDocumentStyleText() {
  return Array.from(document.styleSheets).map((sheet) => {
    try {
      return Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
    } catch {
      return "";
    }
  }).join("\n");
}

export function loadImageFromSource(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

export async function renderElementToCanvas(element: HTMLElement) {
  await document.fonts?.ready;
  const rect = element.getBoundingClientRect();
  const scale = 2;
  const width = Math.ceil(rect.width || element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.background = "#F5F7FA";
  clone.style.color = "#0F172A";

  const exportedAt = formatThaiDateTime(new Date().toISOString());
  const currentInspectionYear = String(getCurrentInspectionYear());
  const headerHtml = `
    <section style="margin-bottom:16px;padding:18px 20px;border:1px solid #E2E8F0;border-radius:12px;background:#FFFFFF;color:#0F172A;">
      <h1 style="margin:0;font-size:26px;font-weight:800;">รายงานภาพรวมครุภัณฑ์</h1>
      <p style="margin:8px 0 0;color:#64748B;font-size:14px;">วันที่ส่งออก: ${exportedAt} · ปีตรวจสอบปัจจุบัน: ${currentInspectionYear}</p>
    </section>
  `;
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px;min-height:${height}px;padding:16px;background:#F5F7FA;color:#0F172A;font-family:'Noto Sans Thai','Tahoma',sans-serif;">
      <style>${getDocumentStyleText()}</style>
      ${headerHtml}
      ${clone.outerHTML}
    </div>
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 120}">
      <foreignObject width="100%" height="100%">${html}</foreignObject>
    </svg>
  `;
  const image = await loadImageFromSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = (height + 120) * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ไม่สามารถเตรียม Canvas สำหรับ Export ได้");
  context.scale(scale, scale);
  context.fillStyle = "#F5F7FA";
  context.fillRect(0, 0, width, height + 120);
  context.drawImage(image, 0, 0);
  return canvas;
}

export function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function asciiToBytes(value: string) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
}

export function concatPdfParts(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

export function buildPdfFromCanvas(canvas: HTMLCanvasElement) {
  const pageWidth = 841.89;
  const pageHeight = 595.28;
  const margin = 30;
  const imageWidthPt = pageWidth - margin * 2;
  const maxImageHeightPt = pageHeight - margin * 2;
  const sliceHeightPx = Math.floor((maxImageHeightPt * canvas.width) / imageWidthPt);
  const pages: Array<{ width: number; height: number; bytes: Uint8Array; imageHeightPt: number }> = [];

  for (let sourceY = 0; sourceY < canvas.height; sourceY += sliceHeightPx) {
    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - sourceY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = currentSliceHeight;
    const context = sliceCanvas.getContext("2d");
    if (!context) throw new Error("ไม่สามารถเตรียมหน้า PDF ได้");
    context.fillStyle = "#F5F7FA";
    context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    context.drawImage(canvas, 0, sourceY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);
    pages.push({
      width: sliceCanvas.width,
      height: sliceCanvas.height,
      bytes: dataUrlToBytes(sliceCanvas.toDataURL("image/jpeg", 0.92)),
      imageHeightPt: (currentSliceHeight * imageWidthPt) / canvas.width,
    });
  }

  const objectParts: Uint8Array[][] = [];
  const addObject = (contentParts: Uint8Array[]) => objectParts.push(contentParts);
  const catalogId = 1;
  const pagesId = 2;
  const pageIds: number[] = [];

  pages.forEach((page, index) => {
    const pageId = 3 + index * 3;
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    pageIds.push(pageId);
    addObject([asciiToBytes(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)]);
    addObject([
      asciiToBytes(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      asciiToBytes("\nendstream"),
    ]);
    const y = pageHeight - margin - page.imageHeightPt;
    const content = `q\n${imageWidthPt} 0 0 ${page.imageHeightPt} ${margin} ${y} cm\n/Im${index + 1} Do\nQ`;
    addObject([asciiToBytes(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)]);
  });

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  objectParts.splice(0, 0, [asciiToBytes(`<< /Type /Pages /Kids [${kids}] /Count ${pageIds.length} >>`)]);
  objectParts.splice(0, 0, [asciiToBytes(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)]);

  const parts: Uint8Array[] = [asciiToBytes("%PDF-1.4\n")];
  const offsets: number[] = [0];
  let offset = parts[0].length;
  objectParts.forEach((contentParts, index) => {
    offsets.push(offset);
    const header = asciiToBytes(`${index + 1} 0 obj\n`);
    const footer = asciiToBytes("\nendobj\n");
    parts.push(header, ...contentParts, footer);
    offset += header.length + contentParts.reduce((sum, part) => sum + part.length, 0) + footer.length;
  });
  const xrefOffset = offset;
  const xrefRows = offsets.map((item, index) => index === 0 ? "0000000000 65535 f " : `${String(item).padStart(10, "0")} 00000 n `).join("\n");
  parts.push(asciiToBytes(`xref\n0 ${offsets.length}\n${xrefRows}\ntrailer\n<< /Size ${offsets.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([concatPdfParts(parts)], { type: "application/pdf" });
}

export async function exportDashboardToPDF() {
  const element = document.getElementById("dashboard-export-area");
  if (!element) throw new Error("ไม่พบพื้นที่ Dashboard สำหรับส่งออก");
  const canvas = await renderElementToCanvas(element);
  const pdfBlob = buildPdfFromCanvas(canvas);
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDashboardExportFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAssetReport(format: ReportFormat, title: string, columns: ReportColumn[], rows: Array<Record<string, string | number>>, filterSummary: string, options?: { lang?: "th" | "en" }) {
  const safeName = title.replace(/\s+/g, "-");
  const html = buildReportHtml(title, columns, rows, filterSummary, options?.lang ?? "th");

  if (format === "pdf") {
    const reportWindow = window.open("", "_blank", "width=1200,height=800");
    if (!reportWindow) return;
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(() => reportWindow.print(), 400);
    return;
  }

  if (format === "word") {
    downloadReportFile(`${safeName}.doc`, "application/msword;charset=utf-8", html);
    return;
  }

  downloadReportFile(`${safeName}.xls`, "application/vnd.ms-excel;charset=utf-8", html);
}

