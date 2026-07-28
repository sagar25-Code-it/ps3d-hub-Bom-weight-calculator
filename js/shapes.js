/**
 * Pure geometric shape registry.
 *
 * All calculation functions in this module accept canonical SI dimensions
 * (metres) and return cubic metres / square metres. The registry intentionally
 * describes manually entered, sharp-corner geometry; it is not a substitute
 * for a designation-specific rolled-section mass table.
 */

const CROSS = "cross";
const LENGTH = "length";

const dim = (key, label, symbol, kind = CROSS) =>
  Object.freeze({ key, label, symbol, kind });

const fieldError = (field, code, message, value) => ({
  field,
  fields: [field],
  code,
  message,
  value,
});

const relationError = (fields, code, message) => ({
  field: fields[0],
  fields,
  code,
  message,
});

const finitePositiveDimensions = (shape, values) => {
  const errors = [];
  for (const definition of shape.dimensions) {
    const value = values?.[definition.key];
    if (value === undefined || value === null || value === "") {
      errors.push(
        fieldError(
          definition.key,
          "REQUIRED",
          `${definition.label} is required.`,
          value,
        ),
      );
    } else if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(
        fieldError(
          definition.key,
          "NOT_FINITE",
          `${definition.label} must be a finite number.`,
          value,
        ),
      );
    } else if (value <= 0) {
      errors.push(
        fieldError(
          definition.key,
          "NOT_POSITIVE",
          `${definition.label} must be greater than zero.`,
          value,
        ),
      );
    }
  }
  return errors;
};

const noRelations = () => [];

const shape = ({
  id,
  name,
  category,
  symbol,
  description,
  dimensions,
  formula,
  calculate,
  validate = noRelations,
  assumptions = [],
}) => {
  const fields = Object.freeze(dimensions);
  return Object.freeze({
    id,
    name,
    category,
    symbol,
    description,
    fields,
    dimensions: fields,
    formula,
    calculate,
    validate,
    assumptions: Object.freeze([
      "Dimensions describe ideal nominal geometry.",
      ...assumptions,
    ]),
  });
};

const parallelFlangeValidation = (values) => {
  const errors = [];
  if (Number.isFinite(values.H) && Number.isFinite(values.TF) && 2 * values.TF >= values.H) {
    errors.push(
      relationError(
        ["TF", "H"],
        "FLANGES_CONSUME_DEPTH",
        "Twice the flange thickness must be less than the total section height.",
      ),
    );
  }
  if (Number.isFinite(values.TW) && Number.isFinite(values.BF) && values.TW > values.BF) {
    errors.push(
      relationError(
        ["TW", "BF"],
        "WEB_EXCEEDS_FLANGE",
        "Web thickness cannot exceed flange width.",
      ),
    );
  }
  return errors;
};

const parallelFlangeGeometry = ({ H, BF, TF, TW, L }) => {
  const areaM2 = 2 * BF * TF + (H - 2 * TF) * TW;
  return { areaM2, volumeM3: areaM2 * L };
};

export const SHAPES = Object.freeze([
  shape({
    id: "round_bar",
    name: "Round Bar",
    category: "Solid Sections",
    symbol: "●",
    description: "Solid circular cross-section bar.",
    dimensions: [
      dim("D", "Diameter", "D"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "A = πD²/4; V = A × L",
    calculate: ({ D, L }) => {
      const areaM2 = (Math.PI / 4) * D * D;
      return { areaM2, volumeM3: areaM2 * L };
    },
  }),
  shape({
    id: "square_bar",
    name: "Square Bar",
    category: "Solid Sections",
    symbol: "■",
    description: "Solid square cross-section bar.",
    dimensions: [
      dim("A", "Side", "A"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = A²; V = Aₛ × L",
    calculate: ({ A, L }) => {
      const areaM2 = A * A;
      return { areaM2, volumeM3: areaM2 * L };
    },
  }),
  shape({
    id: "flat_bar",
    name: "Flat / Rectangular Bar",
    category: "Solid Sections",
    symbol: "▬",
    description: "Solid rectangular cross-section bar.",
    dimensions: [
      dim("W", "Width", "W"),
      dim("T", "Thickness", "T"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "A = W × T; V = A × L",
    calculate: ({ W, T, L }) => {
      const areaM2 = W * T;
      return { areaM2, volumeM3: areaM2 * L };
    },
  }),
  shape({
    id: "hex_bar",
    name: "Hexagonal Bar",
    category: "Solid Sections",
    symbol: "⬡",
    description: "Regular hexagonal bar measured across flats.",
    dimensions: [
      dim("AF", "Across flats", "AF"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "A = √3 × AF²/2; V = A × L",
    calculate: ({ AF, L }) => {
      const areaM2 = (Math.sqrt(3) / 2) * AF * AF;
      return { areaM2, volumeM3: areaM2 * L };
    },
  }),
  shape({
    id: "oct_bar",
    name: "Octagonal Bar",
    category: "Solid Sections",
    symbol: "⯃",
    description: "Regular octagonal bar measured across flats.",
    dimensions: [
      dim("AF", "Across flats", "AF"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "A = 2(√2 − 1)AF²; V = A × L",
    calculate: ({ AF, L }) => {
      const areaM2 = 2 * (Math.SQRT2 - 1) * AF * AF;
      return { areaM2, volumeM3: areaM2 * L };
    },
  }),
  shape({
    id: "rnd_pipe",
    name: "Round Pipe / CHS",
    category: "Hollow Sections",
    symbol: "◎",
    description: "Ideal circular hollow section, pipe, or tube.",
    dimensions: [
      dim("OD", "Outside diameter", "OD"),
      dim("WT", "Wall thickness", "t"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "A = πt(OD − t); V = A × L",
    calculate: ({ OD, WT, L }) => {
      // Stable form of π/4 × [OD² − (OD − 2t)²].
      const areaM2 = Math.PI * WT * (OD - WT);
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ OD, WT }) =>
      Number.isFinite(OD) && Number.isFinite(WT) && 2 * WT >= OD
        ? [
            relationError(
              ["WT", "OD"],
              "WALL_CONSUMES_SECTION",
              "Twice the wall thickness must be less than the outside diameter.",
            ),
          ]
        : [],
    assumptions: ["Corner/profile and manufacturing tolerances are excluded."],
  }),
  shape({
    id: "shs",
    name: "Square Hollow Section (SHS)",
    category: "Hollow Sections",
    symbol: "□",
    description: "Ideal sharp-corner square hollow section.",
    dimensions: [
      dim("A", "Outside side", "A"),
      dim("T", "Wall thickness", "t"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 4t(A − t); V = Aₛ × L",
    calculate: ({ A, T, L }) => {
      // Stable form of A² − (A − 2t)².
      const areaM2 = 4 * T * (A - T);
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ A, T }) =>
      Number.isFinite(A) && Number.isFinite(T) && 2 * T >= A
        ? [
            relationError(
              ["T", "A"],
              "WALL_CONSUMES_SECTION",
              "Twice the wall thickness must be less than the outside side.",
            ),
          ]
        : [],
    assumptions: ["Real SHS corner radii require catalog or measured section area."],
  }),
  shape({
    id: "rhs",
    name: "Rectangular Hollow Section (RHS)",
    category: "Hollow Sections",
    symbol: "▭",
    description: "Ideal sharp-corner rectangular hollow section.",
    dimensions: [
      dim("A", "Outside width", "A"),
      dim("B", "Outside height", "B"),
      dim("T", "Wall thickness", "t"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 2t(A + B − 2t); V = Aₛ × L",
    calculate: ({ A, B, T, L }) => {
      // Stable form of AB − (A − 2t)(B − 2t).
      const areaM2 = 2 * T * (A + B - 2 * T);
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ A, B, T }) =>
      Number.isFinite(A) &&
      Number.isFinite(B) &&
      Number.isFinite(T) &&
      (2 * T >= A || 2 * T >= B)
        ? [
            relationError(
              ["T", "A", "B"],
              "WALL_CONSUMES_SECTION",
              "Twice the wall thickness must be less than both outside dimensions.",
            ),
          ]
        : [],
    assumptions: ["Real RHS corner radii require catalog or measured section area."],
  }),
  shape({
    id: "eq_angle",
    name: "Equal Angle (ISA)",
    category: "Structural Sections",
    symbol: "∟",
    description: "Ideal sharp-corner equal-leg angle.",
    dimensions: [
      dim("A", "Leg length", "A"),
      dim("T", "Thickness", "t"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = t(2A − t); V = Aₛ × L",
    calculate: ({ A, T, L }) => {
      const areaM2 = T * (2 * A - T);
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ A, T }) =>
      Number.isFinite(A) && Number.isFinite(T) && T >= A
        ? [
            relationError(
              ["T", "A"],
              "THICKNESS_EXCEEDS_LEG",
              "Thickness must be less than the leg length.",
            ),
          ]
        : [],
    assumptions: ["Root and toe radii are excluded; use catalog area for rolled ISA."],
  }),
  shape({
    id: "uneq_angle",
    name: "Unequal Angle (ISA)",
    category: "Structural Sections",
    symbol: "⌐",
    description: "Ideal sharp-corner unequal-leg angle.",
    dimensions: [
      dim("A", "Long leg", "A"),
      dim("B", "Short leg", "B"),
      dim("T", "Thickness", "t"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = t(A + B − t); V = Aₛ × L",
    calculate: ({ A, B, T, L }) => {
      const areaM2 = T * (A + B - T);
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ A, B, T }) =>
      Number.isFinite(A) &&
      Number.isFinite(B) &&
      Number.isFinite(T) &&
      (T >= A || T >= B)
        ? [
            relationError(
              ["T", "A", "B"],
              "THICKNESS_EXCEEDS_LEG",
              "Thickness must be less than both leg lengths.",
            ),
          ]
        : [],
    assumptions: ["Root and toe radii are excluded; use catalog area for rolled ISA."],
  }),
  shape({
    id: "t_bar",
    name: "T-Bar / T-Section",
    category: "Structural Sections",
    symbol: "⊤",
    description: "Ideal sharp-corner T-section with total height H.",
    dimensions: [
      dim("BF", "Flange width", "BF"),
      dim("TF", "Flange thickness", "TF"),
      dim("H", "Total height", "H"),
      dim("TW", "Web thickness", "TW"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = BF·TF + (H − TF)TW; V = Aₛ × L",
    calculate: ({ BF, TF, H, TW, L }) => {
      const areaM2 = BF * TF + (H - TF) * TW;
      return { areaM2, volumeM3: areaM2 * L };
    },
    validate: ({ BF, TF, H, TW }) => {
      const errors = [];
      if (Number.isFinite(TF) && Number.isFinite(H) && TF >= H) {
        errors.push(
          relationError(
            ["TF", "H"],
            "FLANGE_CONSUMES_DEPTH",
            "Flange thickness must be less than total height.",
          ),
        );
      }
      if (Number.isFinite(TW) && Number.isFinite(BF) && TW > BF) {
        errors.push(
          relationError(
            ["TW", "BF"],
            "WEB_EXCEEDS_FLANGE",
            "Web thickness cannot exceed flange width.",
          ),
        );
      }
      return errors;
    },
    assumptions: ["Fillets and tapers are excluded."],
  }),
  shape({
    id: "i_beam",
    name: "I-Beam (manual geometry)",
    category: "Structural Sections",
    symbol: "I",
    description: "Ideal parallel-flange I-section; not an IS designation lookup.",
    dimensions: [
      dim("H", "Total height", "H"),
      dim("BF", "Flange width", "BF"),
      dim("TF", "Flange thickness", "TF"),
      dim("TW", "Web thickness", "TW"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 2BF·TF + (H − 2TF)TW; V = Aₛ × L",
    calculate: parallelFlangeGeometry,
    validate: parallelFlangeValidation,
    assumptions: ["Fillets, flange slope, and rolling tolerances are excluded."],
  }),
  shape({
    id: "h_beam",
    name: "H-Beam / Wide Flange (manual geometry)",
    category: "Structural Sections",
    symbol: "H",
    description: "Ideal parallel-flange H-section; not an IS designation lookup.",
    dimensions: [
      dim("H", "Total height", "H"),
      dim("BF", "Flange width", "BF"),
      dim("TF", "Flange thickness", "TF"),
      dim("TW", "Web thickness", "TW"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 2BF·TF + (H − 2TF)TW; V = Aₛ × L",
    calculate: parallelFlangeGeometry,
    validate: parallelFlangeValidation,
    assumptions: ["Fillets, flange slope, and rolling tolerances are excluded."],
  }),
  shape({
    id: "channel",
    name: "Channel (manual geometry)",
    category: "Structural Sections",
    symbol: "C",
    description: "Ideal parallel-flange channel with total height H.",
    dimensions: [
      dim("H", "Total height", "H"),
      dim("BF", "Flange width", "BF"),
      dim("TF", "Flange thickness", "TF"),
      dim("TW", "Web thickness", "TW"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 2BF·TF + (H − 2TF)TW; V = Aₛ × L",
    calculate: parallelFlangeGeometry,
    validate: parallelFlangeValidation,
    assumptions: ["Fillets, flange slope, and rolling tolerances are excluded."],
  }),
  shape({
    id: "z_section",
    name: "Z-Purlin / Z-Section",
    category: "Structural Sections",
    symbol: "Z",
    description: "Ideal equal-flange Z-section with overall height H.",
    dimensions: [
      dim("H", "Overall height", "H"),
      dim("BF", "Flange width", "BF"),
      dim("TF", "Flange thickness", "TF"),
      dim("TW", "Web thickness", "TW"),
      dim("L", "Length", "L", LENGTH),
    ],
    formula: "Aₛ = 2BF·TF + (H − 2TF)TW; V = Aₛ × L",
    calculate: parallelFlangeGeometry,
    validate: parallelFlangeValidation,
    assumptions: ["Bends, lips, corner radii, and cold-forming effects are excluded."],
  }),
  shape({
    id: "flat_plate",
    name: "Flat Plate / Sheet",
    category: "Plates & Sheets",
    symbol: "▰",
    description: "Solid rectangular plate or sheet.",
    dimensions: [
      dim("L", "Plate length", "L"),
      dim("W", "Plate width", "W"),
      dim("T", "Thickness", "T"),
    ],
    formula: "V = L × W × T",
    calculate: ({ L, W, T }) => ({ areaM2: null, volumeM3: L * W * T }),
  }),
  shape({
    id: "circ_plate",
    name: "Circular Plate / Disc",
    category: "Plates & Sheets",
    symbol: "●",
    description: "Solid circular plate or disc.",
    dimensions: [
      dim("D", "Diameter", "D"),
      dim("T", "Thickness", "T"),
    ],
    formula: "V = πD²T/4",
    calculate: ({ D, T }) => ({
      areaM2: null,
      volumeM3: (Math.PI / 4) * D * D * T,
    }),
  }),
  shape({
    id: "ring",
    name: "Ring / Annular Disc",
    category: "Special Shapes",
    symbol: "⊙",
    description: "Ideal annular disc or washer.",
    dimensions: [
      dim("OD", "Outside diameter", "OD"),
      dim("ID", "Inside diameter", "ID"),
      dim("T", "Thickness", "T"),
    ],
    formula: "V = π(OD − ID)(OD + ID)T/4",
    calculate: ({ OD, ID, T }) => ({
      areaM2: null,
      // Factored form avoids subtractive cancellation for thin rings.
      volumeM3: (Math.PI / 4) * (OD - ID) * (OD + ID) * T,
    }),
    validate: ({ OD, ID }) =>
      Number.isFinite(OD) && Number.isFinite(ID) && ID >= OD
        ? [
            relationError(
              ["ID", "OD"],
              "INNER_NOT_SMALLER",
              "Inside diameter must be less than outside diameter.",
            ),
          ]
        : [],
  }),
  shape({
    id: "sphere",
    name: "Solid Sphere / Ball",
    category: "Special Shapes",
    symbol: "●",
    description: "Solid sphere.",
    dimensions: [dim("D", "Diameter", "D")],
    formula: "V = πD³/6",
    calculate: ({ D }) => ({
      areaM2: null,
      volumeM3: (Math.PI / 6) * D * D * D,
    }),
  }),
  shape({
    id: "hol_sphere",
    name: "Hollow Sphere / Shell",
    category: "Special Shapes",
    symbol: "○",
    description: "Ideal hollow spherical shell.",
    dimensions: [
      dim("OD", "Outside diameter", "OD"),
      dim("T", "Wall thickness", "t"),
    ],
    formula: "ID = OD − 2t; V = π(OD − ID)(OD² + OD·ID + ID²)/6",
    calculate: ({ OD, T }) => {
      const ID = OD - 2 * T;
      // Factored difference of cubes is stable for thin shells.
      const volumeM3 =
        (Math.PI / 6) * (OD - ID) * (OD * OD + OD * ID + ID * ID);
      return { areaM2: null, volumeM3 };
    },
    validate: ({ OD, T }) =>
      Number.isFinite(OD) && Number.isFinite(T) && 2 * T >= OD
        ? [
            relationError(
              ["T", "OD"],
              "WALL_CONSUMES_SECTION",
              "Twice the wall thickness must be less than the outside diameter.",
            ),
          ]
        : [],
  }),
  shape({
    id: "cone",
    name: "Solid Cone",
    category: "Special Shapes",
    symbol: "▲",
    description: "Solid right circular cone.",
    dimensions: [
      dim("D", "Base diameter", "D"),
      dim("H", "Height", "H"),
    ],
    formula: "V = πD²H/12",
    calculate: ({ D, H }) => ({
      areaM2: null,
      volumeM3: (Math.PI / 12) * D * D * H,
    }),
  }),
  shape({
    id: "cylinder",
    name: "Solid Cylinder",
    category: "Special Shapes",
    symbol: "●",
    description: "Solid right circular cylinder, puck, or boss.",
    dimensions: [
      dim("D", "Diameter", "D"),
      dim("H", "Height", "H"),
    ],
    formula: "V = πD²H/4",
    calculate: ({ D, H }) => ({
      areaM2: null,
      volumeM3: (Math.PI / 4) * D * D * H,
    }),
  }),
]);

export const SHAPE_CATEGORIES = Object.freeze([
  ...new Set(SHAPES.map(({ category }) => category)),
]);

const SHAPE_BY_ID = new Map(SHAPES.map((entry) => [entry.id, entry]));

export function getShape(id) {
  return SHAPE_BY_ID.get(id) ?? null;
}

export function validateShapeDimensions(shapeOrId, dimensionsM) {
  const selectedShape =
    typeof shapeOrId === "string" ? getShape(shapeOrId) : shapeOrId;
  if (!selectedShape) {
    return [
      {
        field: "shapeId",
        fields: ["shapeId"],
        code: "UNKNOWN_SHAPE",
        message: "Select a supported shape.",
        value: typeof shapeOrId === "string" ? shapeOrId : undefined,
      },
    ];
  }
  return [
    ...finitePositiveDimensions(selectedShape, dimensionsM),
    ...selectedShape.validate(dimensionsM ?? {}),
  ];
}

export function calculateShapeGeometry(shapeOrId, dimensionsM) {
  const selectedShape =
    typeof shapeOrId === "string" ? getShape(shapeOrId) : shapeOrId;
  const errors = validateShapeDimensions(selectedShape ?? shapeOrId, dimensionsM);
  if (!selectedShape || errors.length) {
    return { ok: false, errors };
  }

  let geometry;
  try {
    geometry = selectedShape.calculate(dimensionsM);
  } catch (cause) {
    return {
      ok: false,
      errors: [
        {
          field: "dimensions",
          fields: selectedShape.dimensions.map(({ key }) => key),
          code: "GEOMETRY_ERROR",
          message: "The supplied dimensions could not be evaluated.",
          cause,
        },
      ],
    };
  }

  const { volumeM3, areaM2 = null } = geometry;
  if (
    !Number.isFinite(volumeM3) ||
    volumeM3 <= 0 ||
    (areaM2 !== null && (!Number.isFinite(areaM2) || areaM2 <= 0))
  ) {
    return {
      ok: false,
      errors: [
        {
          field: "dimensions",
          fields: selectedShape.dimensions.map(({ key }) => key),
          code: "INVALID_GEOMETRY",
          message: "Dimensions do not produce a finite positive volume.",
        },
      ],
    };
  }

  const dimensionText = selectedShape.dimensions
    .map(({ key, symbol }) => `${symbol}=${dimensionsM[key]} m`)
    .join(", ");
  const resultText = [
    areaM2 === null ? null : `A=${areaM2} m²`,
    `V=${volumeM3} m³`,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    ok: true,
    errors: [],
    shape: selectedShape,
    normalizedDimensions: { ...dimensionsM },
    volumeM3,
    areaM2,
    formula: selectedShape.formula,
    substitution: `${dimensionText} → ${resultText}`,
    assumptions: [...selectedShape.assumptions],
  };
}
