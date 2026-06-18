import { lightTheme } from "./theme";

export const themeColors = {
  bgMain: lightTheme.bgMain,
  bgCard: lightTheme.bgSurface,
  bgInput: lightTheme.bgInput,
  border: lightTheme.border,
  textPrimary: lightTheme.textPrimary,
  textSecondary: lightTheme.textSecondary,
  textMuted: lightTheme.textMuted,
  primary: lightTheme.primary,
  primaryHover: lightTheme.primaryHover,
  success: lightTheme.success,
  warning: lightTheme.pending,
  danger: lightTheme.danger,
  info: lightTheme.info,
  muted: lightTheme.muted,
};

export const assetStatusColors: Record<string, { bg: string; text: string; border: string; dot: string; chart: string }> = {
  พร้อมใช้งาน: { bg: "bg-[#ECFDF5]", text: "text-[#047857]", border: "ring-[#10B981]", dot: "bg-[#059669]", chart: "#059669" },
  ใช้งานได้: { bg: "bg-[#ECFDF5]", text: "text-[#047857]", border: "ring-[#10B981]", dot: "bg-[#059669]", chart: "#059669" },
  ชำรุด: { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]", border: "ring-[#F87171]", dot: "bg-[#DC2626]", chart: "#DC2626" },
  รอซ่อม: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]", border: "ring-[#FB923C]", dot: "bg-[#EA580C]", chart: "#EA580C" },
  สูญหาย: { bg: "bg-[#FDF2F8]", text: "text-[#BE123C]", border: "ring-[#FB7185]", dot: "bg-[#BE123C]", chart: "#BE123C" },
  โอนย้าย: { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", border: "ring-[#60A5FA]", dot: "bg-[#2563EB]", chart: "#2563EB" },
  จำหน่ายแล้ว: { bg: "bg-[#F1F5F9]", text: "text-[#475569]", border: "ring-[#94A3B8]", dot: "bg-[#64748B]", chart: "#64748B" },
  รอตรวจสอบ: { bg: "bg-[#FEFCE8]", text: "text-[#A16207]", border: "ring-[#FACC15]", dot: "bg-[#CA8A04]", chart: "#CA8A04" },
};

export const inspectionStatusColors = {
  inspected: {
    dot: "bg-[#059669]",
    badge: "border-[#10B981] bg-[#ECFDF5] text-[#047857]",
  },
  pending: {
    dot: "bg-[#DC2626]",
    badge: "border-[#F87171] bg-[#FEF2F2] text-[#B91C1C]",
  },
};

export const dashboardCardColors = {
  total:     { accent: "text-[#044377]", glow: "from-[#E1F1FE]", border: "border-[#9CD1FC]" },
  active:    { accent: "text-[#044377]", glow: "from-[#F0F8FF]", border: "border-[#C3E3FD]" },
  broken:    { accent: "text-[#032D50]", glow: "from-[#E1F1FE]", border: "border-[#9CD1FC]" },
  missing:   { accent: "text-[#032D50]", glow: "from-[#E1F1FE]", border: "border-[#9CD1FC]" },
  repair:    { accent: "text-[#044377]", glow: "from-[#F0F8FF]", border: "border-[#C3E3FD]" },
  disposed:  { accent: "text-[#508ABA]", glow: "from-[#F0F8FF]", border: "border-[#C3E3FD]" },
  inspected: { accent: "text-[#044377]", glow: "from-[#F0F8FF]", border: "border-[#C3E3FD]" },
  pending:   { accent: "text-[#032D50]", glow: "from-[#E1F1FE]", border: "border-[#9CD1FC]" },
};

export const chartColors = {
  fiscalYearBar: "#2563EB",
  organizationBar: "#044377",
  inspectionBar: "#2563EB",
  inspectionCompleted: "#059669",
  inspectionPending: "#CA8A04",
  grid: "#C3E3FD",
  axis: "#508ABA",
};

export const buttonColors = {
  primary: "bg-[#044377] text-[#FFFFFF] hover:bg-[#032D50]",
  cancelEnabled: "border-[#9CD1FC] bg-[#FFFFFF] text-[#011628] hover:bg-[#F0F8FF]",
  cancelDisabled: "border-[#9CD1FC] bg-[#E1F1FE] text-[#508ABA] opacity-80",
  danger: "bg-[#DC2626] text-[#FFFFFF] hover:bg-[#B91C1C]",
};
