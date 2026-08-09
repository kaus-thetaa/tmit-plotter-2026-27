// builds a csv string from column data and triggers a browser download
export const downloadCsv = (
  filename: string,
  headers: string[],
  columns: number[][]
) => {
  const rowCount = columns[0]?.length ?? 0;
  const lines = [headers.join(",")];

  for (let i = 0; i < rowCount; i++) {
    const row = columns.map((col) => col[i] ?? "");
    lines.push(row.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
