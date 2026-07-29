import { getMaterial } from "./materials.js";
import {
  calculateShapeGeometry,
  getShape,
} from "./shapes.js";
import { calculateSectionProperties } from "./section-properties.js";
import { calculateEngineeringScreening } from "./engineering.js";

export const STANDARD_GRAVITY_MPS2 = 9.80665;

export const UNIT_SYSTEMS = Object.freeze({
  metric: Object.freeze({
    cross: Object.freeze({ unit: "mm", toMetres: 0.001 }),
    length: Object.freeze({ unit: "m", toMetres: 1 }),
  }),
  imperial: Object.freeze({
    cross: Object.freeze({ unit: "in", toMetres: 0.0254 }),
    length: Object.freeze({ unit: "ft", toMetres: 0.3048 }),
  }),
});

const blankResult = (errors, inputFingerprint = null) => ({
  ok: false,
  errors,
  normalizedDimensions: null,
  volumeM3: null,
  areaM2: null,
  massPerPieceKg: null,
  totalMassKg: null,
  procurementMassKg: null,
  forceN: null,
  toleranceMinKg: null,
  toleranceMaxKg: null,
  estimatedCost: null,
  formula: null,
  substitution: null,
  assumptions: [],
  sectionProperties: null,
  engineering: null,
  inputFingerprint,
});

const error = (field, code, message, value) => ({
  field,
  fields: [field],
  code,
  message,
  value,
});

const strictNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    typeof value === "boolean"
  ) {
    return { ok: false, value: Number.NaN };
  }
  if (typeof value === "string" && value.trim() === "") {
    return { ok: false, value: Number.NaN };
  }
  const number = typeof value === "number" ? value : Number(value);
  return { ok: Number.isFinite(number), value: number };
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    return Object.is(value, -0) ? 0 : value;
  }
  return value;
};

/**
 * A deterministic fingerprint for guarding rendered results against stale input.
 * UI code should discard a result when isCalculationCurrent() returns false.
 */
export function calculationFingerprint(input = {}) {
  const relevant = {
    shapeId: input.shapeId ?? null,
    materialId: input.materialId ?? null,
    densityKgM3: input.densityKgM3 ?? null,
    dimensions: input.dimensions ?? {},
    unitSystem: input.unitSystem ?? "metric",
    quantity: input.quantity ?? 1,
    gravityMps2: input.gravityMps2 ?? STANDARD_GRAVITY_MPS2,
    planningTolerancePercent:
      input.planningTolerancePercent ?? input.tolerancePercent ?? 0,
    wastePercent: input.wastePercent ?? 0,
    costPerKg: input.costPerKg ?? input.unitCostPerKg ?? null,
    currency: input.currency ?? "INR",
    engineering: input.engineering ?? {},
  };
  return JSON.stringify(canonicalize(relevant));
}

export function isCalculationCurrent(result, input) {
  return Boolean(
    result?.ok &&
      typeof result.inputFingerprint === "string" &&
      result.inputFingerprint === calculationFingerprint(input),
  );
}

export function dimensionUnit(dimensionKind, unitSystem = "metric") {
  return UNIT_SYSTEMS[unitSystem]?.[dimensionKind]?.unit ?? null;
}

export function toDisplayValue(
  valueMetres,
  dimensionKind,
  unitSystem = "metric",
) {
  const definition = UNIT_SYSTEMS[unitSystem]?.[dimensionKind];
  if (!definition || !Number.isFinite(valueMetres)) return null;
  return valueMetres / definition.toMetres;
}

/**
 * Convert a shape's input dimensions to canonical metres.
 * Metric: cross dimensions in mm, length dimensions in m.
 * Imperial: cross dimensions in inches, length dimensions in feet.
 */
export function normalizeDimensions(
  shapeOrId,
  dimensions = {},
  unitSystem = "metric",
) {
  const selectedShape =
    typeof shapeOrId === "string" ? getShape(shapeOrId) : shapeOrId;
  if (!selectedShape) {
    return {
      ok: false,
      errors: [
        error("shapeId", "UNKNOWN_SHAPE", "Select a supported shape.", shapeOrId),
      ],
      normalizedDimensions: null,
    };
  }
  const system = UNIT_SYSTEMS[unitSystem];
  if (!system) {
    return {
      ok: false,
      errors: [
        error(
          "unitSystem",
          "UNKNOWN_UNIT_SYSTEM",
          "Unit system must be metric or imperial.",
          unitSystem,
        ),
      ],
      normalizedDimensions: null,
    };
  }

  const normalizedDimensions = {};
  const errors = [];
  for (const definition of selectedShape.dimensions) {
    const parsed = strictNumber(dimensions?.[definition.key]);
    if (!parsed.ok) {
      errors.push(
        error(
          definition.key,
          "NOT_FINITE",
          `${definition.label} must be a finite number in ${system[definition.kind].unit}.`,
          dimensions?.[definition.key],
        ),
      );
      continue;
    }
    if (parsed.value <= 0) {
      errors.push(
        error(
          definition.key,
          "NOT_POSITIVE",
          `${definition.label} must be greater than zero.`,
          dimensions?.[definition.key],
        ),
      );
      continue;
    }
    const valueM = parsed.value * system[definition.kind].toMetres;
    if (!Number.isFinite(valueM) || valueM <= 0) {
      errors.push(
        error(
          definition.key,
          "CONVERSION_OVERFLOW",
          `${definition.label} is outside the supported numeric range.`,
          dimensions?.[definition.key],
        ),
      );
      continue;
    }
    normalizedDimensions[definition.key] = valueM;
  }

  return {
    ok: errors.length === 0,
    errors,
    normalizedDimensions: errors.length ? null : normalizedDimensions,
  };
}

const parseQuantity = (rawQuantity) => {
  const parsed = strictNumber(rawQuantity);
  if (!parsed.ok) {
    return {
      value: null,
      errors: [
        error(
          "quantity",
          "INVALID_QUANTITY",
          "Quantity must be a positive whole number.",
          rawQuantity,
        ),
      ],
    };
  }
  if (
    !Number.isSafeInteger(parsed.value)
    || parsed.value < 1
    || parsed.value > 1_000_000
  ) {
    return {
      value: null,
      errors: [
        error(
          "quantity",
          "INVALID_QUANTITY",
          "Quantity must be a whole number from 1 to 1,000,000.",
          rawQuantity,
        ),
      ],
    };
  }
  return { value: parsed.value, errors: [] };
};

const parsePercentage = (field, rawValue, maximum = 1000) => {
  const parsed = strictNumber(rawValue);
  if (!parsed.ok || parsed.value < 0 || parsed.value > maximum) {
    return {
      value: null,
      errors: [
        error(
          field,
          "INVALID_PERCENTAGE",
          `${field} must be between 0 and ${maximum}.`,
          rawValue,
        ),
      ],
    };
  }
  return { value: parsed.value, errors: [] };
};

const parseTolerance = (rawTolerance) => {
  if (
    rawTolerance &&
    typeof rawTolerance === "object" &&
    !Array.isArray(rawTolerance)
  ) {
    const minus = parsePercentage(
      "planningTolerancePercent.minus",
      rawTolerance.minus ?? 0,
      50,
    );
    const plus = parsePercentage(
      "planningTolerancePercent.plus",
      rawTolerance.plus ?? 0,
      50,
    );
    return {
      minus: minus.value,
      plus: plus.value,
      errors: [...minus.errors, ...plus.errors],
    };
  }
  const symmetric = parsePercentage(
    "planningTolerancePercent",
    rawTolerance ?? 0,
    50,
  );
  return {
    minus: symmetric.value,
    plus: symmetric.value,
    errors: symmetric.errors,
  };
};

const parseOptionalCost = (rawCost) => {
  if (rawCost === undefined || rawCost === null || rawCost === "") {
    return { value: null, errors: [] };
  }
  const parsed = strictNumber(rawCost);
  if (!parsed.ok || parsed.value < 0 || parsed.value > 10_000_000) {
    return {
      value: null,
      errors: [
        error(
          "costPerKg",
          "INVALID_COST",
          "Cost per kilogram must be between 0 and 10,000,000.",
          rawCost,
        ),
      ],
    };
  }
  return { value: parsed.value, errors: [] };
};

/**
 * Calculate theoretical part mass and planning values without touching UI state.
 *
 * Input:
 * {
 *   shapeId, materialId, dimensions, unitSystem: "metric"|"imperial",
 *   quantity=1, densityKgM3?, gravityMps2=9.80665,
 *   planningTolerancePercent=0 | {minus, plus},
 *   wastePercent=0, costPerKg?, currency="INR", engineering?
 * }
 */
export function calculatePart(input = {}) {
  const inputFingerprint = calculationFingerprint(input);
  const errors = [];
  const selectedShape = getShape(input.shapeId);
  if (!selectedShape) {
    errors.push(
      error(
        "shapeId",
        "UNKNOWN_SHAPE",
        "Select a supported shape.",
        input.shapeId,
      ),
    );
  }

  const selectedMaterial = input.materialId
    ? getMaterial(input.materialId)
    : null;
  const densityOverride = strictNumber(input.densityKgM3);
  let densityKgM3;
  if (input.densityKgM3 !== undefined && input.densityKgM3 !== null) {
    if (!densityOverride.ok || densityOverride.value <= 0) {
      errors.push(
        error(
          "densityKgM3",
          "INVALID_DENSITY",
          "Density must be a finite positive value in kg/m³.",
          input.densityKgM3,
        ),
      );
    } else {
      densityKgM3 = densityOverride.value;
    }
  } else if (!selectedMaterial) {
    errors.push(
      error(
        "materialId",
        "UNKNOWN_MATERIAL",
        "Select a supported material or provide a positive custom density.",
        input.materialId,
      ),
    );
  } else {
    densityKgM3 = selectedMaterial.densityKgM3;
  }

  const quantityResult = parseQuantity(input.quantity ?? 1);
  errors.push(...quantityResult.errors);

  const toleranceResult = parseTolerance(
    input.planningTolerancePercent ?? input.tolerancePercent ?? 0,
  );
  errors.push(...toleranceResult.errors);

  const wasteResult = parsePercentage(
    "wastePercent",
    input.wastePercent ?? 0,
    500,
  );
  errors.push(...wasteResult.errors);

  const costResult = parseOptionalCost(
    input.costPerKg ?? input.unitCostPerKg ?? null,
  );
  errors.push(...costResult.errors);

  const gravityResult = strictNumber(
    input.gravityMps2 ?? STANDARD_GRAVITY_MPS2,
  );
  if (!gravityResult.ok || gravityResult.value <= 0) {
    errors.push(
      error(
        "gravityMps2",
        "INVALID_GRAVITY",
        "Gravitational acceleration must be a finite positive value in m/s².",
        input.gravityMps2,
      ),
    );
  }

  let normalized = null;
  if (selectedShape) {
    normalized = normalizeDimensions(
      selectedShape,
      input.dimensions ?? {},
      input.unitSystem ?? "metric",
    );
    errors.push(...normalized.errors);
  }

  if (errors.length) return blankResult(errors, inputFingerprint);

  const geometry = calculateShapeGeometry(
    selectedShape,
    normalized.normalizedDimensions,
  );
  if (!geometry.ok) {
    return blankResult(geometry.errors, inputFingerprint);
  }

  const sectionProperties = calculateSectionProperties(
    selectedShape.id,
    normalized.normalizedDimensions,
  );
  if (sectionProperties.available && geometry.areaM2 !== null) {
    const relativeAreaDifference =
      Math.abs(sectionProperties.areaM2 - geometry.areaM2)
      / Math.max(geometry.areaM2, 1e-18);
    if (relativeAreaDifference > 1e-10) {
      return blankResult(
        [
          error(
            "dimensions",
            "SECTION_AREA_MISMATCH",
            "The mass and section-property models disagree on gross area.",
          ),
        ],
        inputFingerprint,
      );
    }
  }

  const engineering = calculateEngineeringScreening({
    section: sectionProperties,
    densityKgM3,
    costPerKg: costResult.value,
    input: input.engineering ?? {},
  });
  if (!engineering.ok) {
    return blankResult(engineering.errors, inputFingerprint);
  }

  const massPerPieceKg = geometry.volumeM3 * densityKgM3;
  const totalMassKg = massPerPieceKg * quantityResult.value;
  const toleranceMinKg =
    totalMassKg * (1 - toleranceResult.minus / 100);
  const toleranceMaxKg =
    totalMassKg * (1 + toleranceResult.plus / 100);
  const procurementFactor = 1 + wasteResult.value / 100;
  const procurementMassKg = totalMassKg * procurementFactor;
  const procurementToleranceMinKg = toleranceMinKg * procurementFactor;
  const procurementToleranceMaxKg = toleranceMaxKg * procurementFactor;
  const forceN = totalMassKg * gravityResult.value;
  const estimatedCost =
    costResult.value === null ? null : procurementMassKg * costResult.value;

  const calculatedNumbers = [
    massPerPieceKg,
    totalMassKg,
    toleranceMinKg,
    toleranceMaxKg,
    procurementMassKg,
    procurementToleranceMinKg,
    procurementToleranceMaxKg,
    forceN,
    estimatedCost,
  ].filter((value) => value !== null);
  if (calculatedNumbers.some((value) => !Number.isFinite(value) || value < 0)) {
    return blankResult(
      [
        error(
          "calculation",
          "NUMERIC_OVERFLOW",
          "The result is outside the supported numeric range.",
        ),
      ],
      inputFingerprint,
    );
  }

  const assumptions = [
    ...geometry.assumptions,
    selectedMaterial
      ? selectedMaterial.note
      : "A user-supplied density was used.",
    "Mass is theoretical volume × density; it is not a certified or measured weight.",
    "Force uses the selected gravitational acceleration.",
    toleranceResult.minus || toleranceResult.plus
      ? "Planning tolerance is an input allowance, not a dimensional-standard certification."
      : null,
    wasteResult.value
      ? "Procurement mass includes the entered planning waste allowance."
      : null,
    sectionProperties.available
      ? "Section properties use ideal gross geometry and are screening values, not designation-specific certified properties."
      : null,
  ].filter(Boolean);

  return {
    ok: true,
    errors: [],
    shape: selectedShape,
    material: selectedMaterial,
    densityKgM3,
    densitySource:
      input.densityKgM3 !== undefined && input.densityKgM3 !== null
        ? "user"
        : "material-reference",
    normalizedDimensions: geometry.normalizedDimensions,
    volumeM3: geometry.volumeM3,
    areaM2:
      geometry.areaM2
      ?? (sectionProperties.available ? sectionProperties.areaM2 : null),
    quantity: quantityResult.value,
    massPerPieceKg,
    totalMassKg,
    theoreticalMassKg: totalMassKg,
    wastePercent: wasteResult.value,
    procurementMassKg,
    forceN,
    gravityMps2: gravityResult.value,
    tolerancePercent: Object.freeze({
      minus: toleranceResult.minus,
      plus: toleranceResult.plus,
    }),
    toleranceMinKg,
    toleranceMaxKg,
    procurementToleranceMinKg,
    procurementToleranceMaxKg,
    estimatedCost,
    cost:
      estimatedCost === null
        ? null
        : {
            ratePerKg: costResult.value,
            currency: input.currency ?? "INR",
            amount: estimatedCost,
          },
    formula: geometry.formula,
    substitution: `${geometry.substitution}; m₁=V×ρ=${massPerPieceKg} kg; mₜ=m₁×${quantityResult.value}=${totalMassKg} kg`,
    assumptions,
    sectionProperties,
    engineering,
    inputFingerprint,
  };
}

/**
 * Aggregate only a complete set of successful calculations.
 * This deliberately refuses to emit a partial BOM total.
 */
export function summarizeParts(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      ok: false,
      complete: false,
      errors: [
        error(
          "parts",
          "EMPTY_BOM",
          "At least one calculated part is required.",
          results,
        ),
      ],
      totalMassKg: null,
      procurementMassKg: null,
      estimatedCost: null,
    };
  }
  const pendingIndexes = results
    .map((result, index) => (result?.ok ? null : index))
    .filter((index) => index !== null);
  if (pendingIndexes.length) {
    return {
      ok: false,
      complete: false,
      errors: [
        {
          field: "parts",
          fields: pendingIndexes.map((index) => `parts.${index}`),
          code: "INCOMPLETE_BOM",
          message:
            "BOM total is unavailable until every row has a valid calculation.",
          value: pendingIndexes,
        },
      ],
      totalMassKg: null,
      procurementMassKg: null,
      estimatedCost: null,
    };
  }
  const totals = results.reduce(
    (accumulator, result) => ({
      totalMassKg: accumulator.totalMassKg + result.totalMassKg,
      procurementMassKg:
        accumulator.procurementMassKg + result.procurementMassKg,
      estimatedCost:
        accumulator.estimatedCost === null || result.estimatedCost === null
          ? null
          : accumulator.estimatedCost + result.estimatedCost,
    }),
    {
      totalMassKg: 0,
      procurementMassKg: 0,
      estimatedCost: results.every((result) => result.estimatedCost !== null)
        ? 0
        : null,
    },
  );
  if (
    !Number.isFinite(totals.totalMassKg) ||
    !Number.isFinite(totals.procurementMassKg) ||
    (totals.estimatedCost !== null &&
      !Number.isFinite(totals.estimatedCost))
  ) {
    return {
      ok: false,
      complete: false,
      errors: [
        error(
          "parts",
          "NUMERIC_OVERFLOW",
          "BOM total is outside the supported numeric range.",
        ),
      ],
      totalMassKg: null,
      procurementMassKg: null,
      estimatedCost: null,
    };
  }
  return {
    ok: true,
    complete: true,
    errors: [],
    lineCount: results.length,
    ...totals,
  };
}

const finiteOrDash = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const compactNumber = (value, locale = "en-IN", significantDigits = 6) => {
  if (value === 0) return "0";
  const absolute = Math.abs(value);
  if (absolute > 0 && absolute < 1e-6) {
    return value.toExponential(Math.max(1, significantDigits - 1));
  }
  return new Intl.NumberFormat(locale, {
    maximumSignificantDigits: significantDigits,
    maximumFractionDigits: 9,
  }).format(value);
};

export function formatMass(
  massKg,
  { locale = "en-IN", significantDigits = 6 } = {},
) {
  const value = finiteOrDash(massKg);
  if (value === null) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1000) {
    return `${compactNumber(value / 1000, locale, significantDigits)} t`;
  }
  if (absolute >= 1) {
    return `${compactNumber(value, locale, significantDigits)} kg`;
  }
  if (absolute >= 0.001) {
    return `${compactNumber(value * 1000, locale, significantDigits)} g`;
  }
  if (absolute >= 0.000001) {
    return `${compactNumber(value * 1e6, locale, significantDigits)} mg`;
  }
  return `${compactNumber(value * 1e9, locale, significantDigits)} µg`;
}

export function formatVolume(
  volumeM3,
  { locale = "en-IN", significantDigits = 6 } = {},
) {
  const value = finiteOrDash(volumeM3);
  if (value === null) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1) {
    return `${compactNumber(value, locale, significantDigits)} m³`;
  }
  if (absolute >= 0.001) {
    return `${compactNumber(value * 1000, locale, significantDigits)} L`;
  }
  if (absolute >= 0.000001) {
    return `${compactNumber(value * 1e6, locale, significantDigits)} cm³`;
  }
  return `${compactNumber(value * 1e9, locale, significantDigits)} mm³`;
}

export function formatArea(
  areaM2,
  { locale = "en-IN", significantDigits = 6 } = {},
) {
  const value = finiteOrDash(areaM2);
  if (value === null) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1) {
    return `${compactNumber(value, locale, significantDigits)} m²`;
  }
  if (absolute >= 0.0001) {
    return `${compactNumber(value * 1e4, locale, significantDigits)} cm²`;
  }
  return `${compactNumber(value * 1e6, locale, significantDigits)} mm²`;
}

export function formatForce(
  forceN,
  { locale = "en-IN", significantDigits = 6 } = {},
) {
  const value = finiteOrDash(forceN);
  if (value === null) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1e6) {
    return `${compactNumber(value / 1e6, locale, significantDigits)} MN`;
  }
  if (absolute >= 1000) {
    return `${compactNumber(value / 1000, locale, significantDigits)} kN`;
  }
  if (absolute >= 1) {
    return `${compactNumber(value, locale, significantDigits)} N`;
  }
  return `${compactNumber(value * 1000, locale, significantDigits)} mN`;
}

export function formatCurrency(
  amount,
  currency = "INR",
  locale = "en-IN",
) {
  const value = finiteOrDash(amount);
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${compactNumber(value, locale, 8)}`;
  }
}
