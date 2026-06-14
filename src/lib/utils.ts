export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
}

export function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const key = getKey(item) || "ไม่ระบุ";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

export function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

