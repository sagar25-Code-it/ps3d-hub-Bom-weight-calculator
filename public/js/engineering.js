/**
 * Optional high-level engineering screening.
 *
 * Mechanical values are user/supplier inputs. They are never inferred from
 * density or a material name. Results are gross-section elastic screens, not
 * code design strengths or declarations that a member is safe.
 */

export const ENGINEERING_MODEL_VERSION = "1.0.0";

export const DEFLECTION_CASES = Object.freeze([
  "",
  "simply-supported-point",
  "simply-supported-udl",
  "cantilever-point",
  "cantilever-udl",
]);

export const HARDNESS_SCALES = Object.freeze([
  "",
  "HBW",
  "HV",
  "HRC",
  "HRB",
  "Shore A",
  "Shore D",
  "Other",
]);

export const ENVIRONMENTS = Object.freeze([
  "",
  "indoor-dry",
  "outdoor",
  "wet-marine",
  "chemical",
  "elevated-temperature",
  "low-temperature",
  "other",
]);

export const CORROSION_ASSESSMENTS = Object.freeze([
  "",
  "favourable",
  "conditional",
  "unfavourable",
  "not-assessed",
]);

export const FABRICATION_ASSESSMENTS = Object.freeze([
  "",
  "straightforward",
  "process-dependent",
  "specialist",
  "not-assessed",
]);

export const AVAILABILITY_ASSESSMENTS = Object.freeze([
  "",
  "in-stock",
  "limited",
  "made-to-order",
  "supplier-quoted",
  "discontinued",
  "not-assessed",
]);

const error = (field, code, message, value) => ({
  field,
  fields: [field],
  code,
  message,
  value,
});

function optionalNumber(
  rawValue,
  { field, label, minimum = null, maximum = null, exclusiveMinimum = false },
) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return { value: null, errors: [] };
  }
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
  const belowMinimum = minimum !== null
    && (exclusiveMinimum ? value <= minimum : value < minimum);
  if (
    !Number.isFinite(value)
    || belowMinimum
    || (maximum !== null && value > maximum)
  ) {
    const range = [
      minimum !== null ? `${exclusiveMinimum ? "greater than" : "at least"} ${minimum}` : null,
      maximum !== null ? `no more than ${maximum}` : null,
    ].filter(Boolean).join(" and ");
    return {
      value: null,
      errors: [
        error(
          field,
          "INVALID_ENGINEERING_VALUE",
          `${label} must be a finite number${range ? ` ${range}` : ""}.`,
          rawValue,
        ),
      ],
    };
  }
  return { value, errors: [] };
}

function enumValue(rawValue, allowed, field, label) {
  const value = String(rawValue || "");
  if (allowed.includes(value)) return { value, errors: [] };
  return {
    value: "",
    errors: [
      error(field, "INVALID_ENGINEERING_OPTION", `Select a supported ${label}.`, rawValue),
    ],
  };
}

const cleanText = (value, maximumLength) =>
  String(value || "").trim().slice(0, maximumLength);

export function normalizeEngineeringInput(candidate = {}) {
  const materialCandidate =
    candidate.material && typeof candidate.material === "object"
      ? candidate.material
      : {};
  const loadCandidate =
    candidate.loads && typeof candidate.loads === "object"
      ? candidate.loads
      : {};
  const practicalCandidate =
    candidate.practical && typeof candidate.practical === "object"
      ? candidate.practical
      : {};

  const yieldStrength = optionalNumber(materialCandidate.yieldStrengthMpa, {
    field: "yield-strength",
    label: "Yield or proof strength",
    minimum: 0,
    maximum: 1_000_000,
    exclusiveMinimum: true,
  });
  const tensileStrength = optionalNumber(materialCandidate.tensileStrengthMpa, {
    field: "tensile-strength",
    label: "Ultimate tensile strength",
    minimum: 0,
    maximum: 1_000_000,
    exclusiveMinimum: true,
  });
  const elasticModulus = optionalNumber(materialCandidate.elasticModulusGpa, {
    field: "elastic-modulus",
    label: "Elastic modulus",
    minimum: 0,
    maximum: 1_000_000,
    exclusiveMinimum: true,
  });
  const poissonRatio = optionalNumber(materialCandidate.poissonRatio, {
    field: "poisson-ratio",
    label: "Poisson ratio",
    minimum: -1,
    maximum: 0.499999,
    exclusiveMinimum: true,
  });
  const elongation = optionalNumber(materialCandidate.elongationPercent, {
    field: "elongation",
    label: "Elongation",
    minimum: 0,
    maximum: 10_000,
  });
  const hardnessValue = optionalNumber(materialCandidate.hardnessValue, {
    field: "hardness-value",
    label: "Hardness value",
    minimum: 0,
    maximum: 1_000_000,
    exclusiveMinimum: true,
  });
  const hardnessScale = enumValue(
    materialCandidate.hardnessScale,
    HARDNESS_SCALES,
    "hardness-scale",
    "hardness scale",
  );

  const axialCompression = optionalNumber(loadCandidate.axialCompressionKn, {
    field: "axial-load",
    label: "Axial compression",
    minimum: 0,
    maximum: 1e15,
  });
  const bendingMomentX = optionalNumber(loadCandidate.bendingMomentXKnM, {
    field: "bending-moment-x",
    label: "Bending moment Mx",
    minimum: 0,
    maximum: 1e15,
  });
  const bendingMomentY = optionalNumber(loadCandidate.bendingMomentYKnM, {
    field: "bending-moment-y",
    label: "Bending moment My",
    minimum: 0,
    maximum: 1e15,
  });
  const torque = optionalNumber(loadCandidate.torqueKnM, {
    field: "torque",
    label: "Torque",
    minimum: 0,
    maximum: 1e15,
  });
  const columnLength = optionalNumber(loadCandidate.columnLengthM, {
    field: "column-length",
    label: "Unbraced column length",
    minimum: 0,
    maximum: 1e9,
    exclusiveMinimum: true,
  });
  const effectiveLengthFactor = optionalNumber(
    loadCandidate.effectiveLengthFactor ?? 1,
    {
      field: "effective-length-factor",
      label: "Effective length factor K",
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: true,
    },
  );
  const deflectionCase = enumValue(
    loadCandidate.deflectionCase,
    DEFLECTION_CASES,
    "deflection-case",
    "deflection load case",
  );
  const deflectionAxis = enumValue(
    loadCandidate.deflectionAxis || "x",
    ["x", "y"],
    "deflection-axis",
    "deflection axis",
  );
  const deflectionLoad = optionalNumber(loadCandidate.deflectionLoad, {
    field: "deflection-load",
    label: "Service load",
    minimum: 0,
    maximum: 1e15,
    exclusiveMinimum: true,
  });
  const deflectionSpan = optionalNumber(loadCandidate.deflectionSpanM, {
    field: "deflection-span",
    label: "Deflection span",
    minimum: 0,
    maximum: 1e9,
    exclusiveMinimum: true,
  });

  const environment = enumValue(
    practicalCandidate.environment,
    ENVIRONMENTS,
    "design-environment",
    "environment",
  );
  const corrosion = enumValue(
    practicalCandidate.corrosionAssessment,
    CORROSION_ASSESSMENTS,
    "corrosion-assessment",
    "corrosion assessment",
  );
  const fabrication = enumValue(
    practicalCandidate.fabricationAssessment,
    FABRICATION_ASSESSMENTS,
    "fabrication-assessment",
    "fabrication assessment",
  );
  const availability = enumValue(
    practicalCandidate.availabilityAssessment,
    AVAILABILITY_ASSESSMENTS,
    "availability-assessment",
    "availability assessment",
  );

  const errors = [
    ...yieldStrength.errors,
    ...tensileStrength.errors,
    ...elasticModulus.errors,
    ...poissonRatio.errors,
    ...elongation.errors,
    ...hardnessValue.errors,
    ...hardnessScale.errors,
    ...axialCompression.errors,
    ...bendingMomentX.errors,
    ...bendingMomentY.errors,
    ...torque.errors,
    ...columnLength.errors,
    ...effectiveLengthFactor.errors,
    ...deflectionCase.errors,
    ...deflectionAxis.errors,
    ...deflectionLoad.errors,
    ...deflectionSpan.errors,
    ...environment.errors,
    ...corrosion.errors,
    ...fabrication.errors,
    ...availability.errors,
  ];

  if (
    yieldStrength.value !== null
    && tensileStrength.value !== null
    && tensileStrength.value < yieldStrength.value
  ) {
    errors.push(
      error(
        "tensile-strength",
        "UTS_BELOW_YIELD",
        "Ultimate tensile strength cannot be below the entered yield or proof strength.",
        tensileStrength.value,
      ),
    );
  }

  if ((hardnessValue.value === null) !== (hardnessScale.value === "")) {
    errors.push(
      error(
        hardnessValue.value === null ? "hardness-value" : "hardness-scale",
        "INCOMPLETE_HARDNESS",
        "Enter both a hardness value and its test scale, or leave both blank.",
        null,
      ),
    );
  }

  if (
    ["Shore A", "Shore D"].includes(hardnessScale.value)
    && hardnessValue.value !== null
    && hardnessValue.value > 100
  ) {
    errors.push(
      error(
        "hardness-value",
        "INVALID_SHORE_HARDNESS",
        `${hardnessScale.value} hardness must be no more than 100.`,
        hardnessValue.value,
      ),
    );
  }

  if (deflectionCase.value && deflectionLoad.value === null) {
    errors.push(
      error(
        "deflection-load",
        "DEFLECTION_LOAD_REQUIRED",
        "Enter a positive service load for the selected deflection case.",
        loadCandidate.deflectionLoad,
      ),
    );
  }

  if (deflectionCase.value && elasticModulus.value === null) {
    errors.push(
      error(
        "elastic-modulus",
        "ELASTIC_MODULUS_REQUIRED",
        "Enter a sourced elastic modulus to evaluate deflection.",
        materialCandidate.elasticModulusGpa,
      ),
    );
  }

  return {
    value: {
      material: {
        yieldStrengthMpa: yieldStrength.value,
        tensileStrengthMpa: tensileStrength.value,
        elasticModulusGpa: elasticModulus.value,
        poissonRatio: poissonRatio.value,
        elongationPercent: elongation.value,
        hardnessValue: hardnessValue.value,
        hardnessScale: hardnessScale.value,
        source: cleanText(materialCandidate.source, 300),
        condition: cleanText(materialCandidate.condition, 160),
      },
      loads: {
        axialCompressionKn: axialCompression.value,
        bendingMomentXKnM: bendingMomentX.value,
        bendingMomentYKnM: bendingMomentY.value,
        torqueKnM: torque.value,
        columnLengthM: columnLength.value,
        effectiveLengthFactor: effectiveLengthFactor.value ?? 1,
        deflectionCase: deflectionCase.value,
        deflectionAxis: deflectionAxis.value,
        deflectionLoad: deflectionLoad.value,
        deflectionSpanM: deflectionSpan.value,
      },
      practical: {
        environment: environment.value,
        corrosionAssessment: corrosion.value,
        fabricationAssessment: fabrication.value,
        availabilityAssessment: availability.value,
        source: cleanText(practicalCandidate.source, 300),
        notes: cleanText(practicalCandidate.notes, 1_000),
      },
    },
    errors,
  };
}

function hasValue(value) {
  return value !== null && value !== "" && value !== undefined;
}

function maximumBendingStressEnvelope(section, momentXNm, momentYNm) {
  const ix = section.inertiaM4.x;
  const iy = section.inertiaM4.y;
  const ixy = section.inertiaM4.xy;
  const determinant = ix * iy - ixy * ixy;
  if (!Number.isFinite(determinant) || determinant <= 0) return null;

  const momentX = Math.abs(momentXNm || 0);
  const momentY = Math.abs(momentYNm || 0);
  if (momentX === 0 && momentY === 0) return 0;

  let maximum = 0;
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      const mx = xSign * momentX;
      const my = ySign * momentY;
      const xCoefficient = (ix * my - ixy * mx) / determinant;
      const yCoefficient = (iy * mx - ixy * my) / determinant;
      let candidate;
      if (section.circularBoundaryRadius) {
        candidate =
          section.circularBoundaryRadius
          * Math.hypot(xCoefficient, yCoefficient);
      } else {
        candidate = Math.max(
          ...section.boundaryPointsM.map(
            (point) => Math.abs(xCoefficient * point.x + yCoefficient * point.y),
          ),
        );
      }
      maximum = Math.max(maximum, candidate);
    }
  }
  return maximum;
}

function deflectionOutput(loadCase, loadValue, spanM, elasticModulusPa, inertiaM4) {
  const pointLoadN = loadCase.endsWith("-point") ? loadValue * 1_000 : null;
  const distributedLoadNm = loadCase.endsWith("-udl") ? loadValue * 1_000 : null;
  let deflectionM;
  let maximumMomentNm;

  if (loadCase === "simply-supported-point") {
    deflectionM = pointLoadN * spanM ** 3 / (48 * elasticModulusPa * inertiaM4);
    maximumMomentNm = pointLoadN * spanM / 4;
  } else if (loadCase === "simply-supported-udl") {
    deflectionM =
      5 * distributedLoadNm * spanM ** 4 / (384 * elasticModulusPa * inertiaM4);
    maximumMomentNm = distributedLoadNm * spanM ** 2 / 8;
  } else if (loadCase === "cantilever-point") {
    deflectionM = pointLoadN * spanM ** 3 / (3 * elasticModulusPa * inertiaM4);
    maximumMomentNm = pointLoadN * spanM;
  } else if (loadCase === "cantilever-udl") {
    deflectionM =
      distributedLoadNm * spanM ** 4 / (8 * elasticModulusPa * inertiaM4);
    maximumMomentNm = distributedLoadNm * spanM ** 2 / 2;
  } else {
    return null;
  }

  return {
    loadCase,
    spanM,
    axis: null,
    deflectionM,
    spanToDeflectionRatio: deflectionM > 0 ? spanM / deflectionM : null,
    maximumMomentNm,
  };
}

export function calculateEngineeringScreening({
  section,
  densityKgM3,
  costPerKg = null,
  input = {},
} = {}) {
  const normalized = normalizeEngineeringInput(input);
  const engineeringInput = normalized.value;
  const material = engineeringInput.material;
  const loads = engineeringInput.loads;
  const practical = engineeringInput.practical;

  const hasMaterialInputs = Object.values(material).some(hasValue);
  const hasLoadInputs = Object.entries(loads).some(
    ([key, value]) =>
      !["effectiveLengthFactor", "deflectionAxis"].includes(key) && hasValue(value),
  );
  const hasPracticalInputs = Object.values(practical).some(hasValue);
  const hasAnyInput = hasMaterialInputs || hasLoadInputs || hasPracticalInputs;

  if (normalized.errors.length) {
    return {
      ok: false,
      modelVersion: ENGINEERING_MODEL_VERSION,
      errors: normalized.errors,
      inputs: engineeringInput,
      outputs: {},
      warnings: [],
      status: "incomplete-input",
      hasAnyInput,
    };
  }

  const outputs = {};
  const warnings = [];
  const sectionAvailable = Boolean(section?.available);
  const prismatic = sectionAvailable && section.applicability === "prismatic";
  const yieldStrengthPa =
    material.yieldStrengthMpa === null
      ? null
      : material.yieldStrengthMpa * 1e6;
  const tensileStrengthPa =
    material.tensileStrengthMpa === null
      ? null
      : material.tensileStrengthMpa * 1e6;
  const elasticModulusPa =
    material.elasticModulusGpa === null
      ? null
      : material.elasticModulusGpa * 1e9;

  if (sectionAvailable) {
    outputs.linearMassKgM = prismatic
      ? section.areaM2 * densityKgM3
      : null;
    outputs.linearCost = outputs.linearMassKgM !== null && Number.isFinite(costPerKg)
      ? outputs.linearMassKgM * costPerKg
      : null;
  }

  if (prismatic && yieldStrengthPa !== null) {
    outputs.grossAxialYieldForceN = section.areaM2 * yieldStrengthPa;
    const unitMomentStressX = maximumBendingStressEnvelope(section, 1, 0);
    const unitMomentStressY = maximumBendingStressEnvelope(section, 0, 1);
    outputs.firstYieldMomentXNm =
      unitMomentStressX > 0 ? yieldStrengthPa / unitMomentStressX : null;
    outputs.firstYieldMomentYNm =
      unitMomentStressY > 0 ? yieldStrengthPa / unitMomentStressY : null;
    outputs.specificYieldEnergyJkg = yieldStrengthPa / densityKgM3;
  }

  if (elasticModulusPa !== null) {
    outputs.specificStiffnessJkg = elasticModulusPa / densityKgM3;
  }

  const axialCompressionN = (loads.axialCompressionKn || 0) * 1_000;
  const momentXNm = (loads.bendingMomentXKnM || 0) * 1_000;
  const momentYNm = (loads.bendingMomentYKnM || 0) * 1_000;
  if (prismatic && (axialCompressionN || momentXNm || momentYNm)) {
    const bendingStressPa = maximumBendingStressEnvelope(
      section,
      momentXNm,
      momentYNm,
    );
    outputs.axialCompressionStressPa = axialCompressionN / section.areaM2;
    outputs.bendingStressEnvelopePa = bendingStressPa;
    outputs.combinedNormalStressEnvelopePa =
      outputs.axialCompressionStressPa + (bendingStressPa || 0);
    if (yieldStrengthPa !== null) {
      outputs.yieldUtilization =
        outputs.combinedNormalStressEnvelopePa / yieldStrengthPa;
      outputs.yieldFactorAgainstEnteredValue =
        outputs.combinedNormalStressEnvelopePa > 0
          ? yieldStrengthPa / outputs.combinedNormalStressEnvelopePa
          : null;
    }
  }

  const columnLengthM = loads.columnLengthM || section?.memberLengthM || null;
  if (
    prismatic
    && elasticModulusPa !== null
    && columnLengthM
    && section.capabilities.eulerBuckling
  ) {
    const effectiveLengthM = loads.effectiveLengthFactor * columnLengthM;
    outputs.columnLengthM = columnLengthM;
    outputs.effectiveLengthM = effectiveLengthM;
    outputs.slendernessRatio =
      effectiveLengthM / section.radiusOfGyrationM.principalMinimum;
    outputs.eulerFlexuralBucklingForceN =
      Math.PI ** 2
      * elasticModulusPa
      * section.inertiaM4.principalMinimum
      / effectiveLengthM ** 2;
    if (axialCompressionN > 0) {
      outputs.eulerUtilization =
        axialCompressionN / outputs.eulerFlexuralBucklingForceN;
    }
    if (section.capabilities.eulerBuckling !== true) {
      warnings.push(
        "Euler output is a minimum-principal-axis flexural screen only. Coupled flexural-torsional buckling is not evaluated for this open section.",
      );
    }
  }

  if (loads.deflectionCase) {
    if (!prismatic) {
      warnings.push("Beam deflection is not available for this non-prismatic interpretation.");
    } else {
      const spanM = loads.deflectionSpanM || section.memberLengthM;
      if (!spanM) {
        warnings.push("A deflection span is required because this shape has no member length.");
      } else {
        const { x: ix, y: iy, xy: ixy } = section.inertiaM4;
        const coupledAxes =
          Math.abs(ixy) > Math.max(ix, iy) * 1e-12;
        const determinant = ix * iy - ixy * ixy;
        const inertiaM4 = coupledAxes
          ? loads.deflectionAxis === "y"
            ? determinant / ix
            : determinant / iy
          : loads.deflectionAxis === "y"
            ? iy
            : ix;
        outputs.deflection = deflectionOutput(
          loads.deflectionCase,
          loads.deflectionLoad,
          spanM,
          elasticModulusPa,
          inertiaM4,
        );
        if (outputs.deflection) outputs.deflection.axis = loads.deflectionAxis;
        if (coupledAxes) {
          warnings.push(
            "Unsymmetric-section deflection uses the coupled elastic compliance for the selected gross axis; the accompanying cross-axis displacement and twist are not reported.",
          );
        }
      }
    }
  }

  const torqueNm = (loads.torqueKnM || 0) * 1_000;
  if (torqueNm > 0) {
    const torsion = section?.torsion;
    if (!prismatic || !torsion?.constantM4) {
      warnings.push(
        "Torque was entered, but a validated Saint-Venant torsion constant is unavailable for this shape.",
      );
    } else {
      const torsionLengthM = section.memberLengthM;
      outputs.torsion = {
        torqueNm,
        shearStressPa: torsion.shearRadiusM
          ? torqueNm * torsion.shearRadiusM / torsion.constantM4
          : torsion.shearModulusM3
            ? torqueNm / torsion.shearModulusM3
            : null,
        twistRad: null,
        shearModulusPa: null,
      };
      if (
        elasticModulusPa !== null
        && material.poissonRatio !== null
        && torsionLengthM
      ) {
        const shearModulusPa =
          elasticModulusPa / (2 * (1 + material.poissonRatio));
        outputs.torsion.shearModulusPa = shearModulusPa;
        outputs.torsion.twistRad =
          torqueNm * torsionLengthM / (shearModulusPa * torsion.constantM4);
      } else {
        warnings.push(
          "Enter elastic modulus and Poisson ratio to estimate Saint-Venant twist.",
        );
      }
      if (outputs.torsion.shearStressPa === null) {
        warnings.push(
          "Torsional shear stress is not evaluated for this non-circular/open geometry; Jt is retained for free-warping twist screening only.",
        );
      }
    }
    warnings.push(
      "Torque, torsional shear, and twist are information-only outputs without an entered torsional allowable; they do not affect the yield/Euler status.",
    );
  }

  if (tensileStrengthPa !== null) {
    outputs.tensileStrengthPa = tensileStrengthPa;
    warnings.push(
      "Ultimate tensile strength is recorded as material evidence, not used as a design allowable or fracture capacity.",
    );
  }

  if ((yieldStrengthPa !== null || elasticModulusPa !== null) && !material.source) {
    warnings.push(
      "Mechanical properties are user-entered and no source/condition reference was recorded.",
    );
  }
  if (hasPracticalInputs && !practical.source) {
    warnings.push(
      "Environment, corrosion, fabrication, and availability entries are user assessments without a recorded source.",
    );
  }

  if (sectionAvailable) {
    warnings.push(...section.warnings);
  }
  if (hasAnyInput) {
    warnings.push(
      "Gross-section elastic screening only: local buckling, lateral-torsional buckling, shear, fatigue, impact, connections, load combinations, imperfections, resistance factors, and project-code checks are excluded.",
    );
  }

  const utilizationValues = [
    outputs.yieldUtilization,
    outputs.eulerUtilization,
  ].filter(Number.isFinite);
  const worstUtilization = utilizationValues.length
    ? Math.max(...utilizationValues)
    : null;
  outputs.worstUtilization = worstUtilization;

  let status = "information-only";
  if (!sectionAvailable) status = "unsupported-geometry";
  else if (worstUtilization !== null && worstUtilization > 1) {
    status = "exceeds-entered-limit";
  } else if (worstUtilization !== null) {
    status = "within-entered-limit";
  }

  return {
    ok: true,
    modelVersion: ENGINEERING_MODEL_VERSION,
    errors: [],
    inputs: engineeringInput,
    outputs,
    practical,
    warnings: [...new Set(warnings)],
    status,
    hasMaterialInputs,
    hasLoadInputs,
    hasPracticalInputs,
    hasAnyInput,
  };
}
