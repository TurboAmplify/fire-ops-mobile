import { shareOrDownload, safeFilename } from "./share";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  /** "currency" → $#,##0.00; "number" → 0.00; "int" → 0; "date" → m/d/yyyy */
  format?: "currency" | "number" | "int" | "date" | "text";
}

export interface ExcelSheet {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, string | number | null | undefined>[];
}

const FORMATS: Record<string, string> = {
  currency: '"$"#,##0.00;[Red]("$"#,##0.00)',
  number: "#,##0.00",
  int: "#,##0",
  date: "m/d/yyyy",
  text: "@",
};

export async function downloadExcel(filenameBase: string, sheets: ExcelSheet[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const aoa: (string | number | null)[][] = [];
    aoa.push(sheet.columns.map((c) => c.header));
    for (const row of sheet.rows) {
      aoa.push(
        sheet.columns.map((c) => {
          const v = row[c.key];
          if (v == null || v === "") return null;
          return v as string | number;
        }),
      );
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws["!cols"] = sheet.columns.map((c) => ({ wch: c.width ?? Math.max(10, c.header.length + 2) }));
    // Freeze header
    ws["!freeze"] = { xSplit: 0, ySplit: 1 } as never;
    ws["!views"] = [{ state: "frozen", ySplit: 1 }] as never;

    // Bold header row
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = ws[addr];
      if (cell) {
        cell.s = { font: { bold: true }, alignment: { horizontal: "left" } };
      }
    }

    // Apply per-column formatting to data rows
    for (let R = 1; R <= aoa.length - 1; ++R) {
      sheet.columns.forEach((col, C) => {
        if (!col.format || col.format === "text") return;
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) return;
        cell.z = FORMATS[col.format] ?? "@";
        if (col.format === "currency" || col.format === "number" || col.format === "int") {
          if (typeof cell.v === "string" && cell.v !== "") {
            const n = Number(cell.v);
            if (!isNaN(n)) cell.v = n;
          }
          cell.t = "n";
        }
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  shareOrDownload(
    safeFilename(filenameBase, "xlsx"),
    buf,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
}
