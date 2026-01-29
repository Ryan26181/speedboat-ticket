/**
 * Export utilities for generating CSV and Excel files
 */

/**
 * Generate CSV content from data array
 */
export function generateCSV(
  data: Record<string, unknown>[],
  headers: { key: string; label: string }[]
): string {
  const headerRow = headers.map((h) => `"${h.label}"`).join(",");
  const dataRows = data.map((row) =>
    headers
      .map((h) => {
        const value = row[h.key];
        if (value === null || value === undefined) return '""';
        if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
        if (typeof value === "number") return `"${value}"`;
        if (value instanceof Date) return `"${value.toISOString()}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Trigger CSV file download
 */
export function downloadCSV(csv: string, filename: string): void {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export (IDR)
 */
export function formatCurrencyForExport(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Generate filename with date
 */
export function generateFilename(prefix: string, extension: string = "csv"): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}-${date}.${extension}`;
}
