import ExcelJS from "exceljs";

import {
  MAX_IMPORT_ROWS,
  ParsedImportRow,
  normalizeHeaders,
  resolveImportTarget,
  validateImportRow,
} from "./importer";

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value == null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  if ("result" in value) {
    return value.result ?? null;
  }

  if ("text" in value) {
    return value.text;
  }

  if ("richText" in value) {
    return value.richText.map((part) => part.text).join("");
  }

  return String(value);
}

export async function readExcelImport(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const rows: ParsedImportRow[] = [];
  const ignoredSheets: string[] = [];

  workbook.eachSheet((worksheet) => {
    const targetModel = resolveImportTarget(worksheet.name);

    if (!targetModel) {
      ignoredSheets.push(worksheet.name);
      return;
    }

    const rawHeaders: unknown[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, column) => {
      rawHeaders[column - 1] = cellValue(cell.value);
    });
    const headers = normalizeHeaders(rawHeaders);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rows.length >= MAX_IMPORT_ROWS) {
        return;
      }

      const rawData: Record<string, unknown> = {};
      let hasContent = false;

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const value = cellValue(row.getCell(index + 1).value);
        rawData[header] = value;
        hasContent ||= value !== null && value !== undefined && value !== "";
      });

      if (hasContent) {
        rows.push(
          validateImportRow({
            sheetName: worksheet.name,
            rowNumber,
            targetModel,
            rawData,
          }),
        );
      }
    });
  });

  return {
    rows,
    ignoredSheets,
    truncated: rows.length >= MAX_IMPORT_ROWS,
  };
}
