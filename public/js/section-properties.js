/**
 * Gross geometric section properties for the calculator's idealized shapes.
 *
 * Axes:
 * - z: member/extrusion axis
 * - x: horizontal section axis
 * - y: vertical section axis
 *
 * Canonical units are metres, m², m³, and m⁴. These properties deliberately
 * exclude fillets, corner radii, flange slopes, holes, local buckling, effective
 * widths, residual stress, and designation-specific catalog values.
 */

const PI = Math.PI;
const PROPERTY_EPSILON = 1e-18;

const rectangle = (x, y, width, height, sign = 1) => {
  const unsignedArea = width * height;
  return {
    area: sign * unsignedArea,
    centroidX: x + width / 2,
    centroidY: y + height / 2,
    ixCentroid: sign * width * height ** 3 / 12,
    iyCentroid: sign * height * width ** 3 / 12,
    ixyCentroid: 0,
    boundaryPoints: sign > 0
      ? [
          { x, y },
          { x: x + width, y },
          { x: x + width, y: y + height },
          { x, y: y + height },
        ]
      : [],
  };
};

const circularAnnulus = (
  outsideDiameter,
  insideDiameter = 0,
  wallThickness = null,
) => {
  const outsideRadius = outsideDiameter / 2;
  const insideRadius = insideDiameter / 2;
  const diameterSquareDifference = wallThickness === null
    ? (outsideDiameter - insideDiameter) * (outsideDiameter + insideDiameter)
    : 4 * wallThickness * (outsideDiameter - wallThickness);
  const diameterFourthDifference = wallThickness === null
    ? diameterSquareDifference
      * (outsideDiameter * outsideDiameter + insideDiameter * insideDiameter)
    : 4
      * wallThickness
      * (outsideDiameter - wallThickness)
      * (outsideDiameter * outsideDiameter + insideDiameter * insideDiameter);
  const area = PI * diameterSquareDifference / 4;
  const inertia = PI * diameterFourthDifference / 64;
  return {
    area,
    centroidX: 0,
    centroidY: 0,
    ixCentroid: inertia,
    iyCentroid: inertia,
    ixyCentroid: 0,
    boundaryPoints: [
      { x: outsideRadius, y: 0 },
      { x: -outsideRadius, y: 0 },
      { x: 0, y: outsideRadius },
      { x: 0, y: -outsideRadius },
    ],
    circularBoundaryRadius: outsideRadius,
    insideRadius,
  };
};

const regularPolygon = (sides, acrossFlats, startAngle = 0) => {
  const apothem = acrossFlats / 2;
  const radius = apothem / Math.cos(PI / sides);
  const vertices = Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + 2 * PI * index / sides;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });

  let twiceArea = 0;
  let centroidXNumerator = 0;
  let centroidYNumerator = 0;
  let ixOriginNumerator = 0;
  let iyOriginNumerator = 0;
  let ixyOriginNumerator = 0;

  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidXNumerator += (current.x + next.x) * cross;
    centroidYNumerator += (current.y + next.y) * cross;
    ixOriginNumerator +=
      (current.y * current.y + current.y * next.y + next.y * next.y) * cross;
    iyOriginNumerator +=
      (current.x * current.x + current.x * next.x + next.x * next.x) * cross;
    ixyOriginNumerator +=
      (
        2 * current.x * current.y
        + current.x * next.y
        + next.x * current.y
        + 2 * next.x * next.y
      ) * cross;
  }

  const area = twiceArea / 2;
  const centroidX = centroidXNumerator / (3 * twiceArea);
  const centroidY = centroidYNumerator / (3 * twiceArea);
  const ixOrigin = ixOriginNumerator / 12;
  const iyOrigin = iyOriginNumerator / 12;
  const ixyOrigin = ixyOriginNumerator / 24;

  return {
    area,
    centroidX,
    centroidY,
    ixCentroid: ixOrigin - area * centroidY * centroidY,
    iyCentroid: iyOrigin - area * centroidX * centroidX,
    ixyCentroid: ixyOrigin - area * centroidX * centroidY,
    boundaryPoints: vertices,
    apothem,
    circumradius: radius,
  };
};

function rectangleTorsionConstant(width, height) {
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  let series = 0;
  for (let odd = 1; odd <= 199; odd += 2) {
    series += Math.tanh(odd * PI * longSide / (2 * shortSide)) / odd ** 5;
  }
  return longSide * shortSide ** 3 / 3
    * (1 - 192 * shortSide * series / (PI ** 5 * longSide));
}

function closedRectangleTorsion(width, height, thickness) {
  const medianWidth = width - thickness;
  const medianHeight = height - thickness;
  const medianArea = medianWidth * medianHeight;
  const constant =
    2 * thickness * medianWidth ** 2 * medianHeight ** 2
    / (medianWidth + medianHeight);
  return {
    constant,
    medianArea,
    shearModulus: 2 * medianArea * thickness,
    wallRatio: thickness / Math.min(width, height),
  };
}

function boundsFromPoints(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
}

function unavailable(shapeId, note) {
  return Object.freeze({
    available: false,
    shapeId,
    applicability: "not-applicable",
    confidence: "not-applicable",
    note,
    assumptions: Object.freeze([note]),
    warnings: Object.freeze([]),
  });
}

function finalizeSection({
  shapeId,
  model,
  components,
  memberLengthM = null,
  memberAxis = null,
  applicability = "prismatic",
  confidence = "exact-sharp-corner",
  torsion = null,
  assumptions = [],
  warnings = [],
  capabilities = {},
  circularBoundaryRadius = null,
}) {
  const areaM2 = components.reduce((sum, component) => sum + component.area, 0);
  if (!Number.isFinite(areaM2) || areaM2 <= PROPERTY_EPSILON) {
    return unavailable(shapeId, "The section geometry does not produce a positive gross area.");
  }

  const centroidX = components.reduce(
    (sum, component) => sum + component.area * component.centroidX,
    0,
  ) / areaM2;
  const centroidY = components.reduce(
    (sum, component) => sum + component.area * component.centroidY,
    0,
  ) / areaM2;

  const ixM4 = components.reduce(
    (sum, component) =>
      sum
      + component.ixCentroid
      + component.area * (component.centroidY - centroidY) ** 2,
    0,
  );
  const iyM4 = components.reduce(
    (sum, component) =>
      sum
      + component.iyCentroid
      + component.area * (component.centroidX - centroidX) ** 2,
    0,
  );
  const ixyM4 = components.reduce(
    (sum, component) =>
      sum
      + component.ixyCentroid
      + component.area
        * (component.centroidX - centroidX)
        * (component.centroidY - centroidY),
    0,
  );

  const boundaryPointsM = components.flatMap((component) => component.boundaryPoints);
  const boundsM = boundsFromPoints(boundaryPointsM);
  const topDistance = boundsM.maxY - centroidY;
  const bottomDistance = centroidY - boundsM.minY;
  const rightDistance = boundsM.maxX - centroidX;
  const leftDistance = centroidX - boundsM.minX;

  const averageInertia = (ixM4 + iyM4) / 2;
  const principalRadius = Math.hypot((ixM4 - iyM4) / 2, ixyM4);
  const iPrincipalMaxM4 = averageInertia + principalRadius;
  const iPrincipalMinM4 = averageInertia - principalRadius;
  const principalAngleRad = 0.5 * Math.atan2(-2 * ixyM4, ixM4 - iyM4);

  const elasticSectionModulusM3 = {
    xPositive: ixM4 / topDistance,
    xNegative: ixM4 / bottomDistance,
    yPositive: iyM4 / rightDistance,
    yNegative: iyM4 / leftDistance,
  };
  elasticSectionModulusM3.xMinimum = Math.min(
    elasticSectionModulusM3.xPositive,
    elasticSectionModulusM3.xNegative,
  );
  elasticSectionModulusM3.yMinimum = Math.min(
    elasticSectionModulusM3.yPositive,
    elasticSectionModulusM3.yNegative,
  );

  const radiusOfGyrationM = {
    x: Math.sqrt(ixM4 / areaM2),
    y: Math.sqrt(iyM4 / areaM2),
    principalMaximum: Math.sqrt(iPrincipalMaxM4 / areaM2),
    principalMinimum: Math.sqrt(iPrincipalMinM4 / areaM2),
  };

  const openAsymmetric = Math.abs(ixyM4) > Math.max(ixM4, iyM4) * 1e-12;
  const finalWarnings = [
    ...warnings,
    ...(openAsymmetric
      ? [
          "The geometric x/y axes are not principal axes. Global-axis section moduli alone are not an unsymmetric-bending solution.",
        ]
      : []),
  ];

  return Object.freeze({
    available: true,
    shapeId,
    model,
    applicability,
    confidence,
    memberAxis,
    memberLengthM,
    areaM2,
    centroidM: Object.freeze({ x: centroidX, y: centroidY }),
    boundsM: Object.freeze(boundsM),
    inertiaM4: Object.freeze({
      x: ixM4,
      y: iyM4,
      xy: ixyM4,
      principalMaximum: iPrincipalMaxM4,
      principalMinimum: iPrincipalMinM4,
      principalAngleRad,
    }),
    elasticSectionModulusM3: Object.freeze(elasticSectionModulusM3),
    radiusOfGyrationM: Object.freeze(radiusOfGyrationM),
    polarAreaMomentM4: ixM4 + iyM4,
    torsion: torsion
      ? Object.freeze({
          constantM4: torsion.constantM4,
          method: torsion.method,
          note: torsion.note,
          shearRadiusM: torsion.shearRadiusM ?? null,
          shearModulusM3: torsion.shearModulusM3 ?? null,
        })
      : Object.freeze({
          constantM4: null,
          method: null,
          note: "Saint-Venant torsion constant is not evaluated for this shape.",
          shearRadiusM: null,
          shearModulusM3: null,
        }),
    capabilities: Object.freeze({
      axial: applicability === "prismatic",
      bending: applicability === "prismatic",
      eulerBuckling: applicability === "prismatic",
      torsion: Boolean(torsion?.constantM4),
      ...capabilities,
    }),
    circularBoundaryRadius,
    boundaryPointsM: Object.freeze(
      boundaryPointsM.map((point) =>
        Object.freeze({ x: point.x - centroidX, y: point.y - centroidY })),
    ),
    assumptions: Object.freeze([...assumptions]),
    warnings: Object.freeze(finalWarnings),
  });
}

function circularSection(shapeId, diameter, memberLengthM, {
  insideDiameter = 0,
  wallThickness = null,
  model,
  applicability = "prismatic",
  memberAxis,
  assumptions = [],
  capabilities = {},
} = {}) {
  const component = circularAnnulus(diameter, insideDiameter, wallThickness);
  const constantM4 = 2 * component.ixCentroid;
  return finalizeSection({
    shapeId,
    model,
    components: [component],
    memberLengthM,
    memberAxis,
    applicability,
    confidence: "exact-analytic",
    torsion: {
      constantM4,
      method: "exact-circular",
      note: "For a circular section, the Saint-Venant torsion constant equals the polar area moment.",
      shearRadiusM: diameter / 2,
    },
    assumptions,
    capabilities,
    circularBoundaryRadius: diameter / 2,
  });
}

function rectangularSection(shapeId, width, height, memberLengthM, {
  model,
  applicability = "prismatic",
  memberAxis,
  assumptions = [],
  capabilities = {},
} = {}) {
  return finalizeSection({
    shapeId,
    model,
    components: [rectangle(0, 0, width, height)],
    memberLengthM,
    memberAxis,
    applicability,
    confidence: "exact-analytic",
    torsion: {
      constantM4: rectangleTorsionConstant(width, height),
      method: "analytic-series",
      note: "Saint-Venant torsion constant from the convergent solid-rectangle series; it is not Ix + Iy.",
    },
    assumptions,
    capabilities,
  });
}

function hollowRectangleSection(shapeId, width, height, thickness, memberLengthM, {
  model,
  memberAxis = "L",
  assumptions = [],
} = {}) {
  const insideWidth = width - 2 * thickness;
  const insideHeight = height - 2 * thickness;
  const torsion = closedRectangleTorsion(width, height, thickness);
  const warnings = torsion.wallRatio > 0.1
    ? [
        "Jt uses a uniform thin-wall closed-section approximation; wall thickness exceeds 10% of the smaller outside dimension.",
      ]
    : [];
  return finalizeSection({
    shapeId,
    model,
    components: [
      rectangle(0, 0, width, height),
      rectangle(thickness, thickness, insideWidth, insideHeight, -1),
    ],
    memberLengthM,
    memberAxis,
    confidence: "exact-sharp-corner",
    torsion: {
      constantM4: torsion.constant,
      method: "thin-wall-closed",
      note: "Uniform-wall Bredt approximation about the wall median line; corner radii and thick-wall effects are excluded.",
      shearModulusM3: torsion.shearModulus,
    },
    assumptions,
    warnings,
  });
}

function openSectionTorsion(constantM4) {
  return {
    constantM4,
    method: "thin-wall-open",
    note: "Open-section Jt ≈ Σ(l·t³/3). Junction, warping, shear-centre, and restrained-torsion effects are excluded.",
  };
}

/**
 * Calculate ideal gross section properties from already-normalized SI geometry.
 */
export function calculateSectionProperties(shapeId, dimensionsM = {}) {
  const d = dimensionsM;
  switch (shapeId) {
    case "round_bar":
      return circularSection(shapeId, d.D, d.L, {
        model: "Solid circular section",
        memberAxis: "L",
      });

    case "square_bar":
      return rectangularSection(shapeId, d.A, d.A, d.L, {
        model: "Solid square section",
        memberAxis: "L",
      });

    case "flat_bar":
      return rectangularSection(shapeId, d.W, d.T, d.L, {
        model: "Solid rectangular section",
        memberAxis: "L",
      });

    case "hex_bar": {
      const polygon = regularPolygon(6, d.AF, 0);
      return finalizeSection({
        shapeId,
        model: "Regular hexagon, horizontal top/bottom flats",
        components: [polygon],
        memberLengthM: d.L,
        memberAxis: "L",
        confidence: "exact-analytic",
        assumptions: [
          "Across-flats dimension is oriented vertically; rotating the bar changes extreme-fibre distances but not area or inertia.",
        ],
        warnings: [
          "Saint-Venant torsion constant is not evaluated; the polar area moment must not be substituted for Jt.",
        ],
      });
    }

    case "oct_bar": {
      const polygon = regularPolygon(8, d.AF, PI / 8);
      return finalizeSection({
        shapeId,
        model: "Regular octagon, horizontal/vertical flats",
        components: [polygon],
        memberLengthM: d.L,
        memberAxis: "L",
        confidence: "exact-analytic",
        warnings: [
          "Saint-Venant torsion constant is not evaluated; the polar area moment must not be substituted for Jt.",
        ],
      });
    }

    case "rnd_pipe": {
      const insideDiameter = d.OD - 2 * d.WT;
      return circularSection(shapeId, d.OD, d.L, {
        insideDiameter,
        wallThickness: d.WT,
        model: "Ideal circular annulus",
        memberAxis: "L",
        assumptions: [
          "Nominal concentric circular walls are assumed; ovality and manufacturing tolerance are excluded.",
        ],
      });
    }

    case "shs":
      return hollowRectangleSection(shapeId, d.A, d.A, d.T, d.L, {
        model: "Sharp-corner square hollow section",
        assumptions: [
          "Real SHS corner radii and flat-width tolerances require a catalog or measured section.",
        ],
      });

    case "rhs":
      return hollowRectangleSection(shapeId, d.A, d.B, d.T, d.L, {
        model: "Sharp-corner rectangular hollow section",
        assumptions: [
          "Real RHS corner radii and flat-width tolerances require a catalog or measured section.",
        ],
      });

    case "eq_angle":
      return finalizeSection({
        shapeId,
        model: "Sharp-corner equal angle",
        components: [
          rectangle(0, 0, d.T, d.A),
          rectangle(d.T, 0, d.A - d.T, d.T),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion((2 * d.A - d.T) * d.T ** 3 / 3),
        assumptions: ["Root/toe radii and rolled-section tolerances are excluded."],
        warnings: [
          "Angle compression and bending can be flexural-torsional and eccentric; gross geometric screening is not a code member check.",
        ],
        capabilities: { eulerBuckling: "flexural-only-screen" },
      });

    case "uneq_angle":
      return finalizeSection({
        shapeId,
        model: "Sharp-corner unequal angle",
        components: [
          rectangle(0, 0, d.T, d.A),
          rectangle(d.T, 0, d.B - d.T, d.T),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion((d.A + d.B - d.T) * d.T ** 3 / 3),
        assumptions: ["The long leg is vertical and the short leg is horizontal."],
        warnings: [
          "Unequal-angle compression and bending can be flexural-torsional and eccentric; gross geometric screening is not a code member check.",
        ],
        capabilities: { eulerBuckling: "flexural-only-screen" },
      });

    case "t_bar":
      return finalizeSection({
        shapeId,
        model: "Sharp-corner T section",
        components: [
          rectangle(0, d.H - d.TF, d.BF, d.TF),
          rectangle((d.BF - d.TW) / 2, 0, d.TW, d.H - d.TF),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion(
          (d.BF * d.TF ** 3 + (d.H - d.TF / 2) * d.TW ** 3) / 3,
        ),
        assumptions: ["Fillets, tapers, and designation-specific geometry are excluded."],
        warnings: [
          "The centroid and shear centre differ; flexural-torsional and lateral-torsional buckling are not evaluated.",
        ],
        capabilities: { eulerBuckling: "flexural-only-screen" },
      });

    case "i_beam":
    case "h_beam":
      return finalizeSection({
        shapeId,
        model: "Ideal parallel-flange doubly symmetric section",
        components: [
          rectangle(0, 0, d.BF, d.TF),
          rectangle((d.BF - d.TW) / 2, d.TF, d.TW, d.H - 2 * d.TF),
          rectangle(0, d.H - d.TF, d.BF, d.TF),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion(
          (2 * d.BF * d.TF ** 3 + (d.H - d.TF) * d.TW ** 3) / 3,
        ),
        assumptions: ["Fillets, flange slope, and rolling tolerances are excluded."],
        warnings: [
          "Local buckling, lateral-torsional buckling, unbraced length, moment gradient, and warping constant Cw are not evaluated.",
        ],
        capabilities: { eulerBuckling: true },
      });

    case "channel":
      return finalizeSection({
        shapeId,
        model: "Ideal parallel-flange channel",
        components: [
          rectangle(0, 0, d.BF, d.TF),
          rectangle(0, d.TF, d.TW, d.H - 2 * d.TF),
          rectangle(0, d.H - d.TF, d.BF, d.TF),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion(
          (2 * d.BF * d.TF ** 3 + (d.H - d.TF) * d.TW ** 3) / 3,
        ),
        assumptions: ["Fillets, flange slope, and rolling tolerances are excluded."],
        warnings: [
          "The channel shear centre lies outside the section; loading through the centroid can introduce torsion.",
          "Flexural-torsional and lateral-torsional buckling are not evaluated.",
        ],
        capabilities: { eulerBuckling: "flexural-only-screen" },
      });

    case "z_section":
      return finalizeSection({
        shapeId,
        model: "Point-symmetric equal-flange Z section",
        components: [
          rectangle(-d.BF + d.TW / 2, 0, d.BF, d.TF),
          rectangle(-d.TW / 2, d.TF, d.TW, d.H - 2 * d.TF),
          rectangle(-d.TW / 2, d.H - d.TF, d.BF, d.TF),
        ],
        memberLengthM: d.L,
        memberAxis: "L",
        torsion: openSectionTorsion(
          (2 * d.BF * d.TF ** 3 + (d.H - d.TF) * d.TW ** 3) / 3,
        ),
        assumptions: [
          "Top flange extends right and bottom flange extends left from the web; lips, bends, radii, and cold-forming effects are excluded.",
        ],
        warnings: [
          "Geometric axes are not principal axes. Local, distortional, flexural-torsional, and lateral-torsional buckling are not evaluated.",
        ],
        capabilities: { eulerBuckling: "flexural-only-screen" },
      });

    case "flat_plate":
      return rectangularSection(shapeId, d.W, d.T, d.L, {
        model: "Plate treated as a W × T beam section along L",
        memberAxis: "L",
        assumptions: [
          "This interpretation treats the plate length L as a one-dimensional member axis.",
        ],
        capabilities: { plateBending: false },
      });

    case "circ_plate":
      return circularSection(shapeId, d.D, d.T, {
        model: "Circular face about an axis through thickness",
        memberAxis: "T",
        applicability: "reference-face",
        assumptions: [
          "These are circular-face properties about the thickness axis, not transverse plate-bending properties.",
        ],
        capabilities: { axial: false, bending: false, eulerBuckling: false, torsion: false },
      });

    case "ring":
      return circularSection(shapeId, d.OD, d.T, {
        insideDiameter: d.ID,
        model: "Annular face about an axis through thickness",
        memberAxis: "T",
        applicability: "reference-face",
        assumptions: [
          "These are annular-face properties about the thickness axis, not transverse plate-bending properties.",
        ],
        capabilities: { axial: false, bending: false, eulerBuckling: false, torsion: false },
      });

    case "cylinder":
      return circularSection(shapeId, d.D, d.H, {
        model: "Solid circular section along cylinder height",
        memberAxis: "H",
      });

    case "sphere":
    case "hol_sphere":
      return unavailable(
        shapeId,
        "A sphere has no single constant prismatic cross-section; section properties vary by cutting plane.",
      );

    case "cone":
      return unavailable(
        shapeId,
        "A cone has a variable circular section; a single global beam-section property would be misleading.",
      );

    default:
      return unavailable(shapeId, "No section-property model is available for this geometry.");
  }
}
