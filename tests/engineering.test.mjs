import test from "node:test";
import assert from "node:assert/strict";

import { calculatePart, normalizeDimensions } from "../js/engine.js";
import {
  calculateEngineeringScreening,
  normalizeEngineeringInput,
} from "../js/engineering.js";
import { calculateSectionProperties } from "../js/section-properties.js";
import { calculateShapeGeometry, getShape } from "../js/shapes.js";

function close(actual, expected, relative = 1e-10, absolute = 1e-18) {
  const tolerance = Math.max(absolute, Math.abs(expected) * relative);
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function circularSection(diameter = 0.02, length = 1) {
  const section = calculateSectionProperties("round_bar", {
    D: diameter,
    L: length,
  });
  assert.equal(section.available, true);
  return section;
}

function screening(section, input) {
  const result = calculateEngineeringScreening({
    section,
    densityKgM3: 7_850,
    costPerKg: 50,
    input,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result;
}

test("solid circle returns exact A, I, S, r and Jp = Jt", () => {
  const diameter = 0.02;
  const section = circularSection(diameter);
  const expectedArea = Math.PI * diameter ** 2 / 4;
  const expectedInertia = Math.PI * diameter ** 4 / 64;
  const expectedModulus = Math.PI * diameter ** 3 / 32;

  close(section.areaM2, expectedArea);
  close(section.inertiaM4.x, expectedInertia);
  close(section.inertiaM4.y, expectedInertia);
  close(section.inertiaM4.xy, 0);
  close(section.elasticSectionModulusM3.xMinimum, expectedModulus);
  close(section.elasticSectionModulusM3.yMinimum, expectedModulus);
  close(section.radiusOfGyrationM.x, diameter / 4);
  close(section.radiusOfGyrationM.principalMinimum, diameter / 4);
  close(section.polarAreaMomentM4, 2 * expectedInertia);
  close(section.torsion.constantM4, section.polarAreaMomentM4);
  assert.equal(section.torsion.method, "exact-circular");
});

test("solid rectangle properties are exact while Jt remains distinct from Jp", () => {
  const width = 0.05;
  const height = 0.01;
  const section = calculateSectionProperties("flat_bar", {
    W: width,
    T: height,
    L: 2,
  });
  assert.equal(section.available, true);

  close(section.areaM2, width * height);
  close(section.inertiaM4.x, width * height ** 3 / 12);
  close(section.inertiaM4.y, height * width ** 3 / 12);
  close(section.elasticSectionModulusM3.xMinimum, width * height ** 2 / 6);
  close(section.elasticSectionModulusM3.yMinimum, height * width ** 2 / 6);
  close(section.radiusOfGyrationM.x, height / Math.sqrt(12));
  close(section.radiusOfGyrationM.y, width / Math.sqrt(12));
  assert.ok(section.torsion.constantM4 > 0);
  assert.ok(section.torsion.constantM4 < section.polarAreaMomentM4);
  assert.match(section.torsion.note, /not Ix \+ Iy/i);
});

test("square Saint-Venant constant matches the analytic-series regression", () => {
  const side = 0.04;
  const section = calculateSectionProperties("square_bar", {
    A: side,
    L: 1,
  });
  close(section.torsion.constantM4 / side ** 4, 0.140577014955, 2e-9);
  close(section.polarAreaMomentM4 / side ** 4, 1 / 6);
});

test("round pipe uses stable exact annulus properties", () => {
  const outsideDiameter = 0.1;
  const thickness = 0.005;
  const insideDiameter = outsideDiameter - 2 * thickness;
  const section = calculateSectionProperties("rnd_pipe", {
    OD: outsideDiameter,
    WT: thickness,
    L: 3,
  });
  const expectedArea =
    Math.PI * (outsideDiameter ** 2 - insideDiameter ** 2) / 4;
  const expectedInertia =
    Math.PI * (outsideDiameter ** 4 - insideDiameter ** 4) / 64;
  close(section.areaM2, expectedArea);
  close(section.inertiaM4.x, expectedInertia);
  close(section.torsion.constantM4, 2 * expectedInertia);
});

test("RHS combines exact sharp-corner geometry with stated thin-wall Jt", () => {
  const width = 0.1;
  const height = 0.05;
  const thickness = 0.004;
  const section = calculateSectionProperties("rhs", {
    A: width,
    B: height,
    T: thickness,
    L: 2,
  });
  const insideWidth = width - 2 * thickness;
  const insideHeight = height - 2 * thickness;
  const medianWidth = width - thickness;
  const medianHeight = height - thickness;
  const expectedJt =
    2 * thickness * medianWidth ** 2 * medianHeight ** 2
    / (medianWidth + medianHeight);

  close(section.areaM2, width * height - insideWidth * insideHeight);
  close(
    section.inertiaM4.x,
    (width * height ** 3 - insideWidth * insideHeight ** 3) / 12,
  );
  close(section.torsion.constantM4, expectedJt);
  assert.equal(section.torsion.method, "thin-wall-closed");
});

test("asymmetric sections retain Ixy and valid principal invariants", () => {
  for (const [shapeId, dimensions] of [
    ["eq_angle", { A: 0.1, T: 0.01, L: 1 }],
    ["uneq_angle", { A: 0.1, B: 0.06, T: 0.008, L: 1 }],
    ["z_section", { H: 0.15, BF: 0.06, TF: 0.002, TW: 0.002, L: 1 }],
  ]) {
    const section = calculateSectionProperties(shapeId, dimensions);
    assert.equal(section.available, true);
    assert.notEqual(section.inertiaM4.xy, 0);
    close(
      section.inertiaM4.principalMaximum + section.inertiaM4.principalMinimum,
      section.inertiaM4.x + section.inertiaM4.y,
    );
    close(
      section.inertiaM4.principalMaximum * section.inertiaM4.principalMinimum,
      section.inertiaM4.x * section.inertiaM4.y - section.inertiaM4.xy ** 2,
      1e-9,
    );
    assert.ok(section.radiusOfGyrationM.principalMinimum > 0);
    assert.match(section.warnings.join(" "), /principal axes/i);
  }
});

test("section area independently agrees with mass geometry for every supported interpretation", () => {
  const metricVectors = {
    round_bar: { D: 20, L: 1 },
    square_bar: { A: 20, L: 1 },
    flat_bar: { W: 50, T: 10, L: 1 },
    hex_bar: { AF: 20, L: 1 },
    oct_bar: { AF: 20, L: 1 },
    rnd_pipe: { OD: 60, WT: 3, L: 1 },
    shs: { A: 60, T: 3, L: 1 },
    rhs: { A: 80, B: 40, T: 3, L: 1 },
    eq_angle: { A: 50, T: 5, L: 1 },
    uneq_angle: { A: 75, B: 50, T: 6, L: 1 },
    t_bar: { H: 100, BF: 80, TF: 8, TW: 6, L: 1 },
    i_beam: { H: 200, BF: 100, TF: 10, TW: 6, L: 1 },
    h_beam: { H: 200, BF: 200, TF: 12, TW: 8, L: 1 },
    channel: { H: 150, BF: 60, TF: 8, TW: 6, L: 1 },
    z_section: { H: 150, BF: 60, TF: 2, TW: 2, L: 1 },
    flat_plate: { W: 500, T: 8, L: 1 },
    circ_plate: { D: 500, T: 8 },
    ring: { OD: 500, ID: 300, T: 8 },
    cylinder: { D: 100, H: 200 },
  };

  for (const [shapeId, dimensions] of Object.entries(metricVectors)) {
    const normalized = normalizeDimensions(shapeId, dimensions, "metric");
    assert.equal(normalized.ok, true, shapeId);
    const geometry = calculateShapeGeometry(
      getShape(shapeId),
      normalized.normalizedDimensions,
    );
    const section = calculateSectionProperties(
      shapeId,
      normalized.normalizedDimensions,
    );
    assert.equal(section.available, true, shapeId);
    assert.equal(geometry.ok, true, shapeId);
    if (geometry.areaM2 !== null) close(section.areaM2, geometry.areaM2, 1e-10);
  }

  for (const [shapeId, dimensions] of [
    ["sphere", { D: 0.1 }],
    ["hol_sphere", { OD: 0.1, WT: 0.005 }],
    ["cone", { D: 0.1, H: 0.2 }],
  ]) {
    const section = calculateSectionProperties(shapeId, dimensions);
    assert.equal(section.available, false);
    assert.match(section.note, /no single|variable/i);
  }
});

test("mechanical evidence validation rejects contradictory and incomplete inputs", () => {
  const contradictory = normalizeEngineeringInput({
    material: {
      yieldStrengthMpa: 350,
      tensileStrengthMpa: 300,
    },
  });
  assert.ok(contradictory.errors.some(({ code }) => code === "UTS_BELOW_YIELD"));

  const incompleteHardness = normalizeEngineeringInput({
    material: { hardnessValue: 120 },
  });
  assert.ok(
    incompleteHardness.errors.some(({ code }) => code === "INCOMPLETE_HARDNESS"),
  );

  const invalidShore = normalizeEngineeringInput({
    material: { hardnessValue: 110, hardnessScale: "Shore A" },
  });
  assert.ok(
    invalidShore.errors.some(({ code }) => code === "INVALID_SHORE_HARDNESS"),
  );

  const missingDeflectionEvidence = normalizeEngineeringInput({
    loads: { deflectionCase: "cantilever-point" },
  });
  assert.ok(
    missingDeflectionEvidence.errors.some(
      ({ code }) => code === "DEFLECTION_LOAD_REQUIRED",
    ),
  );
  assert.ok(
    missingDeflectionEvidence.errors.some(
      ({ code }) => code === "ELASTIC_MODULUS_REQUIRED",
    ),
  );
});

test("axial, bending, yield and Euler outputs match independent circle equations", () => {
  const section = circularSection(0.02, 1);
  const result = screening(section, {
    material: {
      yieldStrengthMpa: 250,
      elasticModulusGpa: 200,
      source: "Controlled regression",
    },
    loads: {
      axialCompressionKn: 10,
      bendingMomentXKnM: 0.1,
      columnLengthM: 1,
      effectiveLengthFactor: 1,
    },
  });

  const area = Math.PI * 0.02 ** 2 / 4;
  const inertia = Math.PI * 0.02 ** 4 / 64;
  const modulus = Math.PI * 0.02 ** 3 / 32;
  const expectedStress = 10_000 / area + 100 / modulus;
  close(result.outputs.grossAxialYieldForceN, area * 250e6);
  close(result.outputs.firstYieldMomentXNm, modulus * 250e6);
  close(result.outputs.combinedNormalStressEnvelopePa, expectedStress);
  close(result.outputs.yieldUtilization, expectedStress / 250e6);
  close(
    result.outputs.eulerFlexuralBucklingForceN,
    Math.PI ** 2 * 200e9 * inertia,
  );
  close(result.outputs.slendernessRatio, 1 / 0.005);
  assert.equal(result.status, "within-entered-limit");
});

test("all four elementary beam-deflection cases use their documented equations", () => {
  const section = circularSection(0.02, 2);
  const elasticModulus = 200e9;
  const inertia = section.inertiaM4.x;
  const span = 2;
  const cases = [
    ["simply-supported-point", 1, 1_000 * span ** 3 / (48 * elasticModulus * inertia)],
    ["simply-supported-udl", 1, 5 * 1_000 * span ** 4 / (384 * elasticModulus * inertia)],
    ["cantilever-point", 1, 1_000 * span ** 3 / (3 * elasticModulus * inertia)],
    ["cantilever-udl", 1, 1_000 * span ** 4 / (8 * elasticModulus * inertia)],
  ];

  for (const [deflectionCase, deflectionLoad, expected] of cases) {
    const result = screening(section, {
      material: {
        elasticModulusGpa: 200,
        source: "Controlled regression",
      },
      loads: {
        deflectionCase,
        deflectionAxis: "x",
        deflectionLoad,
        deflectionSpanM: span,
      },
    });
    close(result.outputs.deflection.deflectionM, expected);
  }
});

test("unsymmetric deflection uses coupled compliance and warns about omitted cross-axis motion", () => {
  const section = calculateSectionProperties("uneq_angle", {
    A: 0.1,
    B: 0.06,
    T: 0.008,
    L: 2,
  });
  const result = screening(section, {
    material: {
      elasticModulusGpa: 200,
      source: "Controlled regression",
    },
    loads: {
      deflectionCase: "simply-supported-point",
      deflectionAxis: "x",
      deflectionLoad: 1,
      deflectionSpanM: 2,
    },
  });
  const { x: ix, y: iy, xy: ixy } = section.inertiaM4;
  const effectiveInertia = (ix * iy - ixy ** 2) / iy;
  close(
    result.outputs.deflection.deflectionM,
    1_000 * 2 ** 3 / (48 * 200e9 * effectiveInertia),
  );
  assert.match(result.warnings.join(" "), /coupled elastic compliance/i);
});

test("unsymmetric first-yield moments use coupled stress rather than Ix/c alone", () => {
  const section = calculateSectionProperties("eq_angle", {
    A: 0.1,
    T: 0.01,
    L: 1,
  });
  const capacity = screening(section, {
    material: {
      yieldStrengthMpa: 250,
      source: "Controlled regression",
    },
  });
  const demand = screening(section, {
    material: {
      yieldStrengthMpa: 250,
      source: "Controlled regression",
    },
    loads: {
      bendingMomentXKnM: capacity.outputs.firstYieldMomentXNm / 1_000,
    },
  });
  close(demand.outputs.yieldUtilization, 1, 1e-10);
  assert.ok(
    capacity.outputs.firstYieldMomentXNm
    < section.elasticSectionModulusM3.xMinimum * 250e6,
  );
});

test("circular torque screen matches elastic shear and twist equations", () => {
  const section = circularSection(0.02, 1);
  const result = screening(section, {
    material: {
      elasticModulusGpa: 200,
      poissonRatio: 0.3,
      source: "Controlled regression",
    },
    loads: { torqueKnM: 0.02 },
  });
  const torque = 20;
  const shearModulus = 200e9 / (2 * (1 + 0.3));
  close(
    result.outputs.torsion.shearStressPa,
    torque * 0.01 / section.torsion.constantM4,
  );
  close(
    result.outputs.torsion.twistRad,
    torque / (shearModulus * section.torsion.constantM4),
  );
  assert.match(result.warnings.join(" "), /do not affect the yield\/Euler status/i);
});

test("non-circular open-section torque retains Jt but does not invent shear stress", () => {
  const section = calculateSectionProperties("channel", {
    H: 0.15,
    BF: 0.06,
    TF: 0.008,
    TW: 0.006,
    L: 2,
  });
  const result = screening(section, {
    material: {
      elasticModulusGpa: 200,
      poissonRatio: 0.3,
      source: "Controlled regression",
    },
    loads: { torqueKnM: 0.01 },
  });
  assert.ok(result.outputs.torsion.twistRad > 0);
  assert.equal(result.outputs.torsion.shearStressPa, null);
  assert.match(result.warnings.join(" "), /shear stress is not evaluated/i);
});

test("material names and density never auto-populate mechanical properties", () => {
  const result = calculatePart({
    shapeId: "round_bar",
    materialId: "e250a",
    dimensions: { D: 20, L: 1 },
    unitSystem: "metric",
  });
  assert.equal(result.ok, true);
  assert.equal(result.engineering.hasMaterialInputs, false);
  assert.equal(result.engineering.inputs.material.yieldStrengthMpa, null);
  assert.equal(result.engineering.inputs.material.tensileStrengthMpa, null);
  assert.equal(result.engineering.inputs.material.elasticModulusGpa, null);
  assert.equal(result.engineering.outputs.grossAxialYieldForceN, undefined);
});

test("unsupported geometry and unsourced practical records remain explicit", () => {
  const sphere = calculateSectionProperties("sphere", { D: 0.1 });
  const unsupported = screening(sphere, {
    material: { yieldStrengthMpa: 250, source: "Controlled regression" },
  });
  assert.equal(unsupported.status, "unsupported-geometry");

  const practical = screening(circularSection(), {
    practical: {
      environment: "wet-marine",
      corrosionAssessment: "conditional",
      fabricationAssessment: "specialist",
      availabilityAssessment: "limited",
    },
  });
  assert.equal(practical.hasPracticalInputs, true);
  assert.match(practical.warnings.join(" "), /without a recorded source/i);
});
