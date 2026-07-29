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

function objectOrEmpty(value) {
  return value && typeof value === "object" ? value : {};
}

function finiteNumberOrBlank(value) {
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" && value.trim() === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function positiveNumberOrBlank(value) {
  const number = finiteNumberOrBlank(value);
  return typeof number === "number" && number > 0 ? number : "";
}

function nonNegativeNumberOrBlank(value) {
  const number = finiteNumberOrBlank(value);
  return typeof number === "number" && number >= 0 ? number : "";
}

function minimumPositiveOrBlank(...values) {
  const numbers = values
    .map(positiveNumberOrBlank)
    .filter((value) => typeof value === "number");
  return numbers.length ? Math.min(...numbers) : "";
}

function preferredMinimumOrBlank(preferred, ...fallbacks) {
  const value = positiveNumberOrBlank(preferred);
  return value === "" ? minimumPositiveOrBlank(...fallbacks) : value;
}

function joinWarnings(value) {
  if (!Array.isArray(value)) return safeString(value);
  return value
    .map((warning) => safeString(warning).trim())
    .filter(Boolean)
    .join(" | ");
}

function engineeringStatusLabel(value) {
  return {
    "information-only": "Information only — no yield/Euler utilization",
    "within-entered-limit": "Entered yield/Euler screens ≤ 1.0",
    "exceeds-entered-limit": "Entered yield/Euler screen > 1.0",
    "unsupported-geometry": "Section screening unavailable",
    "incomplete-input": "Optional engineering input incomplete",
  }[value] || "";
}

function engineeringCsvValues(line) {
  const section = objectOrEmpty(line.sectionProperties);
  const inertia = objectOrEmpty(section.inertiaM4);
  const sectionModulus = objectOrEmpty(section.elasticSectionModulusM3);
  const radius = objectOrEmpty(section.radiusOfGyrationM);
  const torsion = objectOrEmpty(section.torsion);
  const inputs = objectOrEmpty(line.engineeringInputs);
  const material = objectOrEmpty(inputs.material);
  const loads = objectOrEmpty(inputs.loads);
  const practical = objectOrEmpty(inputs.practical);
  const summary = objectOrEmpty(line.engineeringSummary);
  const outputs = objectOrEmpty(summary.outputs);
  const deflection = objectOrEmpty(outputs.deflection);
  const torsionOutput = objectOrEmpty(outputs.torsion);
  const hasSectionProperties = section.available === true;

  return [
    hasSectionProperties ? positiveNumberOrBlank(section.areaM2) : "",
    hasSectionProperties ? positiveNumberOrBlank(inertia.x) : "",
    hasSectionProperties ? positiveNumberOrBlank(inertia.y) : "",
    hasSectionProperties ? finiteNumberOrBlank(inertia.xy) : "",
    hasSectionProperties
      ? preferredMinimumOrBlank(
        sectionModulus.xMinimum,
        sectionModulus.xPositive,
        sectionModulus.xNegative,
      )
      : "",
    hasSectionProperties
      ? preferredMinimumOrBlank(
        sectionModulus.yMinimum,
        sectionModulus.yPositive,
        sectionModulus.yNegative,
      )
      : "",
    hasSectionProperties
      ? preferredMinimumOrBlank(
        radius.principalMinimum,
        radius.x,
        radius.y,
      )
      : "",
    hasSectionProperties ? positiveNumberOrBlank(section.polarAreaMomentM4) : "",
    hasSectionProperties ? positiveNumberOrBlank(torsion.constantM4) : "",
    engineeringStatusLabel(summary.status),
    positiveNumberOrBlank(material.yieldStrengthMpa),
    positiveNumberOrBlank(material.tensileStrengthMpa),
    positiveNumberOrBlank(material.elasticModulusGpa),
    finiteNumberOrBlank(material.poissonRatio),
    nonNegativeNumberOrBlank(material.elongationPercent),
    positiveNumberOrBlank(material.hardnessValue),
    safeString(material.hardnessScale),
    safeString(material.condition),
    positiveNumberOrBlank(outputs.grossAxialYieldForceN),
    positiveNumberOrBlank(outputs.firstYieldMomentXNm),
    positiveNumberOrBlank(outputs.firstYieldMomentYNm),
    nonNegativeNumberOrBlank(outputs.combinedNormalStressEnvelopePa),
    nonNegativeNumberOrBlank(outputs.yieldUtilization),
    nonNegativeNumberOrBlank(outputs.worstUtilization),
    positiveNumberOrBlank(loads.columnLengthM),
    positiveNumberOrBlank(loads.effectiveLengthFactor),
    positiveNumberOrBlank(outputs.effectiveLengthM),
    positiveNumberOrBlank(outputs.slendernessRatio),
    positiveNumberOrBlank(outputs.eulerFlexuralBucklingForceN),
    nonNegativeNumberOrBlank(outputs.eulerUtilization),
    nonNegativeNumberOrBlank(deflection.deflectionM),
    safeString(deflection.loadCase || loads.deflectionCase),
    safeString(deflection.axis || loads.deflectionAxis),
    positiveNumberOrBlank(loads.deflectionLoad),
    String(loads.deflectionCase || "").endsWith("-udl")
      ? "kN/m"
      : loads.deflectionCase
        ? "kN"
        : "",
    positiveNumberOrBlank(deflection.spanM || loads.deflectionSpanM),
    nonNegativeNumberOrBlank(deflection.spanToDeflectionRatio),
    nonNegativeNumberOrBlank(torsionOutput.shearStressPa),
    finiteNumberOrBlank(torsionOutput.twistRad),
    safeString(practical.environment),
    safeString(practical.corrosionAssessment),
    safeString(practical.fabricationAssessment),
    safeString(practical.availabilityAssessment),
    safeString(material.source),
    safeString(practical.source),
    safeString(practical.notes),
    joinWarnings(summary.warnings),
  ];
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
    "Area A (m2)",
    "Ix (m4)",
    "Iy (m4)",
    "Ixy (m4)",
    "Minimum Sx (m3)",
    "Minimum Sy (m3)",
    "Minimum radius of gyration (m)",
    "Polar area moment Jp (m4)",
    "Saint-Venant torsion constant Jt (m4)",
    "Engineering status (yield/Euler scope)",
    "Entered yield/proof strength (MPa)",
    "Entered UTS (MPa)",
    "Entered elastic modulus E (GPa)",
    "Entered Poisson ratio",
    "Entered elongation (%)",
    "Entered hardness value",
    "Entered hardness scale",
    "Mechanical-property condition",
    "Gross axial yield reference (N)",
    "First-yield moment x (N m)",
    "First-yield moment y (N m)",
    "Combined normal-stress envelope (Pa)",
    "Yield utilization ratio",
    "Worst utilization ratio",
    "Column length (m)",
    "Effective length factor K",
    "Effective length KL (m)",
    "Slenderness KL/rmin",
    "Euler flexural buckling force (N)",
    "Euler utilization ratio",
    "Deflection (m)",
    "Deflection load case",
    "Deflection axis",
    "Deflection load input",
    "Deflection load unit",
    "Deflection span (m)",
    "Span/deflection ratio",
    "Torsional shear screen (Pa)",
    "Saint-Venant twist (rad)",
    "Environment",
    "Corrosion assessment",
    "Fabrication assessment",
    "Availability assessment",
    "Property source",
    "Practical assessment source",
    "Practical notes",
    "Engineering warnings",
  ];

  const rows = lines.map((line, index) => {
    const bomLine = objectOrEmpty(line);
    return [
      index + 1,
      bomLine.partName,
      bomLine.shapeName,
      bomLine.dimensionSummary,
      bomLine.materialName,
      bomLine.densityKgM3,
      bomLine.quantity,
      bomLine.massPerPieceKg,
      bomLine.totalMassKg,
      bomLine.wastePercent,
      bomLine.procurementMassKg,
      bomLine.costPerKg,
      bomLine.estimatedCost,
      bomLine.formula,
      bomLine.referenceStatus,
      ...engineeringCsvValues(bomLine),
    ];
  });

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
        "Theoretical mass estimate with optional gross-section engineering screens. Verify geometry, source- and condition-specific properties, loads, governing codes, supplier or MTC data, test results, and measured mass before use.",
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
