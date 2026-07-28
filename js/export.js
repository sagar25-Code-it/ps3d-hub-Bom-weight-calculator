function safeString(value) {
  return value == null ? "" : String(value);
}

export function neutralizeSpreadsheetFormula(value) {
  const text = safeString(value);
  return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value) {
  const text = neutralizeSpreadsheetFormula(value).replaceAll('"', '""');
  return `"${text}"`;
}

export function createBomCsv(state) {
  const project = state.project || {};
  const lines = Array.isArray(state.bom) ? state.bom : [];
  const header = [
    "Line",
    "Part name",
    "Shape",
    "Dimensions",
    "Material",
    "Density kg/m³",
    "Quantity",
    "Mass each kg",
    "Nominal total kg",
    "Waste %",
    "Procurement mass kg",
    "Rate per kg",
    "Estimated cost",
    "Formula",
    "Reference status",
  ];

  const rows = lines.map((line, index) => [
    index + 1,
    line.partName,
    line.shapeName,
    line.dimensionSummary,
    line.materialName,
    line.densityKgM3,
    line.quantity,
    line.massPerPieceKg,
    line.totalMassKg,
    line.wastePercent,
    line.procurementMassKg,
    line.costPerKg,
    line.estimatedCost,
    line.formula,
    line.referenceStatus,
  ]);

  const metadata = [
    ["PS3D Hub theoretical mass BOM"],
    ["Project", project.name],
    ["Client", project.client],
    ["Drawing / document no.", project.drawingNumber],
    ["Revision", project.revision],
    ["Prepared by", project.preparedBy],
    ["Checked by", project.checkedBy],
    ["Exported at", new Date().toISOString()],
    [],
  ];

  return [...metadata, header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

export function createProjectJson(state) {
  return JSON.stringify(
    {
      ...state,
      exportedAt: new Date().toISOString(),
      exportNotice:
        "Theoretical mass estimate. Verify critical values against drawings, active standards, supplier data, MTCs, or measured mass.",
    },
    null,
    2,
  );
}

export function safeFilename(value, fallback = "ps3d-bom") {
  const cleaned = safeString(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

export function downloadText(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
