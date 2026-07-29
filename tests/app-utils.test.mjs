import test from "node:test";
import assert from "node:assert/strict";

import {
  STORAGE_KEY,
  clearState,
  createDefaultProject,
  loadState,
  normalizeStoredState,
  saveState,
} from "../js/storage.js";
import {
  createBomCsv,
  neutralizeSpreadsheetFormula,
  safeFilename,
} from "../js/export.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("state round-trips through guarded storage", () => {
  const storage = createMemoryStorage();
  const state = createDefaultProject();
  state.theme = "dark";
  state.project.name = "Pump skid";
  state.bom.push({ id: "line-1", quantity: 2 });

  assert.equal(saveState(state, storage).ok, true);
  const loaded = loadState(storage);

  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.state.theme, "dark");
  assert.equal(loaded.state.project.name, "Pump skid");
  assert.equal(loaded.state.bom.length, 1);
  assert.equal(clearState(storage).ok, true);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test("malformed or hostile persisted state is normalized", () => {
  const normalized = normalizeStoredState({
    activeView: "unknown",
    theme: "neon",
    unitSystem: "yards",
    project: {
      name: "x".repeat(200),
      revision: "r".repeat(100),
    },
    bom: Array.from({ length: 700 }, (_, index) => ({ id: index })),
  });

  assert.equal(normalized.activeView, "calculator");
  assert.equal(normalized.theme, "light");
  assert.equal(normalized.unitSystem, "metric");
  assert.equal(normalized.project.name.length, 100);
  assert.equal(normalized.project.revision.length, 20);
  assert.equal(normalized.bom.length, 500);
});

test("storage errors cannot prevent calculator startup", () => {
  const blockedStorage = {
    getItem() {
      throw new DOMException("Blocked", "SecurityError");
    },
  };

  const loaded = loadState(blockedStorage);
  assert.equal(loaded.status, "unavailable");
  assert.equal(loaded.state.version, 2);
});

test("CSV export neutralizes spreadsheet formula injection", () => {
  for (const value of ["=2+2", "+SUM(A1:A2)", "-10+20", "@cmd", "  =HYPERLINK()"]) {
    assert.ok(neutralizeSpreadsheetFormula(value).startsWith("'"));
  }

  const csv = createBomCsv({
    project: { name: "=malicious" },
    bom: [
      {
        partName: "+danger",
        shapeName: "Round bar",
        dimensionSummary: "D 20 mm × L 1 m",
        materialName: "Steel",
        densityKgM3: 7850,
        quantity: 1,
        massPerPieceKg: 2.466,
        totalMassKg: 2.466,
        wastePercent: 0,
        procurementMassKg: 2.466,
        costPerKg: 0,
        estimatedCost: 0,
        formula: "πD²L/4",
        referenceStatus: "reference",
        sectionProperties: {
          available: true,
          areaM2: Math.PI * 0.02 ** 2 / 4,
          inertiaM4: { x: Math.PI * 0.02 ** 4 / 64, y: Math.PI * 0.02 ** 4 / 64, xy: 0 },
          elasticSectionModulusM3: {
            xMinimum: Math.PI * 0.02 ** 3 / 32,
            yMinimum: Math.PI * 0.02 ** 3 / 32,
          },
          radiusOfGyrationM: { principalMinimum: 0.005 },
          polarAreaMomentM4: Math.PI * 0.02 ** 4 / 32,
          torsion: { constantM4: Math.PI * 0.02 ** 4 / 32 },
        },
        engineeringInputs: {
          material: {
            yieldStrengthMpa: 250,
            tensileStrengthMpa: 410,
            elasticModulusGpa: 200,
            source: "+supplier sheet",
          },
          practical: {
            environment: "indoor-dry",
            corrosionAssessment: "conditional",
          },
        },
        engineeringSummary: {
          status: "within-entered-limit",
          outputs: {
            worstUtilization: 0.5,
            eulerFlexuralBucklingForceN: 100_000,
            deflection: { deflectionM: 0.001 },
          },
          warnings: ["=untrusted warning"],
        },
      },
    ],
  });

  assert.match(csv, /"'=malicious"/);
  assert.match(csv, /"'\+danger"/);
  assert.match(csv, /"Area A \(m2\)"/);
  assert.match(csv, /"Entered yield\/Euler screens ≤ 1\.0"/);
  assert.match(csv, /"'\+supplier sheet"/);
  assert.match(csv, /"'=untrusted warning"/);
});

test("export filenames are portable and bounded", () => {
  assert.equal(safeFilename(" Pump Skid / Rev A "), "pump-skid-rev-a");
  assert.equal(safeFilename("🎯"), "ps3d-bom");
  assert.ok(safeFilename("a".repeat(100)).length <= 60);
});
