export interface ExportRow {
  Date: string;
  Description: string;
  Merchant: string;
  Category: string;
  Type: string;
  Amount: string;
}

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToExcel(rows: ExportRow[], filename = "transactions.csv") {
  const headers = ["Date", "Description", "Merchant", "Category", "Type", "Amount"];

  const csvLines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) =>
      headers.map((h) => escapeCell(row[h as keyof ExportRow])).join(",")
    ),
  ];

  const csvContent = csvLines.join("\r\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
