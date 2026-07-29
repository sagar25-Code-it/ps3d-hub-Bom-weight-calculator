import {
  MATERIALS,
  MATERIAL_CATEGORIES,
  PRIMARY_SOURCES,
  getMaterial,
} from "./materials.js";
import {
  SHAPES,
  SHAPE_CATEGORIES,
  getShape,
} from "./shapes.js";
import {
  calculatePart,
  formatArea,
  formatCurrency,
  formatForce,
  formatMass,
  formatVolume,
} from "./engine.js";
import {
  STATE_VERSION,
  clearState,
  createDefaultProject,
  loadState,
  normalizeStoredState,
  saveState,
} from "./storage.js";
import {
  createBomCsv,
  createProjectJson,
  downloadText,
  safeFilename,
} from "./export.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  brand: $(".brand"),
  tabs: $$(".view-tab"),
  panels: $$(".view-panel"),
  themeToggle: $("#theme-toggle"),
  unitInputs: $$('input[name="unit-system"]'),
  shapeCount: $("#shape-count"),
  materialCount: $("#material-count"),
  shapeSelect: $("#shape-select"),
  shapeNote: $("#shape-note"),
  materialSearch: $("#material-search"),
  materialSelect: $("#material-select"),
  materialEvidence: $("#material-evidence"),
  materialDensityDisplay: $("#material-density-display"),
  materialStatusDisplay: $("#material-status-display"),
  materialReferenceDisplay: $("#material-reference-display"),
  customDensityEnabled: $("#custom-density-enabled"),
  customDensityWrap: $("#custom-density-wrap"),
  customDensity: $("#custom-density"),
  dimensionHint: $("#dimension-unit-hint"),
  dimensionEmpty: $("#dimension-empty"),
  dimensionFields: $("#dimension-fields"),
  quantity: $("#quantity"),
  partName: $("#part-name"),
  tolerance: $("#tolerance"),
  waste: $("#waste"),
  costPerKg: $("#cost-per-kg"),
  calculatorForm: $("#calculator-form"),
  calculatorErrors: $("#calculator-errors"),
  resetCalculator: $("#reset-calculator"),
  resultEmpty: $("#result-empty"),
  resultContent: $("#result-content"),
  resultDirty: $("#result-dirty"),
  shapeDiagram: $("#shape-diagram"),
  addToBom: $("#add-to-bom"),
  copyResult: $("#copy-result"),
  cancelBomEdit: $("#cancel-bom-edit"),
  navBomCount: $("#nav-bom-count"),
  projectInputs: $$(".project-input"),
  saveStatus: $("#save-status"),
  bomBody: $("#bom-body"),
  bomEmpty: $("#bom-empty"),
  summaryLines: $("#summary-lines"),
  summaryPieces: $("#summary-pieces"),
  summaryMass: $("#summary-mass"),
  summaryProcurement: $("#summary-procurement"),
  summaryCost: $("#summary-cost"),
  bomAddCurrent: $("#bom-add-current"),
  bomImport: $("#bom-import"),
  bomImportFile: $("#bom-import-file"),
  bomExportCsv: $("#bom-export-csv"),
  bomExportJson: $("#bom-export-json"),
  bomPrint: $("#bom-print"),
  newBom: $("#new-bom"),
  sourceList: $("#source-list"),
  footerContact: $("#footer-contact"),
  toast: $("#toast"),
};

const projectFieldMap = {
  "project-name": "name",
  "client-name": "client",
  "drawing-number": "drawingNumber",
  revision: "revision",
  "prepared-by": "preparedBy",
  "checked-by": "checkedBy",
};

const referenceStatuses = new Set([
  "reference",
  "indicative",
  "custom",
  "grade-reference",
  "product-form-limited",
  "general-reference",
  "classification-only",
  "test-method-only",
  "citation-removed",
  "unverified",
  "moisture-dependent",
  "mix-dependent",
]);

const loaded = loadState();
let state = normalizeStoredState(loaded.state);
state.bom = state.bom.map(sanitizeBomLine).filter(Boolean);
let currentResult = null;
let currentSnapshot = null;
let resultMode = "empty";
let saveTimer = null;
let toastTimer = null;
let undoStack = [];
let materialQuery = "";
let editingLineId = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function finiteNumber(value, fallback = null) {
  if (typeof value === "string" && value.trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  const number = finiteNumber(value, fallback);
  return number !== null && number >= 0 ? number : fallback;
}

function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `line-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeReferenceStatus(value) {
  const status = String(value || "reference").toLowerCase();
  return referenceStatuses.has(status) ? status : "reference";
}

function referenceStatusLabel(value) {
  const status = normalizeReferenceStatus(value);
  return status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sanitizeBomLine(line) {
  if (!line || typeof line !== "object") return null;
  const massPerPieceKg = finiteNumber(line.massPerPieceKg);
  const quantity = finiteNumber(line.quantity);
  const densityKgM3 = finiteNumber(line.densityKgM3);
  if (
    massPerPieceKg === null ||
    massPerPieceKg <= 0 ||
    quantity === null ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1_000_000 ||
    densityKgM3 === null ||
    densityKgM3 <= 0
  ) {
    return null;
  }

  const wastePercent = Math.min(nonNegative(line.wastePercent), 500);
  const totalMassKg = massPerPieceKg * quantity;
  const procurementMassKg = totalMassKg * (1 + wastePercent / 100);
  const costPerKg = Math.min(nonNegative(line.costPerKg), 10_000_000);

  return {
    id: String(line.id || createId()).slice(0, 100),
    partName: String(line.partName || "Calculated part").slice(0, 80),
    shapeId: String(line.shapeId || "").slice(0, 80),
    shapeName: String(line.shapeName || "Unknown shape").slice(0, 120),
    materialId: String(line.materialId || "").slice(0, 80),
    materialName: String(line.materialName || "Custom material").slice(0, 160),
    densityKgM3,
    referenceStatus: normalizeReferenceStatus(line.referenceStatus),
    gradeReference: String(line.gradeReference || "").slice(0, 240),
    unitSystem: line.unitSystem === "imperial" ? "imperial" : "metric",
    dimensions: line.dimensions && typeof line.dimensions === "object" ? { ...line.dimensions } : {},
    normalizedDimensions:
      line.normalizedDimensions && typeof line.normalizedDimensions === "object"
        ? { ...line.normalizedDimensions }
        : {},
    dimensionSummary: String(line.dimensionSummary || "").slice(0, 400),
    quantity,
    massPerPieceKg,
    totalMassKg,
    volumeM3: Math.max(0, finiteNumber(line.volumeM3, 0)),
    areaM2: Math.max(0, finiteNumber(line.areaM2, 0)),
    forceN: Math.max(0, finiteNumber(line.forceN, totalMassKg * 9.80665)),
    tolerancePercent: Math.min(nonNegative(line.tolerancePercent), 50),
    wastePercent,
    procurementMassKg,
    costPerKg,
    estimatedCost: procurementMassKg * costPerKg,
    formula: String(line.formula || "").slice(0, 500),
    substitution: String(line.substitution || "").slice(0, 1_000),
    assumptions: String(line.assumptions || "").slice(0, 1_000),
    createdAt: typeof line.createdAt === "string" ? line.createdAt : new Date().toISOString(),
  };
}

function showToast(message, duration = 3_200, action = null) {
  clearTimeout(toastTimer);
  elements.toast.replaceChildren(document.createTextNode(message));
  if (action?.label && typeof action.onClick === "function") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick, { once: true });
    elements.toast.appendChild(button);
  }
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, duration);
}

function flushSave({ announce = true } = {}) {
  clearTimeout(saveTimer);
  saveTimer = null;
  const saved = saveState(state);
  if (saved.ok) {
    state = saved.state;
    if (announce) {
      elements.saveStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span>Saved locally';
    }
  } else if (announce) {
    elements.saveStatus.textContent = "Local save unavailable — download JSON backup";
  }
  return saved.ok;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  elements.saveStatus.innerHTML = '<span class="status-dot" aria-hidden="true"></span>Saving…';
  saveTimer = setTimeout(() => flushSave(), 220);
}

function applyTheme(theme, persist = true) {
  state.theme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = state.theme;
  const next = state.theme === "dark" ? "light" : "dark";
  elements.themeToggle.setAttribute("aria-label", `Switch to ${next} theme`);
  elements.themeToggle.title = `Switch to ${next} theme`;
  if (persist) scheduleSave();
}

function switchView(view, { focus = false, persist = true } = {}) {
  if (!["calculator", "bom", "method"].includes(view)) view = "calculator";
  state.activeView = view;

  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.view === view;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  });

  elements.panels.forEach((panel) => {
    panel.hidden = panel.id !== `view-${view}`;
  });

  const nextHash = view === "calculator" ? "#calculator" : `#${view}`;
  if (location.hash !== nextHash) history.replaceState(null, "", nextHash);
  if (persist) scheduleSave();
}

function handleTabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = elements.tabs.indexOf(event.currentTarget);
  let nextIndex = currentIndex;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + elements.tabs.length) % elements.tabs.length;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % elements.tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = elements.tabs.length - 1;
  switchView(elements.tabs[nextIndex].dataset.view, { focus: true });
}

function groupOptions(items, categories, selectedValue, label, valueKey = "id", nameKey = "name") {
  let html = `<option value="">${escapeHtml(label)}</option>`;
  categories.forEach((category) => {
    const matches = items.filter((item) => item.category === category);
    if (!matches.length) return;
    html += `<optgroup label="${escapeHtml(category)}">`;
    html += matches.map((item) => {
      const value = item[valueKey];
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(item[nameKey])}</option>`;
    }).join("");
    html += "</optgroup>";
  });
  return html;
}

function renderShapeOptions(selectedValue = elements.shapeSelect.value) {
  elements.shapeSelect.innerHTML = groupOptions(
    SHAPES,
    SHAPE_CATEGORIES,
    selectedValue,
    "Select a shape…",
  );
}

function materialMatches(material, query) {
  if (!query) return true;
  const haystack = [
    material.name,
    material.category,
    material.gradeReference,
    material.id,
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function renderMaterialOptions(selectedValue = elements.materialSelect.value) {
  const query = materialQuery.trim().toLowerCase();
  const selected = getMaterial(selectedValue);
  let filtered = MATERIALS.filter((material) => materialMatches(material, query));
  if (selected && !filtered.some((material) => material.id === selected.id)) filtered = [selected, ...filtered];

  const categories = MATERIAL_CATEGORIES.filter((category) =>
    filtered.some((material) => material.category === category),
  );
  elements.materialSelect.innerHTML = groupOptions(
    filtered,
    categories,
    selectedValue,
    query ? `Select from ${filtered.length} matches…` : "Select a material…",
  );
}

function dimensionUnit(field, unitSystem = state.unitSystem) {
  if (field.kind === "length") return unitSystem === "imperial" ? "ft" : "m";
  return unitSystem === "imperial" ? "in" : "mm";
}

function convertDraftValue(value, field, from, to) {
  const number = finiteNumber(value);
  if (number === null || from === to) return value;
  if (field.kind === "length") return from === "metric"
    ? Number((number / 0.3048).toPrecision(10))
    : Number((number * 0.3048).toPrecision(10));
  return from === "metric"
    ? Number((number / 25.4).toPrecision(10))
    : Number((number * 25.4).toPrecision(10));
}

function getDisplayedDimensions() {
  return Object.fromEntries(
    $$(".dimension-input", elements.dimensionFields).map((input) => [input.dataset.field, input.value]),
  );
}

function shapeAssumption(shape) {
  if (!shape) return "";
  const assumptions = Array.isArray(shape.assumptions) ? shape.assumptions.join(" ") : shape.assumptions;
  return assumptions || shape.description || "";
}

function shapeFields(shape) {
  return shape?.fields || shape?.dimensions || [];
}

function renderShapeNote() {
  const shape = getShape(elements.shapeSelect.value);
  if (!shape) {
    elements.shapeNote.hidden = true;
    elements.shapeNote.textContent = "";
    renderShapeDiagram(null);
    return;
  }
  elements.shapeNote.hidden = false;
  elements.shapeNote.innerHTML = `<strong>${escapeHtml(shape.description)}</strong><br>${escapeHtml(shapeAssumption(shape))}`;
  renderShapeDiagram(shape);
}

function renderShapeDiagram(shape) {
  if (!shape) {
    elements.shapeDiagram.innerHTML = '<span class="diagram-placeholder">◇</span>';
    return;
  }
  const circular = ["round_bar", "rnd_pipe", "circ_plate", "ring", "sphere", "hol_sphere", "cylinder", "cone"]
    .includes(shape.id);
  const hollow = ["rnd_pipe", "shs", "rhs", "ring", "hol_sphere"].includes(shape.id);
  elements.shapeDiagram.innerHTML = `
    <span class="shape-visual ${circular ? "circle" : ""} ${hollow ? "hollow" : ""}">
      <span class="shape-symbol">${escapeHtml(shape.symbol || "◇")}</span>
    </span>
  `;
}

function renderDimensionFields(values = {}) {
  const shape = getShape(elements.shapeSelect.value);
  if (!shape) {
    elements.dimensionEmpty.hidden = false;
    elements.dimensionFields.replaceChildren();
    return;
  }

  elements.dimensionEmpty.hidden = true;
  const fragment = document.createDocumentFragment();
  shapeFields(shape).forEach((field) => {
    const wrapper = document.createElement("div");
    wrapper.className = "dimension-field";
    const inputId = `dimension-${field.key}`;
    const errorId = `${inputId}-error`;
    const unitId = `${inputId}-unit`;
    wrapper.innerHTML = `
      <label class="field-label" for="${escapeHtml(inputId)}">${escapeHtml(field.label)}
        <span>(${escapeHtml(field.symbol || field.key)})</span>
      </label>
      <div class="dimension-input-wrap">
        <input class="control numeric dimension-input" id="${escapeHtml(inputId)}" name="${escapeHtml(field.key)}"
          data-field="${escapeHtml(field.key)}" type="number" min="0.000001" step="any" inputmode="decimal"
          value="${escapeHtml(values[field.key] ?? "")}"
          aria-describedby="${escapeHtml(unitId)} ${escapeHtml(errorId)}" required>
        <span class="unit-suffix" id="${escapeHtml(unitId)}">${escapeHtml(dimensionUnit(field))}</span>
      </div>
      <p class="field-error" id="${escapeHtml(errorId)}" hidden></p>
    `;
    fragment.appendChild(wrapper);
  });
  elements.dimensionFields.replaceChildren(fragment);
}

function updateUnitHint() {
  elements.dimensionHint.textContent = state.unitSystem === "metric"
    ? "Cross-section dimensions use mm; length uses m."
    : "Cross-section dimensions use inches; length uses feet.";
}

function renderMaterialEvidence() {
  const material = getMaterial(elements.materialSelect.value);
  if (!material) {
    elements.materialEvidence.hidden = true;
    return;
  }
  elements.materialEvidence.hidden = false;
  elements.materialDensityDisplay.textContent = `${material.densityKgM3.toLocaleString("en-IN")} kg/m³`;
  elements.materialStatusDisplay.textContent = referenceStatusLabel(material.referenceStatus);
  elements.materialReferenceDisplay.textContent =
    `${material.gradeReference || "No grade standard claimed."} ${material.note || ""}`.trim();
}

function clearValidation() {
  elements.calculatorErrors.hidden = true;
  $("ul", elements.calculatorErrors).replaceChildren();
  $$("[aria-invalid='true']", elements.calculatorForm).forEach((input) => input.removeAttribute("aria-invalid"));
  $$(".field-error", elements.calculatorForm).forEach((message) => {
    message.hidden = true;
    message.textContent = "";
  });
}

function normalizeErrors(errors) {
  return (Array.isArray(errors) ? errors : []).map((error) => {
    if (typeof error === "string") return { field: "", message: error };
    return {
      field: String(error?.field || error?.fields?.[0] || ""),
      message: String(error?.message || error?.code || "Invalid input"),
    };
  });
}

function showValidation(errors) {
  const normalized = normalizeErrors(errors);
  if (!normalized.length) return;
  const list = $("ul", elements.calculatorErrors);
  normalized.forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error.message;
    list.appendChild(item);

    const fieldInput = error.field
      ? $(`[data-field="${CSS.escape(error.field)}"]`, elements.dimensionFields)
        || $(`#${CSS.escape(error.field)}`, elements.calculatorForm)
      : null;
    if (fieldInput) {
      fieldInput.setAttribute("aria-invalid", "true");
      const message = $(`#${CSS.escape(fieldInput.id)}-error`);
      if (message) {
        message.textContent = error.message;
        message.hidden = false;
      }
    }
  });
  elements.calculatorErrors.hidden = false;
}

function markResultDirty() {
  clearValidation();
  if (resultMode === "valid") {
    currentResult = null;
    currentSnapshot = null;
    resultMode = "dirty";
    elements.resultContent.hidden = true;
    elements.resultEmpty.hidden = true;
    elements.resultDirty.hidden = false;
    elements.addToBom.disabled = true;
  } else if (resultMode === "dirty") {
    currentResult = null;
    currentSnapshot = null;
  }
}

function readCalculatorDraft() {
  const material = getMaterial(elements.materialSelect.value);
  const customDensityEnabled = elements.customDensityEnabled.checked;
  const customDensityValue = customDensityEnabled
    ? finiteNumber(elements.customDensity.value)
    : null;
  const densityKgM3 = customDensityEnabled
    ? customDensityValue
    : material?.densityKgM3 ?? null;

  return {
    shapeId: elements.shapeSelect.value,
    material,
    materialId: material?.id || "",
    densityKgM3,
    customDensity: customDensityEnabled,
    dimensions: getDisplayedDimensions(),
    unitSystem: state.unitSystem,
    quantity: finiteNumber(elements.quantity.value),
    tolerancePercent: finiteNumber(elements.tolerance.value, 0),
    wastePercent: finiteNumber(elements.waste.value, 0),
    costPerKg: finiteNumber(elements.costPerKg.value, 0),
    partName: elements.partName.value.trim().slice(0, 80),
  };
}

function formatDimensionSummary(shape, dimensions, unitSystem) {
  if (!shape) return "";
  return shapeFields(shape)
    .map((field) => `${field.symbol || field.key} ${dimensions[field.key]} ${dimensionUnit(field, unitSystem)}`)
    .join(" × ");
}

function calculateDraft(draft) {
  const errors = [];
  if (!draft.shapeId) errors.push({ field: "shape-select", message: "Select a shape." });
  if (!draft.material && !draft.customDensity) {
    errors.push({ field: "material-select", message: "Select a material or enable custom density." });
  }
  if (draft.customDensity && (!draft.densityKgM3 || draft.densityKgM3 <= 0)) {
    errors.push({ field: "custom-density", message: "Enter a positive custom density." });
  }
  if (errors.length) return { ok: false, errors };

  return calculatePart({
    shapeId: draft.shapeId,
    dimensions: draft.dimensions,
    unitSystem: draft.unitSystem,
    ...(draft.customDensity
      ? { densityKgM3: draft.densityKgM3 }
      : { materialId: draft.materialId }),
    quantity: draft.quantity,
    tolerancePercent: draft.tolerancePercent,
    wastePercent: draft.wastePercent,
    costPerKg: draft.costPerKg,
  });
}

function assumptionsText(result, shape, material, customDensity) {
  const assumptions = [];
  const shapeValue = result.assumptions || shapeAssumption(shape);
  if (Array.isArray(shapeValue)) assumptions.push(...shapeValue);
  else if (shapeValue) assumptions.push(shapeValue);
  assumptions.push(
    customDensity
      ? "Density is a user-supplied value."
      : `${material?.referenceStatus || "Reference"} density; verify against supplier or measured data for critical work.`,
  );
  return assumptions.join(" ");
}

function renderResult(result, draft) {
  const shape = getShape(draft.shapeId);
  const material = draft.material;
  const totalVolumeM3 = result.totalVolumeM3 ?? result.volumeM3 * draft.quantity;
  const totalMassKg = result.totalMassKg ?? result.massPerPieceKg * draft.quantity;
  const procurementMassKg =
    result.procurementMassKg ?? totalMassKg * (1 + draft.wastePercent / 100);
  const forceN = result.forceN ?? totalMassKg * 9.80665;
  const toleranceMinKg =
    result.toleranceMinKg ?? totalMassKg * (1 - draft.tolerancePercent / 100);
  const toleranceMaxKg =
    result.toleranceMaxKg ?? totalMassKg * (1 + draft.tolerancePercent / 100);
  const estimatedCost = result.estimatedCost ?? procurementMassKg * draft.costPerKg;

  $("#result-part-name").textContent = draft.partName || shape.name;
  $("#result-total-mass").textContent = formatMass(totalMassKg);
  $("#result-per-piece").textContent = formatMass(result.massPerPieceKg);
  $("#result-quantity").textContent = draft.quantity.toLocaleString("en-IN");
  $("#result-volume").textContent = formatVolume(totalVolumeM3);
  $("#result-area").textContent = result.areaM2 ? formatArea(result.areaM2) : "Not applicable";
  $("#result-force").textContent = formatForce(forceN);
  $("#result-range").textContent = draft.tolerancePercent > 0
    ? `${formatMass(toleranceMinKg)} – ${formatMass(toleranceMaxKg)}`
    : "No planning band";
  $("#result-procurement").textContent = formatMass(procurementMassKg);
  $("#result-cost").textContent = draft.costPerKg > 0 ? formatCurrency(estimatedCost) : "Rate not set";
  $("#result-shape").textContent = shape.name;
  $("#result-material").textContent = material?.name || "Custom density";
  $("#result-density").textContent =
    `${draft.densityKgM3.toLocaleString("en-IN", { maximumFractionDigits: 6 })} kg/m³`;
  $("#result-formula").textContent = result.formula || shape.equation || "V × ρ";
  $("#result-substitution").textContent = result.substitution || "Normalized SI values used";
  $("#result-assumptions").textContent = assumptionsText(result, shape, material, draft.customDensity);
  $("#result-state").textContent = draft.customDensity
    ? "Custom density"
    : referenceStatusLabel(material?.referenceStatus);
  $("#result-state").className = "state-badge warning";
  renderShapeDiagram(shape);

  elements.resultEmpty.hidden = true;
  elements.resultDirty.hidden = true;
  elements.resultContent.hidden = false;
  elements.addToBom.disabled = false;

  const normalized = result.normalizedDimensions || {};
  currentResult = {
    ...result,
    totalVolumeM3,
    totalMassKg,
    procurementMassKg,
    forceN,
    toleranceMinKg,
    toleranceMaxKg,
    estimatedCost,
  };
  currentSnapshot = {
    id: createId(),
    partName: draft.partName || shape.name,
    shapeId: shape.id,
    shapeName: shape.name,
    materialId: material?.id || "",
    materialName: material?.name || "Custom density",
    densityKgM3: draft.densityKgM3,
    referenceStatus: draft.customDensity ? "custom" : normalizeReferenceStatus(material?.referenceStatus),
    gradeReference: draft.customDensity ? "User-supplied density" : material?.gradeReference || "",
    unitSystem: draft.unitSystem,
    dimensions: { ...draft.dimensions },
    normalizedDimensions: { ...normalized },
    dimensionSummary: formatDimensionSummary(shape, draft.dimensions, draft.unitSystem),
    quantity: draft.quantity,
    massPerPieceKg: result.massPerPieceKg,
    totalMassKg,
    volumeM3: result.volumeM3,
    areaM2: result.areaM2 || 0,
    forceN,
    tolerancePercent: draft.tolerancePercent,
    wastePercent: draft.wastePercent,
    procurementMassKg,
    costPerKg: draft.costPerKg,
    estimatedCost,
    formula: result.formula || shape.equation || "",
    substitution: result.substitution || "",
    assumptions: assumptionsText(result, shape, material, draft.customDensity),
    createdAt: new Date().toISOString(),
  };
  resultMode = "valid";
}

function handleCalculate(event) {
  event?.preventDefault();
  clearValidation();
  const draft = readCalculatorDraft();
  const result = calculateDraft(draft);
  if (!result.ok) {
    currentResult = null;
    currentSnapshot = null;
    resultMode = "dirty";
    elements.resultContent.hidden = true;
    elements.resultEmpty.hidden = true;
    elements.resultDirty.hidden = false;
    elements.addToBom.disabled = true;
    showValidation(result.errors);
    const firstInvalid = $("[aria-invalid='true']", elements.calculatorForm);
    firstInvalid?.focus();
    return false;
  }
  renderResult(result, draft);
  return true;
}

function resetCalculator() {
  currentResult = null;
  currentSnapshot = null;
  resultMode = "empty";
  materialQuery = "";
  elements.materialSearch.value = "";
  elements.customDensityWrap.hidden = true;
  renderShapeOptions("");
  renderMaterialOptions("");
  renderShapeNote();
  renderDimensionFields();
  renderMaterialEvidence();
  updateUnitHint();
  clearValidation();
  elements.resultContent.hidden = true;
  elements.resultDirty.hidden = true;
  elements.resultEmpty.hidden = false;
  elements.addToBom.disabled = true;
  cancelBomEdit();
}

function addCurrentToBom() {
  if (!currentSnapshot) {
    switchView("calculator", { focus: true });
    showToast("Calculate a valid part before adding it to the BOM.");
    return;
  }
  if (editingLineId) {
    const index = state.bom.findIndex((line) => line.id === editingLineId);
    if (index >= 0) {
      const updated = sanitizeBomLine({ ...currentSnapshot, id: editingLineId });
      state.bom[index] = updated;
      const updatedName = updated.partName;
      cancelBomEdit();
      renderBom();
      scheduleSave();
      showToast(`${updatedName} updated in the BOM.`);
      return;
    }
    cancelBomEdit();
  }
  if (state.bom.length >= 500) {
    showToast("This BOM has reached the 500-line safety limit.");
    return;
  }

  state.bom.push(sanitizeBomLine({ ...currentSnapshot, id: createId() }));
  undoStack = [];
  renderBom();
  scheduleSave();
  showToast(`${currentSnapshot.partName} added to BOM.`);
}

function cancelBomEdit({ announce = false } = {}) {
  editingLineId = null;
  elements.addToBom.textContent = "Add to BOM";
  elements.cancelBomEdit.hidden = true;
  if (announce) showToast("BOM edit cancelled. This calculation can be added as a new line.");
}

async function copyResultSummary() {
  if (!currentSnapshot) return;
  const line = currentSnapshot;
  const summary = [
    `${line.partName} — ${line.shapeName}`,
    `${line.materialName} @ ${line.densityKgM3} kg/m³`,
    `${line.dimensionSummary}`,
    `${formatMass(line.massPerPieceKg)} each × ${line.quantity} = ${formatMass(line.totalMassKg)}`,
    `Procurement: ${formatMass(line.procurementMassKg)}`,
    `Formula: ${line.formula}`,
    "Theoretical estimate; verify critical values against project and supplier documents.",
  ].join("\n");
  try {
    await navigator.clipboard.writeText(summary);
    showToast("Calculation summary copied.");
  } catch {
    showToast("Clipboard access is unavailable in this browser.");
  }
}

function updateBomSummary() {
  const totals = state.bom.reduce((summary, line) => {
    summary.pieces += line.quantity;
    summary.mass += line.massPerPieceKg * line.quantity;
    summary.procurement += line.massPerPieceKg * line.quantity * (1 + line.wastePercent / 100);
    summary.cost += line.massPerPieceKg * line.quantity * (1 + line.wastePercent / 100) * line.costPerKg;
    return summary;
  }, { pieces: 0, mass: 0, procurement: 0, cost: 0 });

  elements.summaryLines.textContent = state.bom.length.toLocaleString("en-IN");
  elements.summaryPieces.textContent = totals.pieces.toLocaleString("en-IN");
  elements.summaryMass.textContent = state.bom.length ? formatMass(totals.mass) : "—";
  elements.summaryProcurement.textContent = state.bom.length ? formatMass(totals.procurement) : "—";
  elements.summaryCost.textContent = totals.cost > 0 ? formatCurrency(totals.cost) : "—";
  elements.navBomCount.textContent = state.bom.length.toLocaleString("en-IN");
}

function bomRowTemplate(line, index) {
  return `
    <tr data-line-id="${escapeHtml(line.id)}">
      <td data-label="Line"><span class="bom-line-number">${index + 1}</span></td>
      <td data-label="Part">
        <label class="visually-hidden" for="bom-name-${escapeHtml(line.id)}">Part name for line ${index + 1}</label>
        <input class="bom-name-input" id="bom-name-${escapeHtml(line.id)}" data-action="name" type="text"
          maxlength="80" value="${escapeHtml(line.partName)}">
      </td>
      <td data-label="Shape & dimensions">
        <span class="bom-primary">${escapeHtml(line.shapeName)}</span>
        <span class="bom-secondary">${escapeHtml(line.dimensionSummary)}</span>
      </td>
      <td data-label="Material">
        <span class="bom-primary">${escapeHtml(line.materialName)}</span>
        <span class="bom-secondary">${escapeHtml(`${line.densityKgM3.toLocaleString("en-IN")} kg/m³ · ${referenceStatusLabel(line.referenceStatus)}`)}</span>
      </td>
      <td data-label="Quantity">
        <label class="visually-hidden" for="bom-qty-${escapeHtml(line.id)}">Quantity for line ${index + 1}</label>
        <input class="bom-qty-input" id="bom-qty-${escapeHtml(line.id)}" data-action="quantity"
          type="number" min="1" max="1000000" step="1" inputmode="numeric" value="${line.quantity}">
      </td>
      <td data-label="Each"><span class="bom-mass">${escapeHtml(formatMass(line.massPerPieceKg))}</span></td>
      <td data-label="Nominal total"><span class="bom-mass">${escapeHtml(formatMass(line.massPerPieceKg * line.quantity))}</span></td>
      <td data-label="Procurement"><span class="bom-mass">${escapeHtml(formatMass(line.massPerPieceKg * line.quantity * (1 + line.wastePercent / 100)))}</span></td>
      <td data-label="Actions">
        <div class="row-actions">
          <button class="row-action" type="button" data-action="load" aria-label="Load ${escapeHtml(line.partName)} into calculator">Load</button>
          <button class="row-action" type="button" data-action="duplicate" aria-label="Duplicate ${escapeHtml(line.partName)}">Copy</button>
          <button class="row-action delete" type="button" data-action="delete" aria-label="Delete ${escapeHtml(line.partName)}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function renderBom() {
  elements.bomBody.innerHTML = state.bom.map(bomRowTemplate).join("");
  elements.bomEmpty.hidden = state.bom.length > 0;
  $(".table-scroll").hidden = state.bom.length === 0;
  updateBomSummary();
}

function updateBomLine(lineId, field, value) {
  const line = state.bom.find((candidate) => candidate.id === lineId);
  if (!line) return;
  if (field === "name") {
    line.partName = String(value || "").slice(0, 80) || "Calculated part";
  }
  if (field === "quantity") {
    const quantity = finiteNumber(value);
    if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) {
      renderBom();
      requestAnimationFrame(() => {
        const quantityInput = $(`#${CSS.escape(`bom-qty-${lineId}`)}`);
        quantityInput?.focus();
        quantityInput?.select();
      });
      showToast("Quantity must be a whole number from 1 to 1,000,000.");
      return;
    }
    line.quantity = quantity;
    line.totalMassKg = line.massPerPieceKg * quantity;
    line.procurementMassKg = line.totalMassKg * (1 + line.wastePercent / 100);
    line.estimatedCost = line.procurementMassKg * line.costPerKg;
  }
  updateBomSummary();
  scheduleSave();
}

function deleteBomLine(lineId) {
  const index = state.bom.findIndex((line) => line.id === lineId);
  if (index < 0) return;
  const [deleted] = state.bom.splice(index, 1);
  if (editingLineId === lineId) cancelBomEdit();
  undoStack.push({ type: "delete", index, line: deleted });
  renderBom();
  scheduleSave();
  const nextLine = state.bom[Math.min(index, state.bom.length - 1)];
  if (nextLine) {
    requestAnimationFrame(() => {
      $(`tr[data-line-id="${CSS.escape(nextLine.id)}"] button[data-action="delete"]`)?.focus();
    });
  } else {
    requestAnimationFrame(() => elements.bomAddCurrent.focus());
  }
  showToast("BOM line removed.", 7_000, {
    label: "Undo",
    onClick: undoLastBomAction,
  });
}

function undoLastBomAction() {
  const action = undoStack.pop();
  if (!action) return;
  if (action.type === "delete") {
    state.bom.splice(Math.min(action.index, state.bom.length), 0, action.line);
    renderBom();
    scheduleSave();
    showToast("BOM line restored.");
  }
}

function duplicateBomLine(lineId) {
  const index = state.bom.findIndex((line) => line.id === lineId);
  if (index < 0 || state.bom.length >= 500) return;
  const original = state.bom[index];
  const copy = sanitizeBomLine({
    ...original,
    id: createId(),
    partName: `${original.partName} copy`.slice(0, 80),
    createdAt: new Date().toISOString(),
  });
  state.bom.splice(index + 1, 0, copy);
  renderBom();
  scheduleSave();
  requestAnimationFrame(() => $(`#${CSS.escape(`bom-name-${copy.id}`)}`)?.focus());
  showToast("BOM line duplicated.");
}

function setUnitSystem(unitSystem, { convert = true } = {}) {
  const previous = state.unitSystem;
  const next = unitSystem === "imperial" ? "imperial" : "metric";
  const shape = getShape(elements.shapeSelect.value);
  const currentValues = getDisplayedDimensions();
  state.unitSystem = next;
  elements.unitInputs.forEach((input) => {
    input.checked = input.value === next;
  });
  updateUnitHint();
  if (previous === next) return;

  if (shape) {
    const converted = Object.fromEntries(shapeFields(shape).map((field) => [
      field.key,
      convert ? convertDraftValue(currentValues[field.key], field, previous, next) : "",
    ]));
    renderDimensionFields(converted);
  }
  markResultDirty();
  scheduleSave();
}

function loadBomLine(lineId) {
  const line = state.bom.find((candidate) => candidate.id === lineId);
  if (!line) return;
  setUnitSystem(line.unitSystem, { convert: false });
  elements.shapeSelect.value = line.shapeId;
  renderShapeNote();
  renderDimensionFields(line.dimensions);

  renderMaterialOptions(line.materialId);
  elements.materialSelect.value = line.materialId;
  const material = getMaterial(line.materialId);
  const custom = line.referenceStatus === "custom" || !material;
  elements.customDensityEnabled.checked = custom;
  elements.customDensityWrap.hidden = !custom;
  elements.customDensity.value = custom ? line.densityKgM3 : "";
  renderMaterialEvidence();

  elements.quantity.value = line.quantity;
  elements.partName.value = line.partName;
  elements.tolerance.value = line.tolerancePercent;
  elements.waste.value = line.wastePercent;
  elements.costPerKg.value = line.costPerKg;
  editingLineId = line.id;
  elements.addToBom.textContent = "Update BOM line";
  elements.cancelBomEdit.hidden = false;
  switchView("calculator", { focus: true });
  handleCalculate();
  elements.calculatorForm.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("BOM line loaded. Recalculate, then select Update BOM line.");
}

function handleBomClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr[data-line-id]");
  if (!row) return;
  const lineId = row.dataset.lineId;
  const action = button.dataset.action;
  if (action === "delete") deleteBomLine(lineId);
  if (action === "duplicate") duplicateBomLine(lineId);
  if (action === "load") loadBomLine(lineId);
}

function handleBomInput(event) {
  const input = event.target.closest("input[data-action]");
  if (!input) return;
  const row = input.closest("tr[data-line-id]");
  if (!row) return;
  updateBomLine(row.dataset.lineId, input.dataset.action, input.value);
  if (input.dataset.action === "name") {
    const line = state.bom.find((candidate) => candidate.id === row.dataset.lineId);
    if (line) input.value = line.partName;
  }
}

function handleBomDraftInput(event) {
  const input = event.target.closest("input[data-action]");
  if (!input) return;
  const row = input.closest("tr[data-line-id]");
  if (!row) return;
  const line = state.bom.find((candidate) => candidate.id === row.dataset.lineId);
  if (!line) return;

  if (input.dataset.action === "name") {
    line.partName = String(input.value || "").slice(0, 80) || "Calculated part";
    scheduleSave();
    return;
  }

  if (input.dataset.action === "quantity") {
    const quantity = finiteNumber(input.value);
    if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > 1_000_000) return;
    line.quantity = quantity;
    line.totalMassKg = line.massPerPieceKg * quantity;
    line.procurementMassKg = line.totalMassKg * (1 + line.wastePercent / 100);
    line.estimatedCost = line.procurementMassKg * line.costPerKg;
    const nominal = $('[data-label="Nominal total"] .bom-mass', row);
    const procurement = $('[data-label="Procurement"] .bom-mass', row);
    if (nominal) nominal.textContent = formatMass(line.totalMassKg);
    if (procurement) procurement.textContent = formatMass(line.procurementMassKg);
    updateBomSummary();
    scheduleSave();
  }
}

function syncProjectInputsFromState() {
  elements.projectInputs.forEach((input) => {
    input.value = state.project[projectFieldMap[input.id]] || "";
  });
}

function handleProjectInput(event) {
  const key = projectFieldMap[event.target.id];
  if (!key) return;
  state.project[key] = event.target.value.slice(0, event.target.maxLength || 100);
  scheduleSave();
}

function recalculateImportedLine(line, index) {
  if (!line || typeof line !== "object") {
    throw new Error(`Line ${index + 1} is not a valid BOM record.`);
  }
  const shape = getShape(String(line.shapeId || ""));
  if (!shape) throw new Error(`Line ${index + 1} uses an unknown shape.`);

  const material = getMaterial(String(line.materialId || ""));
  const customDensity =
    normalizeReferenceStatus(line.referenceStatus) === "custom" || !material;
  const densityKgM3 = customDensity
    ? finiteNumber(line.densityKgM3)
    : material.densityKgM3;
  const quantity = finiteNumber(line.quantity);
  const tolerancePercent = finiteNumber(line.tolerancePercent, 0);
  const wastePercent = finiteNumber(line.wastePercent, 0);
  const costPerKg = finiteNumber(line.costPerKg, 0);
  const unitSystem = line.unitSystem === "imperial" ? "imperial" : "metric";
  const dimensions = line.dimensions && typeof line.dimensions === "object" ? line.dimensions : {};

  const result = calculatePart({
    shapeId: shape.id,
    dimensions,
    unitSystem,
    ...(customDensity ? { densityKgM3 } : { materialId: material.id }),
    quantity,
    tolerancePercent,
    wastePercent,
    costPerKg,
  });
  if (!result.ok) throw new Error(`Line ${index + 1} cannot be recalculated from its saved inputs.`);

  const suppliedMass = finiteNumber(line.massPerPieceKg);
  const relativeDifference = suppliedMass === null
    ? Infinity
    : Math.abs(suppliedMass - result.massPerPieceKg) / Math.max(result.massPerPieceKg, 1e-12);
  if (relativeDifference > 1e-7) {
    throw new Error(`Line ${index + 1} does not match a fresh calculation. Import was not applied.`);
  }

  const totalMassKg = result.totalMassKg ?? result.massPerPieceKg * quantity;
  const procurementMassKg =
    result.procurementMassKg ?? totalMassKg * (1 + wastePercent / 100);
  const assumptionValue = Array.isArray(result.assumptions)
    ? result.assumptions.join(" ")
    : result.assumptions || shapeAssumption(shape);

  return sanitizeBomLine({
    ...line,
    id: createId(),
    partName: String(line.partName || shape.name),
    shapeId: shape.id,
    shapeName: shape.name,
    materialId: material?.id || "",
    materialName: material?.name || String(line.materialName || "Custom density"),
    densityKgM3,
    referenceStatus: customDensity ? "custom" : material.referenceStatus,
    gradeReference: customDensity ? "User-supplied density" : material.gradeReference,
    unitSystem,
    dimensions: { ...dimensions },
    normalizedDimensions: { ...(result.normalizedDimensions || {}) },
    dimensionSummary: formatDimensionSummary(shape, dimensions, unitSystem),
    quantity,
    massPerPieceKg: result.massPerPieceKg,
    totalMassKg,
    volumeM3: result.volumeM3,
    areaM2: result.areaM2 || 0,
    forceN: result.forceN ?? totalMassKg * 9.80665,
    tolerancePercent,
    wastePercent,
    procurementMassKg,
    costPerKg,
    estimatedCost: result.estimatedCost ?? procurementMassKg * costPerKg,
    formula: result.formula || shape.equation || "",
    substitution: result.substitution || "",
    assumptions: assumptionValue,
  });
}

function importProject(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("This is not a PS3D Hub project file.");
  }
  if (candidate.version !== STATE_VERSION || !Array.isArray(candidate.bom)) {
    throw new Error(`Unsupported project format. Expected version ${STATE_VERSION} with a BOM array.`);
  }
  if (candidate.bom.length > 500) {
    throw new Error("Import rejected: a project can contain at most 500 BOM lines.");
  }

  const normalized = normalizeStoredState(candidate);
  const validLines = candidate.bom.map(recalculateImportedLine);
  if (validLines.some((line) => !line)) {
    throw new Error("At least one BOM line failed validation. Import was not applied.");
  }
  const hasExistingWork =
    state.bom.length > 0 ||
    Object.entries(state.project).some(
      ([key, value]) => key !== "updatedAt" && String(value || "").trim(),
    );
  if (hasExistingWork) {
    const confirmed = window.confirm(
      `Replace the current ${state.bom.length}-line BOM with this ${validLines.length}-line project?`,
    );
    if (!confirmed) {
      showToast("Import cancelled; the current BOM was not changed.");
      return { applied: false };
    }
  }

  state = {
    ...normalized,
    bom: validLines,
  };
  cancelBomEdit();
  applyTheme(state.theme, false);
  setUnitSystem(state.unitSystem, { convert: false });
  syncProjectInputsFromState();
  renderBom();
  switchView("bom", { persist: false });
  scheduleSave();
  return { applied: true };
}

async function handleImportFile(file) {
  if (!file) return;
  if (file.size > 5_000_000) {
    showToast("Import rejected: the JSON file is larger than 5 MB.");
    return;
  }
  try {
    const text = await file.text();
    const outcome = importProject(JSON.parse(text));
    if (outcome?.applied) showToast(`Imported ${state.bom.length} valid BOM lines.`);
  } catch (error) {
    showToast(`Import failed: ${error instanceof Error ? error.message : "invalid JSON"}`, 5_000);
  } finally {
    elements.bomImportFile.value = "";
  }
}

function exportCsv() {
  if (!state.bom.length) {
    showToast("Add at least one calculated part before exporting.");
    return;
  }
  const filename = `${safeFilename(state.project.name)}-bom.csv`;
  downloadText(filename, `\uFEFF${createBomCsv(state)}`, "text/csv;charset=utf-8");
  showToast("CSV export created.");
}

function exportJson() {
  const filename = `${safeFilename(state.project.name)}-bom.json`;
  downloadText(filename, createProjectJson(state), "application/json;charset=utf-8");
  showToast("JSON backup created.");
}

function newBom() {
  if (state.bom.length || Object.values(state.project).some((value) => value && value !== state.project.updatedAt)) {
    const confirmed = window.confirm("Start a new BOM? Download JSON first if you need a portable backup.");
    if (!confirmed) return;
  }
  const fresh = createDefaultProject();
  state.project = fresh.project;
  state.bom = [];
  undoStack = [];
  cancelBomEdit();
  syncProjectInputsFromState();
  renderBom();
  clearState();
  scheduleSave();
  showToast("New BOM started.");
}

function renderSources() {
  const sources = Array.isArray(PRIMARY_SOURCES)
    ? PRIMARY_SOURCES
    : Object.values(PRIMARY_SOURCES || {});
  elements.sourceList.innerHTML = sources.map((source) => `
    <div class="source-item">
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a>
      <span>${escapeHtml(source.organization || source.scope || source.role || "Authoritative technical reference")}</span>
    </div>
  `).join("");
}

async function loadContact() {
  try {
    const response = await fetch("/api/contact", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const contact = await response.json();
    const visible = [contact.brand, contact.phone, contact.email, contact.location]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
    if (visible.length) elements.footerContact.textContent = visible.join(" · ");
  } catch {
    // The footer already contains a useful offline-safe fallback.
  }
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
    tab.addEventListener("keydown", handleTabKeydown);
  });

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });

  elements.unitInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) setUnitSystem(input.value);
    });
  });

  elements.shapeSelect.addEventListener("change", () => {
    renderShapeNote();
    renderDimensionFields();
    markResultDirty();
  });

  elements.materialSearch.addEventListener("input", () => {
    materialQuery = elements.materialSearch.value;
    renderMaterialOptions();
  });

  elements.materialSelect.addEventListener("change", () => {
    renderMaterialEvidence();
    markResultDirty();
  });

  elements.customDensityEnabled.addEventListener("change", () => {
    elements.customDensityWrap.hidden = !elements.customDensityEnabled.checked;
    if (elements.customDensityEnabled.checked && !elements.customDensity.value) {
      const material = getMaterial(elements.materialSelect.value);
      elements.customDensity.value = material?.densityKgM3 || "";
    }
    markResultDirty();
  });

  elements.customDensity.addEventListener("input", markResultDirty);
  elements.quantity.addEventListener("input", markResultDirty);
  elements.partName.addEventListener("input", markResultDirty);
  elements.tolerance.addEventListener("input", markResultDirty);
  elements.waste.addEventListener("input", markResultDirty);
  elements.costPerKg.addEventListener("input", markResultDirty);
  elements.dimensionFields.addEventListener("input", markResultDirty);

  elements.calculatorForm.addEventListener("submit", handleCalculate);
  elements.calculatorForm.addEventListener("reset", () => {
    requestAnimationFrame(resetCalculator);
  });
  elements.addToBom.addEventListener("click", addCurrentToBom);
  elements.copyResult.addEventListener("click", copyResultSummary);
  elements.cancelBomEdit.addEventListener("click", () => cancelBomEdit({ announce: true }));
  elements.bomAddCurrent.addEventListener("click", addCurrentToBom);

  elements.projectInputs.forEach((input) => input.addEventListener("input", handleProjectInput));
  elements.bomBody.addEventListener("click", handleBomClick);
  elements.bomBody.addEventListener("input", handleBomDraftInput);
  elements.bomBody.addEventListener("change", handleBomInput);
  elements.bomImport.addEventListener("click", () => elements.bomImportFile.click());
  elements.bomImportFile.addEventListener("change", () => handleImportFile(elements.bomImportFile.files?.[0]));
  elements.bomExportCsv.addEventListener("click", exportCsv);
  elements.bomExportJson.addEventListener("click", exportJson);
  elements.bomPrint.addEventListener("click", () => {
    if (!state.bom.length) {
      showToast("Add at least one calculated part before printing.");
      return;
    }
    switchView("bom");
    window.print();
  });
  elements.newBom.addEventListener("click", newBom);

  $$("[data-go-calculator]").forEach((button) => {
    button.addEventListener("click", () => switchView("calculator", { focus: true }));
  });

  elements.brand.addEventListener("click", (event) => {
    event.preventDefault();
    switchView("calculator", { focus: true });
  });
  window.addEventListener("hashchange", () => {
    const requestedView = location.hash.replace("#", "");
    if (["calculator", "bom", "method"].includes(requestedView)) {
      switchView(requestedView, { focus: true });
    }
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      const activeTag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA"].includes(activeTag)) return;
      event.preventDefault();
      undoLastBomAction();
    }
  });
  window.addEventListener("pagehide", () => flushSave({ announce: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSave({ announce: false });
  });
}

function initialize() {
  elements.shapeCount.textContent = SHAPES.length.toLocaleString("en-IN");
  elements.materialCount.textContent = MATERIALS.length.toLocaleString("en-IN");
  renderShapeOptions();
  renderMaterialOptions();
  updateUnitHint();
  renderDimensionFields();
  renderShapeNote();
  renderMaterialEvidence();
  renderSources();
  syncProjectInputsFromState();
  renderBom();
  applyTheme(state.theme, false);
  elements.unitInputs.forEach((input) => {
    input.checked = input.value === state.unitSystem;
  });
  switchView(location.hash.replace("#", "") || state.activeView, { persist: false });
  elements.addToBom.disabled = true;
  bindEvents();
  loadContact();

  if (loaded.status === "unavailable") {
    showToast("Browser storage is unavailable. Use Download JSON to keep a backup.", 6_000);
    elements.saveStatus.textContent = "Local save unavailable";
  } else if (loaded.status === "loaded" && state.bom.length) {
    showToast(`Recovered ${state.bom.length} saved BOM line${state.bom.length === 1 ? "" : "s"}.`);
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js?v=2.0.1").catch(() => {});
  }
}

initialize();
