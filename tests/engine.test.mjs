import test from "node:test";
import assert from "node:assert/strict";

import {
  calculatePart,
  calculationFingerprint,
  dimensionUnit,
  formatArea,
  formatCurrency,
  formatForce,
  formatMass,
  formatVolume,
  isCalculationCurrent,
  normalizeDimensions,
  summarizeParts,
  toDisplayValue,
} from "../js/engine.js";
import {
  AUTHORITATIVE_SOURCES,
  MATERIALS,
  MATERIAL_CATEGORIES,
  PRIMARY_SOURCES,
  getMaterial,
} from "../js/materials.js";
import {
  SHAPES,
  SHAPE_CATEGORIES,
  calculateShapeGeometry,
  getShape,
} from "../js/shapes.js";

const relativeTolerance = 1e-10;

function approximately(actual, expected, tolerance = relativeTolerance) {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= tolerance * scale,
    `expected ${actual} to be within ${tolerance * scale} of ${expected}`,
  );
}

function steel(shapeId, dimensions, extra = {}) {
  const result = calculatePart({
    shapeId,
    materialId: "e250a",
    dimensions,
    unitSystem: "metric",
    ...extra,
  });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  return result;
}

test("registry preserves all 151 materials with normalized conservative fields", () => {
  assert.equal(MATERIALS.length, 151);
  assert.ok(MATERIAL_CATEGORIES.length > 10);
  assert.equal(new Set(MATERIALS.map(({ id }) => id)).size, 151);

  const expectedFields = [
    "category",
    "densityKgM3",
    "gradeReference",
    "id",
    "name",
    "note",
    "referenceStatus",
  ];
  for (const material of MATERIALS) {
    assert.deepEqual(Object.keys(material).sort(), expectedFields);
    assert.ok(material.id);
    assert.ok(material.name);
    assert.ok(material.category);
    assert.ok(Number.isFinite(material.densityKgM3));
    assert.ok(material.densityKgM3 > 0);
    assert.ok(material.gradeReference);
    assert.ok(material.referenceStatus);
    assert.match(
      material.note,
      /indicative|verify|planning|supplier|certificate|density/i,
    );
  }

  assert.equal(getMaterial("e250a").densityKgM3, 7850);
  assert.equal(getMaterial("missing"), null);
});

test("known revisions are updated and false density citations are removed", () => {
  assert.equal(getMaterial("cr1").gradeReference, "IS 513 Part 1:2016");
  assert.match(getMaterial("ss316").gradeReference, /IS 6603:2024/);

  const removed = {
    nr: /IS 6396.*removed/i,
    "cr-r": /IS 6395.*removed/i,
    nbr: /IS 6395.*removed/i,
    sbr: /IS 6395.*removed/i,
    pa6: /IS 11197.*removed/i,
    pa66: /IS 11197.*removed/i,
    pp: /IS 10975.*removed/i,
    pmma: /IS 13201.*removed/i,
    abs: /IS 11156.*removed/i,
    pc: /IS 13567.*removed/i,
    pom: /IS 15219.*removed/i,
    teak: /IS 12020.*removed/i,
    sal: /IS 12020.*removed/i,
    rbwd: /IS 12020.*removed/i,
  };
  for (const [id, pattern] of Object.entries(removed)) {
    assert.equal(getMaterial(id).referenceStatus, "citation-removed");
    assert.match(getMaterial(id).gradeReference, pattern);
  }

  assert.equal(getMaterial("fkm").referenceStatus, "classification-only");
  assert.equal(getMaterial("cfrp").referenceStatus, "test-method-only");
  assert.equal(getMaterial("uhmw").referenceStatus, "test-method-only");
});

test("authoritative source metadata is exported as UI array and keyed registry", () => {
  assert.ok(Array.isArray(PRIMARY_SOURCES));
  assert.ok(PRIMARY_SOURCES.length >= 10);
  for (const source of PRIMARY_SOURCES) {
    assert.match(source.url, /^https:\/\//);
    assert.ok(source.title);
    assert.ok(source.role);
  }
  assert.equal(
    AUTHORITATIVE_SOURCES.BIS_IS_6603_2024.url,
    PRIMARY_SOURCES.find(({ title }) => title.includes("IS 6603:2024")).url,
  );
});

test("shape registry contains 22 shapes and app-compatible field aliases", () => {
  assert.equal(SHAPES.length, 22);
  assert.equal(new Set(SHAPES.map(({ id }) => id)).size, 22);
  assert.ok(SHAPE_CATEGORIES.length >= 4);
  for (const shape of SHAPES) {
    assert.strictEqual(shape.fields, shape.dimensions);
    for (const field of shape.fields) {
      assert.deepEqual(
        Object.keys(field).sort(),
        ["key", "kind", "label", "symbol"],
      );
    }
  }
});

test("golden metric theoretical-mass vectors", async (t) => {
  const vectors = [
    ["round bar", "round_bar", { D: 20, L: 1 }, 2.466150233067988],
    ["square bar", "square_bar", { A: 20, L: 1 }, 3.14],
    ["flat bar", "flat_bar", { W: 50, T: 10, L: 2 }, 7.85],
    ["hex bar", "hex_bar", { AF: 20, L: 1 }, 2.719319768175516],
    ["octagonal bar", "oct_bar", { AF: 20, L: 1 }, 2.601261171937577],
    [
      "round pipe",
      "rnd_pipe",
      { OD: 60.3, WT: 3.2, L: 6 },
      27.03689823526872,
    ],
    ["SHS sharp corner", "shs", { A: 100, T: 5, L: 1 }, 14.915],
    [
      "RHS sharp corner",
      "rhs",
      { A: 100, B: 50, T: 5, L: 2 },
      21.98,
    ],
    ["equal angle", "eq_angle", { A: 50, T: 5, L: 1 }, 3.72875],
    [
      "unequal angle",
      "uneq_angle",
      { A: 75, B: 50, T: 6, L: 1 },
      5.6049,
    ],
    [
      "T section",
      "t_bar",
      { BF: 100, TF: 10, H: 150, TW: 6, L: 2 },
      28.888,
    ],
    [
      "I section",
      "i_beam",
      { H: 300, BF: 150, TF: 10, TW: 6, L: 6 },
      220.428,
    ],
    [
      "corrected Z section",
      "z_section",
      { H: 200, BF: 60, TF: 2, TW: 2, L: 6 },
      29.7672,
    ],
    [
      "flat plate",
      "flat_plate",
      { L: 1000, W: 500, T: 10 },
      39.25,
    ],
    ["disc", "circ_plate", { D: 100, T: 10 }, 0.6165375582517996],
    [
      "ring",
      "ring",
      { OD: 100, ID: 50, T: 10 },
      0.4624031686888497,
    ],
    ["sphere", "sphere", { D: 100 }, 4.11025038844787],
    [
      "hollow sphere",
      "hol_sphere",
      { OD: 100, T: 10 },
      2.0058021899625604,
    ],
    ["cone", "cone", { D: 100, H: 200 }, 4.11025038844787],
    [
      "cylinder",
      "cylinder",
      { D: 100, H: 200 },
      12.330751165343609,
    ],
  ];

  for (const [name, shapeId, dimensions, expectedKg] of vectors) {
    await t.test(name, () => {
      const result = steel(shapeId, dimensions);
      approximately(result.totalMassKg, expectedKg, 2e-10);
      assert.ok(result.volumeM3 > 0);
      assert.ok(result.formula);
      assert.match(result.substitution, /m₁=V×ρ/);
    });
  }
});

test("all 22 shape calculators accept a physically valid vector", () => {
  const valid = {
    round_bar: { D: 20, L: 1 },
    square_bar: { A: 20, L: 1 },
    flat_bar: { W: 20, T: 5, L: 1 },
    hex_bar: { AF: 20, L: 1 },
    oct_bar: { AF: 20, L: 1 },
    rnd_pipe: { OD: 50, WT: 2, L: 1 },
    shs: { A: 50, T: 2, L: 1 },
    rhs: { A: 80, B: 50, T: 2, L: 1 },
    eq_angle: { A: 40, T: 4, L: 1 },
    uneq_angle: { A: 50, B: 30, T: 4, L: 1 },
    t_bar: { BF: 80, TF: 8, H: 100, TW: 5, L: 1 },
    i_beam: { H: 200, BF: 100, TF: 8, TW: 5, L: 1 },
    h_beam: { H: 200, BF: 150, TF: 10, TW: 6, L: 1 },
    channel: { H: 150, BF: 60, TF: 8, TW: 5, L: 1 },
    z_section: { H: 150, BF: 60, TF: 2, TW: 2, L: 1 },
    flat_plate: { L: 100, W: 100, T: 5 },
    circ_plate: { D: 100, T: 5 },
    ring: { OD: 100, ID: 50, T: 5 },
    sphere: { D: 100 },
    hol_sphere: { OD: 100, T: 5 },
    cone: { D: 100, H: 100 },
    cylinder: { D: 100, H: 100 },
  };
  for (const shape of SHAPES) {
    assert.ok(valid[shape.id], `missing smoke vector for ${shape.id}`);
    assert.equal(
      steel(shape.id, valid[shape.id]).ok,
      true,
      `failed ${shape.id}`,
    );
  }
});

test("metric and imperial inputs normalize to the same SI geometry", () => {
  const metric = steel("round_bar", { D: 20, L: 1 });
  const imperial = calculatePart({
    shapeId: "round_bar",
    materialId: "e250a",
    unitSystem: "imperial",
    dimensions: { D: 20 / 25.4, L: 1 / 0.3048 },
  });
  assert.equal(imperial.ok, true, JSON.stringify(imperial.errors));
  approximately(imperial.totalMassKg, metric.totalMassKg, 1e-12);
  approximately(imperial.normalizedDimensions.D, 0.02, 1e-12);
  approximately(imperial.normalizedDimensions.L, 1, 1e-12);

  assert.equal(dimensionUnit("cross", "metric"), "mm");
  assert.equal(dimensionUnit("length", "metric"), "m");
  assert.equal(dimensionUnit("cross", "imperial"), "in");
  assert.equal(dimensionUnit("length", "imperial"), "ft");
  approximately(toDisplayValue(0.0254, "cross", "imperial"), 1);
  approximately(toDisplayValue(0.3048, "length", "imperial"), 1);
});

test("structured field and cross-field validation rejects impossible geometry", () => {
  const cases = [
    ["rnd_pipe", { OD: 100, WT: 50, L: 1 }, "WALL_CONSUMES_SECTION"],
    ["ring", { OD: 100, ID: 100, T: 10 }, "INNER_NOT_SMALLER"],
    [
      "i_beam",
      { H: 100, BF: 10, TF: 10, TW: 100, L: 1 },
      "WEB_EXCEEDS_FLANGE",
    ],
    [
      "t_bar",
      { H: 100, BF: 10, TF: 10, TW: 100, L: 1 },
      "WEB_EXCEEDS_FLANGE",
    ],
  ];
  for (const [shapeId, dimensions, expectedCode] of cases) {
    const result = calculatePart({
      shapeId,
      materialId: "e250a",
      dimensions,
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some(({ code }) => code === expectedCode),
      `${shapeId}: ${JSON.stringify(result.errors)}`,
    );
  }
});

test("invalid numbers, unsupported units, density, gravity and fractional quantity reject", () => {
  const badQuantity = calculatePart({
    shapeId: "round_bar",
    materialId: "e250a",
    dimensions: { D: 20, L: 1 },
    quantity: 1.9,
  });
  assert.equal(badQuantity.ok, false);
  assert.ok(badQuantity.errors.some(({ code }) => code === "INVALID_QUANTITY"));

  const invalid = [
    { dimensions: { D: "", L: 1 } },
    { dimensions: { D: Number.POSITIVE_INFINITY, L: 1 } },
    { dimensions: { D: -20, L: 1 } },
    { dimensions: { D: 20, L: 1 }, unitSystem: "parsec" },
    { dimensions: { D: 20, L: 1 }, densityKgM3: 0 },
    { dimensions: { D: 20, L: 1 }, gravityMps2: -1 },
    { dimensions: { D: 20, L: 1 }, quantity: Number.MAX_SAFE_INTEGER + 1 },
  ];
  for (const overrides of invalid) {
    const result = calculatePart({
      shapeId: "round_bar",
      materialId: "e250a",
      ...overrides,
    });
    assert.equal(result.ok, false, JSON.stringify(overrides));
    assert.ok(result.errors.length);
  }
});

test("thin-wall formula remains finite without subtractive cancellation", () => {
  const result = steel("rnd_pipe", {
    OD: 1e9,
    WT: 1e-6,
    L: 1,
  });
  const outsideDiameterM = 1e6;
  const thicknessM = 1e-9;
  const expected =
    Math.PI *
    thicknessM *
    (outsideDiameterM - thicknessM) *
    7850;
  assert.ok(Number.isFinite(result.totalMassKg));
  approximately(result.totalMassKg, expected, 1e-12);
});

test("quantity, tolerance, waste, force and optional cost planning outputs", () => {
  const result = steel(
    "flat_bar",
    { W: 50, T: 10, L: 2 },
    {
      quantity: 2,
      planningTolerancePercent: { minus: 2, plus: 3 },
      wastePercent: 10,
      costPerKg: 50,
      currency: "INR",
    },
  );
  approximately(result.massPerPieceKg, 7.85);
  approximately(result.totalMassKg, 15.7);
  approximately(result.toleranceMinKg, 15.386);
  approximately(result.toleranceMaxKg, 16.171);
  approximately(result.procurementMassKg, 17.27);
  approximately(result.procurementToleranceMinKg, 16.9246);
  approximately(result.procurementToleranceMaxKg, 17.7881);
  approximately(result.forceN, 15.7 * 9.80665);
  approximately(result.estimatedCost, 863.5);
  assert.equal(result.cost.currency, "INR");
});

test("fingerprint prevents stale results after dimensions or material changes", () => {
  const input = {
    shapeId: "round_bar",
    materialId: "e250a",
    dimensions: { D: 20, L: 1 },
  };
  const result = calculatePart(input);
  assert.equal(result.ok, true);
  assert.equal(result.inputFingerprint, calculationFingerprint(input));
  assert.equal(isCalculationCurrent(result, input), true);
  assert.equal(
    isCalculationCurrent(result, {
      ...input,
      dimensions: { D: 25, L: 1 },
    }),
    false,
  );
  assert.equal(
    isCalculationCurrent(result, { ...input, materialId: "al6061" }),
    false,
  );
});

test("partial BOM totals are refused instead of silently omitting rows", () => {
  const valid = steel("round_bar", { D: 20, L: 1 });
  const invalid = calculatePart({
    shapeId: "round_bar",
    materialId: "e250a",
    dimensions: { D: "", L: 1 },
  });
  const summary = summarizeParts([valid, invalid]);
  assert.equal(summary.ok, false);
  assert.equal(summary.complete, false);
  assert.equal(summary.totalMassKg, null);
  assert.ok(summary.errors.some(({ code }) => code === "INCOMPLETE_BOM"));

  const complete = summarizeParts([valid, valid]);
  assert.equal(complete.ok, true);
  approximately(complete.totalMassKg, valid.totalMassKg * 2);
});

test("formatters retain micro masses and use lowercase tonne symbol", () => {
  assert.equal(formatMass(1000, { locale: "en-US" }), "1 t");
  assert.equal(formatMass(1, { locale: "en-US" }), "1 kg");
  assert.equal(formatMass(0.001, { locale: "en-US" }), "1 g");
  assert.equal(formatMass(0.000001, { locale: "en-US" }), "1 mg");
  assert.equal(formatMass(0.000000001, { locale: "en-US" }), "1 µg");
  assert.notEqual(formatMass(1e-12, { locale: "en-US" }), "0.00 g");
  assert.doesNotMatch(formatMass(2000), /\bT\b/);

  assert.match(formatVolume(1e-6), /cm³$/);
  assert.match(formatArea(1e-6), /mm²$/);
  assert.match(formatForce(1000), /kN$/);
  assert.match(formatCurrency(123.45, "INR", "en-IN"), /123\.45/);
  assert.equal(formatMass(Number.NaN), "—");
});

test("shape geometry can be evaluated directly in canonical SI", () => {
  const normalization = normalizeDimensions(
    "round_bar",
    { D: 20, L: 1 },
    "metric",
  );
  assert.equal(normalization.ok, true);
  const geometry = calculateShapeGeometry(
    getShape("round_bar"),
    normalization.normalizedDimensions,
  );
  assert.equal(geometry.ok, true);
  approximately(geometry.areaM2, Math.PI * 0.02 ** 2 / 4);
  approximately(geometry.volumeM3, geometry.areaM2);
});
