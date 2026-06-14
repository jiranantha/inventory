"use client";

import { useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartColors, dashboardCardColors } from "@/constants/colors";
import { ChartCard, StatusBadge } from "@/components/ui";
import { statusColors } from "@/constants/statuses";
import { formatThaiDate, getCurrentInspectionYear, getDateSortTime } from "@/lib/dates";
import { countBy } from "@/lib/utils";
import { AnnualInspection, AssetListRow } from "@/types";

export function DashboardTable({
  title,
  columns,
  rows,
  onViewAll,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  onViewAll?: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex flex-col items-start justify-between gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="min-h-10 shrink-0 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            ดูรายการทั้งหมด
          </button>
        )}
      </div>
      <div className="space-y-3 p-4 md:hidden">
        {rows.map((row) => (
          <article key={row.join("-")} className="rounded-lg border border-line bg-surfaceSoft p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-sm font-semibold text-primary">{row[0]}</p>
              {(row[row.length - 1] === "ใช้งานได้" || row[row.length - 1] === "รอตรวจสอบ" || row[row.length - 1] === "ชำรุด" || row[row.length - 1] === "รอซ่อม") ? (
                <StatusBadge value={row[row.length - 1]} />
              ) : (
                <span className="shrink-0 text-sm text-ink">{row[row.length - 1]}</span>
              )}
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              {row.slice(1, row.length - 1).map((cell, index) => (
                <div key={`${columns[index + 1]}-${cell}`}>
                  <dt className="text-xs font-semibold text-muted">{columns[index + 1]}</dt>
                  <dd className="mt-1 break-words text-ink">{cell}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
          <thead className="bg-surfaceSoft text-ink">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-line px-3 py-2.5 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surfaceSoft text-ink">
            {rows.map((row) => (
              <tr key={row.join("-")} className="hover:bg-white/[0.03]">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${cell}`} title={cell} className={`px-3 py-3 ${index === 0 ? "font-semibold text-primary" : ""}`}>
                    {index === row.length - 1 && (cell === "ใช้งานได้" || cell === "รอตรวจสอบ" || cell === "ชำรุด" || cell === "รอซ่อม") ? (
                      <StatusBadge value={cell} />
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function DashboardPage({
  assets,
  annualInspections,
  onViewAllAssets,
}: {
  assets: AssetListRow[];
  annualInspections: AnnualInspection[];
  onViewAllAssets: () => void;
}) {
  const [chartsReady, setChartsReady] = useState(false);
  const currentInspectionYear = String(getCurrentInspectionYear());
  const currentYearInspections = annualInspections.filter((inspection) => inspection.inspectionYear === currentInspectionYear);
  const currentYearInspectedAssetIds = new Set(currentYearInspections.map((inspection) => inspection.assetId));
  const latestAssets = [...assets].sort((a, b) => {
    const dateDiff = getDateSortTime(b.recordDate) - getDateSortTime(a.recordDate);
    return dateDiff || b.id - a.id;
  });
  const assetsByFiscalYear = Object.entries(countBy(assets, (asset) => asset.fiscalYear))
    .sort(([a], [b]) => Number(a) - Number(b))
    .slice(-6)
    .map(([name, value]) => ({ name, value }));
  const assetsForOrganizationChart = assets.filter((asset) => asset.status !== "จำหน่ายแล้ว");
  const assetsByOrganization = Object.entries(countBy(assetsForOrganizationChart, (asset) => asset.organization))
    .sort(([nameA, countA], [nameB, countB]) => countB - countA || nameA.localeCompare(nameB, "th"))
    .map(([name, value]) => ({ name, value }));
  const assetsByStatus = Object.entries(countBy(assets, (asset) => asset.status))
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value, color: statusColors[name] ?? "#cbd5e1" }));
  const assetStatusTotal = assetsByStatus.reduce((total, item) => total + item.value, 0);
  const assetStatusDescription = assetsByStatus.length === 1
    ? `ครุภัณฑ์ทั้งหมดอยู่ในสถานะ${assetsByStatus[0].name}`
    : "แสดงสัดส่วนสถานะครุภัณฑ์ทั้งหมด";
  const inspectionResults = [
    { name: "ตรวจสอบแล้ว", value: assets.filter((asset) => currentYearInspectedAssetIds.has(asset.id)).length },
    { name: "ยังไม่ได้ตรวจสอบ", value: assets.filter((asset) => !currentYearInspectedAssetIds.has(asset.id)).length },
  ];
  const countByStatus = (statusName: string) => assets.filter((asset) => asset.status === statusName).length;
  const inspectedCount = assets.filter((asset) => currentYearInspectedAssetIds.has(asset.id)).length;
  const uninspectedCount = assets.length - inspectedCount;
  const assetStatusSummary = [
    {
      label: "จำนวนครุภัณฑ์ทั้งหมด",
      value: assets.length,
      note: "ข้อมูลครุภัณฑ์ทั้งหมดในระบบ",
      ...dashboardCardColors.total,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ยังไม่ได้ตรวจสอบประจำปี",
      value: uninspectedCount,
      note: `ยังไม่มีผลตรวจสอบปี ${currentInspectionYear}`,
      ...dashboardCardColors.pending,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ตรวจสอบแล้ว",
      value: inspectedCount,
      note: "มีข้อมูลผลตรวจสอบล่าสุด",
      ...dashboardCardColors.inspected,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ใช้งานได้",
      value: countByStatus("ใช้งานได้"),
      note: "สถานะพร้อมใช้งาน",
      ...dashboardCardColors.active,
    },
    {
      label: "จำนวนครุภัณฑ์ที่ชำรุด",
      value: countByStatus("ชำรุด"),
      note: "รายการที่มีสถานะชำรุด",
      ...dashboardCardColors.broken,
    },
    {
      label: "จำนวนครุภัณฑ์ที่รอซ่อม",
      value: countByStatus("รอซ่อม"),
      note: "อยู่ระหว่างรอดำเนินการซ่อม",
      ...dashboardCardColors.repair,
    },
    {
      label: "จำนวนครุภัณฑ์ที่สูญหาย",
      value: countByStatus("สูญหาย"),
      note: "รายการที่ระบุว่าสูญหาย",
      ...dashboardCardColors.missing,
    },
    {
      label: "จำนวนครุภัณฑ์ที่จำหน่ายแล้ว",
      value: countByStatus("จำหน่ายแล้ว"),
      note: "รายการที่ดำเนินการจำหน่ายแล้ว",
      ...dashboardCardColors.disposed,
    },
  ];
  const latestRows = latestAssets.slice(0, 5).map((row) => [
    row.assetNumber,
    row.assetName,
    row.organization,
    formatThaiDate(row.recordDate),
    row.status,
  ]);

  const tooltipStyle = {
    backgroundColor: "var(--color-bg-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    color: "var(--color-text-primary)",
  };

  useEffect(() => {
    setChartsReady(true);
  }, []);

  const chartFallback = (
    <div className="flex h-full items-center justify-center rounded-lg border border-line bg-surfaceSoft text-sm text-muted">
      กำลังเตรียมกราฟ
    </div>
  );
  const organizationChartEmptyState = (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surfaceSoft px-4 text-center">
      <p className="text-sm font-bold text-ink">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      <p className="mt-2 max-w-sm text-xs text-muted">ยังไม่มีข้อมูลครุภัณฑ์ที่สามารถนำมาสรุปตามฝ่าย/ชมรมได้</p>
    </div>
  );
  const fiscalYearChartEmptyState = (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surfaceSoft px-4 text-center">
      <p className="text-sm font-bold text-ink">ไม่มีข้อมูลสำหรับแสดงกราฟ</p>
      <p className="mt-2 max-w-sm text-xs text-muted">ยังไม่มีข้อมูลครุภัณฑ์ที่สามารถสรุปตามปีงบประมาณได้</p>
    </div>
  );

  return (
    <section id="dashboard-export-area" className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {assetStatusSummary.map((item) => {
          return (
            <article key={item.label} className={`flex min-h-[138px] flex-col rounded-lg border ${item.border} bg-surface bg-gradient-to-br ${item.glow} to-transparent p-4 shadow-glow`}>
              <p className="text-xs font-semibold text-ink">{item.label}</p>
              <strong className={`mt-2 block text-4xl font-extrabold leading-none ${item.accent}`}>{item.value.toLocaleString("th-TH")}</strong>
              <p className="mt-2 text-xs text-ink">{item.note}</p>
            </article>
          );
        })}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <ChartCard title="จำนวนครุภัณฑ์แยกตามปีงบประมาณล่าสุด 6 ปี">
          {chartsReady ? (
            assetsByFiscalYear.length > 0 ? (
              <div className="flex h-full flex-col">
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assetsByFiscalYear} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={chartColors.grid} vertical={false} />
                      <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        cursor={{ fill: "#DBEAFE" }}
                        formatter={(value) => [`${Number(value).toLocaleString("th-TH")} รายการ`, "จำนวนครุภัณฑ์"]}
                        labelFormatter={(label) => `ปีงบประมาณ: ${label}`}
                      />
                      <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill={chartColors.fiscalYearBar} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-muted">แสดงเฉพาะปีงบประมาณที่มีข้อมูลล่าสุด</p>
              </div>
            ) : fiscalYearChartEmptyState
          ) : chartFallback}
        </ChartCard>

        <ChartCard title="จำนวนครุภัณฑ์แยกตามองค์กร/ฝ่าย/ชมรม">
          {chartsReady ? (
            assetsByOrganization.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetsByOrganization} layout="vertical" margin={{ top: 20, right: 30, left: 55, bottom: 20 }}>
                  <CartesianGrid stroke={chartColors.grid} horizontal={false} />
                  <XAxis type="number" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={180}
                    stroke={chartColors.axis}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: chartColors.axis, fontSize: 12 }}
                    tickFormatter={(value: string) => value.length > 24 ? `${value.slice(0, 24)}...` : value}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "#DBEAFE" }}
                    formatter={(value) => [`${Number(value).toLocaleString("th-TH")} รายการ`, "จำนวนครุภัณฑ์"]}
                    labelFormatter={(label) => `องค์กร/ฝ่าย/ชมรม: ${label}`}
                  />
                  <Bar dataKey="value" name="จำนวนครุภัณฑ์" fill={chartColors.organizationBar} radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : organizationChartEmptyState
          ) : chartFallback}
        </ChartCard>

        <ChartCard title="สถานะครุภัณฑ์">
          {chartsReady ? (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={assetsByStatus} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                      {assetsByStatus.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [`${Number(value).toLocaleString("th-TH")} รายการ`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
                  <strong className="text-3xl font-extrabold leading-none text-ink">{assetStatusTotal.toLocaleString("th-TH")}</strong>
                  <span className="mt-1 text-xs font-semibold text-muted">รายการ</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-ink">
                {assetsByStatus.map((item) => (
                  <span key={item.name} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-muted">{assetStatusDescription}</p>
            </div>
          ) : chartFallback}
        </ChartCard>

        <ChartCard title={`ผลการตรวจสอบครุภัณฑ์ประจำปี ${currentInspectionYear}`}>
          {chartsReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inspectionResults} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={chartColors.grid} vertical={false} />
                <XAxis dataKey="name" stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={11} interval={0} />
                <YAxis stroke={chartColors.axis} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#DBEAFE" }} />
                <Bar dataKey="value" name="จำนวนรายการ" radius={[6, 6, 0, 0]}>
                  {inspectionResults.map((item) => (
                    <Cell key={item.name} fill={item.name === "ตรวจสอบแล้ว" ? chartColors.inspectionCompleted : chartColors.inspectionPending} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartFallback}
        </ChartCard>
      </div>

      <div className="grid gap-4">
        <DashboardTable
          title="รายการครุภัณฑ์ล่าสุดที่เพิ่มเข้าสู่ระบบ"
          columns={["หมายเลขครุภัณฑ์", "ชื่อรายการ", "ฝ่าย/ชมรม", "วันที่บันทึกเข้าระบบ", "สถานะ"]}
          rows={latestRows}
          onViewAll={onViewAllAssets}
        />
      </div>
    </section>
  );
}

