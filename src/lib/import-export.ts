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
  fiscalYear: "46px", recordDate: "76px",
  registrationType: "140px", assetNumber: "148px", universityAssetNumber: "130px",
  assetName: "175px", budgetSource: "85px", purchaseProject: "135px",
  numberPlacement: "88px", assetStructureLabel: "66px", price: "66px",
  organization: "118px", location: "84px", responsiblePerson: "88px",
  responsiblePhone: "76px", status: "66px", note: "96px",
  // PDF-only reduced column set (see assetPdfReportColumns) — percentages (summing to
  // 100% together with the 5% index column) so the table always fills the full page
  // width regardless of render size, instead of fixed px that left the table narrower
  // than the page or forced awkward proportional scaling.
  pdfFiscalYear: "7%", pdfAssetNumber: "15%", pdfNumberType: "12%",
  pdfAssetName: "22%", pdfOrganization: "22%", pdfStatus: "8%", pdfInspectionResult: "9%",
};

export function buildReportHtml(
  title: string,
  columns: ReportColumn[],
  rows: Array<Record<string, string | number>>,
  filterSummary: string,
  lang: "th" | "en" = "th",
  layout?: { indexColumnLabel?: string; indexColumnWidth?: string; pageFillHeightPx?: number },
) {
  const isEn = lang === "en";
  const systemName    = isEn ? "Activity Inventory Management System" : "ระบบครุภัณฑ์กิจกรรม";
  const exportedLabel = isEn ? "Exported on" : "วันที่ส่งออก";
  const totalLabel    = isEn ? "Total records" : "จำนวนรายการ";
  const filterLabel   = isEn ? "Filters" : "เงื่อนไขตัวกรอง";
  const allLabel      = isEn ? "All records" : "ข้อมูลทั้งหมด";
  const noDataLabel   = isEn ? "No records found for the selected filters." : "ไม่พบรายการตามเงื่อนไขที่เลือก";
  const footerText    = isEn ? "Activity Inventory Management System · Auto-generated report" : "ระบบครุภัณฑ์กิจกรรม · รายงานนี้สร้างจากระบบอัตโนมัติ";
  const unitLabel     = isEn ? "items" : "รายการ";
  const exportDate    = isEn ? formatExportDateEn() : formatExportDateTh();
  const filterDisplay = filterSummary.trim() || allLabel;
  const indexLabel    = layout?.indexColumnLabel ?? "#";
  const indexWidth    = layout?.indexColumnWidth ?? "34px";

  const colGroup = [
    `<col style="width:${indexWidth}" />`,
    ...columns.map((c) => `<col style="width:${COL_WIDTHS[c.key] ?? "100px"}" />`),
  ].join("");
  const headerCells = columns.map((c) => `<th>${c.label}</th>`).join("");
  const bodyRows = rows.map((row, i) =>
    `<tr><td class="n">${i + 1}</td>${columns.map((c) => `<td>${getReportRowValue(row, c.key)}</td>`).join("")}</tr>`,
  ).join("");
  // When pageFillHeightPx is set (PDF export only), the header+table sit in a flex
  // column stretched to one full printed page's height, so the footer anchors to the
  // bottom of the page (margin-top:auto) instead of leaving a large blank gap after a
  // short table — the table itself is never stretched, only the footer's position is.
  const pageFillStyle = layout?.pageFillHeightPx
    ? `min-height:${layout.pageFillHeightPx}px;display:flex;flex-direction:column`
    : "";
  const footerStyle = layout?.pageFillHeightPx ? "margin-top:auto" : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
@page { size: A4 landscape; margin: 10mm 12mm; }
*{box-sizing:border-box}
body{font-family:"Noto Sans Thai","TH Sarabun New",Tahoma,sans-serif;color:#0F172A;margin:0;padding:0;font-size:10px}
.pg{${pageFillStyle}}
.hdr{margin-bottom:12px;padding-bottom:9px;border-bottom:2.5px solid #1E40AF}
.sys{font-size:11px;font-weight:700;color:#1E40AF;margin:0 0 3px}
.ttl{font-size:19px;font-weight:800;color:#0F172A;margin:0 0 8px;line-height:1.25}
.meta{display:flex;flex-wrap:wrap;gap:5px 20px;font-size:10.5px}
.mi{display:flex;gap:4px}
.ml{font-weight:700;color:#0F172A}
.mv{color:#475569}
table{width:100%;border-collapse:collapse;font-size:10px;table-layout:fixed;line-height:1.5}
thead{display:table-header-group}
th{background:#1E40AF;color:#fff;text-align:left;font-weight:700;padding:7px 8px;border:1px solid #1E3A8A;font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
td{border:1px solid #CBD5E1;padding:6px 8px;vertical-align:top;word-break:break-word;overflow-wrap:anywhere}
td.n{text-align:center;color:#64748B;font-size:10px}
tr{page-break-inside:avoid}
tr:nth-child(even) td{background:#F0F8FF}
.ftr{margin-top:10px;padding-top:7px;border-top:1px solid #CBD5E1;font-size:9px;color:#64748B;text-align:center}
.nd{text-align:center;padding:20px;color:#64748B;font-style:italic}
</style>
</head>
<body>
<div class="pg">
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
  <thead><tr><th style="width:${indexWidth}">${indexLabel}</th>${headerCells}</tr></thead>
  <tbody>${bodyRows || `<tr><td class="nd" colspan="${columns.length + 1}">${noDataLabel}</td></tr>`}</tbody>
</table>
<div class="ftr" style="${footerStyle}">${footerText}</div>
</div>
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

// A4 landscape geometry (points; 1pt = 1/72in), shared by buildPdfFromCanvas and the
// asset-report page-fill calculation so the two always stay consistent.
export const PDF_PAGE_WIDTH_PT = 841.89;
export const PDF_PAGE_HEIGHT_PT = 595.28;
export const PDF_MARGIN_PT = 30; // ~10.6mm, within the requested 10–12mm range

// The "CSS px" height that one full printed page's content area corresponds to when
// the report HTML is rendered at `renderWidthPx` — used to make a short table's
// footer sit at the bottom of the page instead of right under the table.
export function getPdfPageContentHeightPx(renderWidthPx: number) {
  const imageWidthPt = PDF_PAGE_WIDTH_PT - PDF_MARGIN_PT * 2;
  const maxImageHeightPt = PDF_PAGE_HEIGHT_PT - PDF_MARGIN_PT * 2;
  return Math.floor((maxImageHeightPt * renderWidthPx) / imageWidthPt);
}

export function buildPdfFromCanvas(canvas: HTMLCanvasElement, options?: { showPageNumbers?: boolean }) {
  const pageWidth = PDF_PAGE_WIDTH_PT;
  const pageHeight = PDF_PAGE_HEIGHT_PT;
  const margin = PDF_MARGIN_PT;
  const imageWidthPt = pageWidth - margin * 2;
  const maxImageHeightPt = pageHeight - margin * 2;
  const sliceHeightPx = Math.floor((maxImageHeightPt * canvas.width) / imageWidthPt);
  const totalPages = Math.max(1, Math.ceil(canvas.height / sliceHeightPx));
  const pages: Array<{ width: number; height: number; bytes: Uint8Array; imageHeightPt: number }> = [];

  let pageIndex = 0;
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
    if (options?.showPageNumbers) {
      // Baked into the raster (not a native PDF text object) so Thai glyphs render
      // correctly without needing to embed a Thai-capable PDF font.
      const label = `หน้า ${pageIndex + 1}/${totalPages}`;
      context.font = "600 22px 'IBM Plex Sans Thai', Tahoma, sans-serif";
      context.fillStyle = "#64748B";
      context.textAlign = "right";
      context.textBaseline = "bottom";
      context.fillText(label, sliceCanvas.width - 40, sliceCanvas.height - 28);
    }
    pages.push({
      width: sliceCanvas.width,
      height: sliceCanvas.height,
      bytes: dataUrlToBytes(sliceCanvas.toDataURL("image/jpeg", 0.92)),
      imageHeightPt: (currentSliceHeight * imageWidthPt) / canvas.width,
    });
    pageIndex += 1;
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

// Renders a full standalone HTML document (as produced by buildReportHtml, complete
// with its own <style> block) into a canvas via a hidden, attached iframe — an iframe
// is required (rather than a detached DOMParser document) because layout/scroll
// measurements only exist for documents that are actually part of the render tree.
export async function renderReportHtmlToCanvas(html: string, widthPx = 1120) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = "0px";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.addEventListener("error", () => reject(new Error("ไม่สามารถเตรียมเอกสารสำหรับ Export PDF ได้")), { once: true });
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error("ไม่สามารถเตรียมเอกสารสำหรับ Export PDF ได้");
    await doc.fonts?.ready;

    const heightPx = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight, 1);
    const styleText = Array.from(doc.querySelectorAll("style")).map((el) => el.textContent ?? "").join("\n");
    // foreignObject requires well-formed XML; innerHTML's HTML-serialized void
    // elements (e.g. <col> from the report's <colgroup>) aren't self-closed and
    // break the SVG parse. XMLSerializer always closes them correctly.
    const bodyHtml = new XMLSerializer().serializeToString(doc.body).replace(/^<body[^>]*>/, "").replace(/<\/body>$/, "");

    const wrapped = `
      <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${widthPx}px;min-height:${heightPx}px;background:#FFFFFF;">
        <style>${styleText}</style>
        ${bodyHtml}
      </div>
    `;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">
        <foreignObject width="100%" height="100%">${wrapped}</foreignObject>
      </svg>
    `;
    const image = await loadImageFromSource(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = widthPx * scale;
    canvas.height = heightPx * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("ไม่สามารถเตรียม Canvas สำหรับ Export ได้");
    context.scale(scale, scale);
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, widthPx, heightPx);
    context.drawImage(image, 0, 0);
    return canvas;
  } finally {
    iframe.remove();
  }
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

const PDF_RENDER_WIDTH_PX = 1120;

export async function exportAssetReport(format: ReportFormat, title: string, columns: ReportColumn[], rows: Array<Record<string, string | number>>, filterSummary: string, options?: { lang?: "th" | "en"; pdfFileName?: string }) {
  const safeName = title.replace(/\s+/g, "-");

  if (format === "pdf") {
    const html = buildReportHtml(title, columns, rows, filterSummary, options?.lang ?? "th", {
      indexColumnLabel: "ลำดับ",
      indexColumnWidth: "5%",
      pageFillHeightPx: getPdfPageContentHeightPx(PDF_RENDER_WIDTH_PX),
    });
    const canvas = await renderReportHtmlToCanvas(html, PDF_RENDER_WIDTH_PX);
    const pdfBlob = buildPdfFromCanvas(canvas, { showPageNumbers: true });
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = options?.pdfFileName ?? `${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const html = buildReportHtml(title, columns, rows, filterSummary, options?.lang ?? "th");

  if (format === "word") {
    downloadReportFile(`${safeName}.doc`, "application/msword;charset=utf-8", html);
    return;
  }

  downloadReportFile(`${safeName}.xls`, "application/vnd.ms-excel;charset=utf-8", html);
}

