import { shareOrDownload, safeFilename } from "./share";

export type CsvRow = (string | number | null | undefined)[];

function escapeCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) lines.push(r.map(escapeCell).join(","));
  return lines.join("\r\n");
}

export function downloadCsv(filenameBase: string, headers: string[], rows: CsvRow[]) {
  const csv = buildCsv(headers, rows);
  // BOM so Excel opens UTF-8 correctly
  shareOrDownload(safeFilename(filenameBase, "csv"), "\uFEFF" + csv, "text/csv;charset=utf-8");
}
