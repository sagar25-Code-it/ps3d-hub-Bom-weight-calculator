/**
 * Normalized material registry.
 *
 * IMPORTANT: densityKgM3 values are indicative planning values. A grade,
 * classification, product, or test standard is never presented as a density
 * certificate. For design, purchasing, or conformity work, use the applicable
 * product form/condition and supplier MTC, datasheet, test result, or measured
 * batch density.
 */

export const MATERIAL_REFERENCE_STATUSES = Object.freeze({
  GRADE_REFERENCE: "grade-reference",
  PRODUCT_FORM_LIMITED: "product-form-limited",
  GENERAL_REFERENCE: "general-reference",
  CLASSIFICATION_ONLY: "classification-only",
  TEST_METHOD_ONLY: "test-method-only",
  CITATION_REMOVED: "citation-removed",
  UNVERIFIED: "unverified",
  MOISTURE_DEPENDENT: "moisture-dependent",
  MIX_DEPENDENT: "mix-dependent",
});

export const AUTHORITATIVE_SOURCES = Object.freeze({
  BIS_IS_808_2021: Object.freeze({
    title: "IS 808:2021 — Hot Rolled Steel Beam, Column, Channel and Angle Sections",
    url: "https://www.services.bis.gov.in/tmp/tbl5_2024-11-11-05-24.pdf",
    role: "Designation dimensions, nominal mass, tolerances, and sectional properties.",
  }),
  BIS_IS_2062: Object.freeze({
    title: "IS 2062 structural steel product specification",
    url: "https://www.services.bis.gov.in/tmp/SR2062.pdf",
    role: "Grade/product reference; not a universal density certificate.",
  }),
  BIS_IS_1786: Object.freeze({
    title: "IS 1786 high-strength deformed steel bars and wires",
    url: "https://services.bis.gov.in/tmp/SR1786.pdf",
    role: "Reinforcement grade and nominal product requirements.",
  }),
  BIS_IS_1786_NOMINAL_MASS: Object.freeze({
    title: "BIS LIMS — IS 1786 nominal mass test",
    url: "https://lims.bis.gov.in/home/search_is_number/?is_number__doc_no=1786",
    role: "Nominal mass conformity context for reinforcement.",
  }),
  BIS_IS_513_PART_1_2016: Object.freeze({
    title: "IS 513 Part 1:2016 — Cold reduced carbon steel sheet and strip",
    url: "https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=IS+513+%3A+Part+1&id=22164",
    role: "Current product/grade reference used for CR entries.",
  }),
  BIS_IS_6603_2024: Object.freeze({
    title: "IS 6603:2024 — Stainless steel product standard revision",
    url: "https://services.bis.gov.in/tmp/Circular_A47X_2024-07-24.pdf",
    role: "Current product-form-limited stainless grade reference.",
  }),
  NIST_MASS_AND_WEIGHT: Object.freeze({
    title: "NIST — SI units of mass",
    url: "https://www.nist.gov/pml/owm/si-units-mass",
    role: "Distinguishes mass from force and confirms lowercase t for tonne.",
  }),
  ASTM_E8_E8M_2025: Object.freeze({
    title: "ASTM E8/E8M-25 — Tension Testing of Metallic Materials",
    url: "https://store.astm.org/e0008_e0008m-25.html",
    role:
      "Metallic tensile test method for defined specimens and test conditions. It does not assign grade-property values or guarantee whole-product or in-service performance.",
  }),
  ASTM_E111_2025: Object.freeze({
    title: "ASTM E111-17(2025)e1 — Young's, Tangent, and Chord Modulus",
    url: "https://store.astm.org/standards/e111",
    role:
      "Modulus test method whose applicability depends on loading mode, orientation, temperature, stress range, and specimen history. It is not a source of a universal modulus for a material name.",
  }),
  ASTM_E18_2025: Object.freeze({
    title: "ASTM E18-25 — Rockwell Hardness of Metallic Materials",
    url: "https://store.astm.org/standards/e18",
    role:
      "Empirical local indentation test method for specified Rockwell scales and test conditions. A result is not a universal tensile-strength conversion or proof of whole-part characteristics.",
  }),
  ISO_12944_2_2017: Object.freeze({
    title: "ISO 12944-2:2017 — Classification of Corrosive Environments",
    url: "https://www.iso.org/standard/64834.html",
    role:
      "Gross environmental-corrosivity screening for protective paint-system selection on steel structures. It is not a universal alloy corrosion rating, compatibility decision, or coating-life prediction.",
  }),
  AISC_360_2022: Object.freeze({
    title: "ANSI/AISC 360-22 — Specification for Structural Steel Buildings",
    url: "https://www.aisc.org/aisc/publications/current-standards/aisc-360/",
    role:
      "Structural-steel building design and construction applicability reference for LRFD/ASD. It supports gross code-scope screening only and is not a material certificate or standalone member-capacity result.",
  }),
  ASTM_D2000: Object.freeze({
    title: "ASTM D2000 — Rubber classification system",
    url: "https://store.astm.org/standards/d2000",
    role: "Classification only; not a single FKM density source.",
  }),
  ASTM_D3039: Object.freeze({
    title: "ASTM D3039/D3039M — Polymer matrix composite tensile test",
    url: "https://store.astm.org/d3039_d3039m-17r25.html",
    role: "Test method only; not a CFRP density source.",
  }),
  ASTM_D4020: Object.freeze({
    title: "ASTM D4020 — UHMWPE test/classification standard",
    url: "https://store.astm.org/d4020-00a.html",
    role: "Does not provide generic engineering design density.",
  }),
  SPECIAL_METALS_INCONEL_625: Object.freeze({
    title: "Special Metals — INCONEL alloy 625 technical bulletin",
    url: "https://www.specialmetals.com/documents/technical-bulletins/inconel/inconel-alloy-625.pdf",
    role: "Manufacturer typical property reference.",
  }),
  OUTOKUMPU_STAINLESS: Object.freeze({
    title: "Outokumpu Supra stainless range datasheet",
    url: "https://www.outokumpu.com/-/media/files/products/supra/outokumpu-supra-range-datasheet.pdf",
    role: "Manufacturer typical density reference; grade and edition dependent.",
  }),
  USDA_WOOD_HANDBOOK: Object.freeze({
    title: "USDA Forest Products Laboratory — Wood Handbook",
    url: "https://www.fpl.fs.usda.gov/documnts/fplgtr/fplgtr282/fpl_gtr282.pdf",
    role: "Wood density and moisture dependence reference.",
  }),
  BIS_IS_287_WOOD_MOISTURE: Object.freeze({
    title: "BIS IS 287 — Maximum permissible moisture content of timber",
    url: "https://services.bis.gov.in/php/BIS_2.0/bisconnect/standard_review/Standard_review/Isdetails?ID=OTM5Mw%3D%3D",
    role: "Moisture-condition context for timber values.",
  }),
});

// Array contract for UI rendering; keyed metadata remains available above.
export const PRIMARY_SOURCES = Object.freeze(
  Object.values(AUTHORITATIVE_SOURCES),
);

const METAL_NOTE =
  "Indicative room-temperature density for preliminary theoretical mass only; verify alloy, product form, condition/temper, temperature, and supplier/MTC data. The grade/product reference does not certify this density.";
const POLYMER_NOTE =
  "Indicative unfilled-material density only; formulation, fillers, reinforcement, plasticizer, moisture, and temperature can materially change density. Verify the supplier grade datasheet or a measured batch value.";
const RUBBER_NOTE =
  "Indicative compound density only; elastomer formulation, fillers, cure system, and hardness can materially change density. Verify the actual compound datasheet or test value.";
const WOOD_NOTE =
  "Indicative planning value only; species, origin, grade, moisture content, and treatment materially affect density. Record moisture condition and verify the actual stock.";
const COMPOSITE_NOTE =
  "Indicative laminate/composite density only; fibre/resin system, fibre fraction, lay-up, core, and void content materially affect density. Verify the manufactured laminate specification.";
const GLASS_NOTE =
  "Indicative glass density only; composition, interlayers, coatings, and product construction must be verified from the product datasheet.";
const CONCRETE_NOTE =
  "Indicative normal-weight concrete density only; strength grade does not define density. Verify mix design, aggregate, moisture, reinforcement, and applicable dead-load basis.";

const material = (
  id,
  category,
  name,
  densityKgM3,
  gradeReference,
  referenceStatus,
  note,
) =>
  Object.freeze({
    id,
    category,
    name,
    densityKgM3,
    gradeReference,
    referenceStatus,
    note,
  });

const group = (
  category,
  defaultReference,
  entries,
  {
    referenceStatus = MATERIAL_REFERENCE_STATUSES.GRADE_REFERENCE,
    note = METAL_NOTE,
  } = {},
) =>
  entries.map(
    ([
      id,
      name,
      densityKgM3,
      gradeReference = defaultReference,
      entryStatus = referenceStatus,
      entryNote = note,
    ]) =>
      material(
        id,
        category,
        name,
        densityKgM3,
        gradeReference,
        entryStatus,
        entryNote,
      ),
  );

export const MATERIALS = Object.freeze([
  ...group("Structural Steel", "IS 2062:2011", [
    ["e250a", "E250A / Fe410WA", 7850],
    ["e250b", "E250B / Fe410WB", 7850],
    ["e250c", "E250C / Fe410WC", 7850],
    ["e300", "E300 / Fe440", 7850],
    ["e350", "E350 / Fe490", 7850],
    ["e410", "E410 / Fe540", 7850],
    ["e450", "E450A / Fe590", 7850],
    ["e550", "E550 / Fe660", 7850],
    ["ms-gen", "MS — Mild Steel (General Purpose)", 7850],
  ]),
  ...group("Carbon Steel", "IS 1570 Part 1", [
    ["c10", "C10 / 080M10", 7840],
    ["c15", "C15 / 080M15", 7840],
    ["c20", "C20", 7840],
    ["c25", "C25 / C25Mn75", 7840],
    ["c30", "C30 / 080M30", 7840],
    ["c35", "C35 / 080M36", 7840],
    ["c40", "C40 / 080M40", 7840],
    ["c45", "C45 / 080M46", 7840],
    ["c50", "C50 / 080M50", 7840],
    ["c55", "C55 / 070M55", 7840],
    ["c60", "C60 / 080M60", 7840],
  ]),
  ...group("Alloy Steel", "IS 1570 Part 2", [
    ["40cr4", "40Cr4 / EN18 / SCr440", 7850],
    ["40cr4mo2", "40Cr4Mo2 / EN19 / SCM440", 7850],
    ["40ni3", "40Ni3 / EN22 / SNC236", 7850],
    ["40ni2cr1", "40Ni2Cr1Mo28 / EN24 / 817M40", 7850],
    ["16ni3cr2", "16Ni3Cr2 / EN36 (case hardening)", 7850],
    ["35mn6mo3", "35Mn6Mo3", 7850],
  ]),
  ...group("TMT / Rebar Steel", "IS 1786:2008", [
    ["fe415", "Fe415 — HYSD Bar", 7850],
    ["fe415d", "Fe415D — HYSD Bar", 7850],
    ["fe500", "Fe500 — TMT Bar", 7850],
    ["fe500d", "Fe500D — TMT Bar (seismic)", 7850],
    ["fe550", "Fe550 — TMT Bar", 7850],
    ["fe550d", "Fe550D — TMT Bar (seismic)", 7850],
    ["fe600", "Fe600 — TMT Bar", 7850],
  ]),
  ...group("EN-Series Steel", "BS 970 grade reference", [
    ["en8", "EN8 / 080M40 (approximately C45)", 7850],
    ["en9", "EN9 / 070M55 (approximately C55)", 7850],
    ["en31", "EN31 / 535A99 (100Cr6) — Bearing Steel", 7830],
  ]),
  ...group("Spring Steel", "IS 3195", [
    ["sp55si7", "55Si7 — Silico-Manganese", 7850],
    ["sp65si7", "65Si7 — Silico-Manganese", 7850],
    ["sp50cr4v2", "50Cr4V2 — Chrome-Vanadium", 7850],
  ]),
  ...group("Tool Steel", "ASTM A681 grade reference", [
    ["ts-o1", "O1 — Oil-Hardening", 7870],
    ["ts-d2", "D2 — High-Chromium", 7700],
    ["ts-h13", "H13 — Cr-Mo-V Hot-Work", 7800],
  ]),
  ...group("Cold Rolled Steel", "IS 513 Part 1:2016", [
    ["cr1", "CR1 — Commercial Quality", 7850],
    ["cr2", "CR2 — Drawing Quality", 7850],
    ["cr3", "CR3 — Deep Drawing", 7850],
    ["cr4", "CR4 — Extra Deep Drawing", 7850],
    ["cr5", "CR5 — Special Deep Drawing", 7850],
  ]),
  ...group(
    "Galvanized Steel",
    "IS 277 product reference",
    [
      ["gp", "GP Sheet — Galvanized Plain", 7850],
      ["gc", "GC Sheet — Galvanized Corrugated", 7850],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED,
      note:
        "7850 kg/m³ represents indicative base-steel density only. Add zinc coating mass from the specified coating class; corrugated sheet also requires developed/profile length. IS 277 is not a density certificate.",
    },
  ),
  ...group("Electrical Steel", "IS 649 product reference", [
    ["crgo", "CRGO — Grain-Oriented", 7650],
    ["crngo", "CRNGO — Non-Grain-Oriented", 7700],
  ]),
  ...group(
    "Stainless Steel",
    "IS 6603:2024 (applicable product forms only)",
    [
      ["ss201", "SS 201", 7920],
      ["ss202", "SS 202", 7920],
      ["ss304", "SS 304 / 04Cr18Ni10 (1.4301)", 7930],
      ["ss304l", "SS 304L / 02Cr18Ni10 (1.4306)", 7930],
      ["ss316", "SS 316 / 04Cr17Ni12Mo2 (1.4401)", 7980],
      ["ss316l", "SS 316L / 02Cr17Ni12Mo2 (1.4404)", 7980],
      ["ss321", "SS 321 / 04Cr18Ni10Ti (1.4541)", 7930],
      ["ss347", "SS 347 / 08Cr19Ni10Nb", 7980],
      ["ss410", "SS 410 / 12Cr13 (1.4006)", 7750],
      ["ss420", "SS 420 / 20Cr13 (1.4021)", 7750],
      ["ss430", "SS 430 / 10Cr17 (1.4016)", 7720],
      ["ss431", "SS 431 / 16Cr12Ni2 (1.4057)", 7750],
      ["ss630", "SS 630 / 17-4 PH (1.4548)", 7780],
      ["ss904l", "SS 904L / 1.4539", 7980],
    ],
    { referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED },
  ),
  ...group("Grey Cast Iron", "IS 210:2009", [
    ["fg150", "FG 150", 7100],
    ["fg200", "FG 200", 7150],
    ["fg260", "FG 260", 7200],
    ["fg300", "FG 300", 7200],
    ["fg350", "FG 350", 7250],
    ["fg400", "FG 400", 7300],
  ]),
  ...group("Malleable Cast Iron", "IS 2107 grade reference", [
    ["bm300", "BM 300 — Blackheart", 7200],
    ["bm350", "BM 350 — Blackheart", 7200],
    ["pm350", "PM 350 — Pearlitic", 7300],
    ["pm450", "PM 450 — Pearlitic", 7300],
    ["pm550", "PM 550 — Pearlitic", 7300],
  ]),
  ...group("SG / Ductile Iron", "IS 1865 grade reference", [
    ["sg400", "SG 400-12 / GJS-400-15", 7100],
    ["sg500", "SG 500-7 / GJS-500-7", 7100],
    ["sg600", "SG 600-3 / GJS-600-3", 7100],
    ["sg700", "SG 700-2 / GJS-700-2", 7200],
    ["sg800", "SG 800-2 / GJS-800-2", 7200],
  ]),
  ...group(
    "Aluminium Alloys",
    "IS 733 / IS 736 (select by product form)",
    [
      ["al1050", "1050A / E-Al99.5", 2710],
      ["al1100", "1100 / Al99.0Cu", 2710],
      ["al2014", "2014 T6 / AlCu4SiMg", 2800],
      ["al2024", "2024 T4 / AlCu4Mg1", 2780],
      ["al5052", "5052 H32 / AlMg2.5", 2680],
      ["al5083", "5083 H116 / AlMg4.5Mn", 2660],
      ["al6061", "6061 T6 / AlMg1SiCu", 2700],
      ["al6063", "6063 T5 / AlMg0.7Si", 2700],
      ["al7075", "7075 T6 / AlZn5.5MgCu", 2810],
    ],
    { referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED },
  ),
  ...group("Copper", "IS 191 / IS 407 (select by product form)", [
    ["cu-etp", "ETP Copper / Cu-ETP (C11000)", 8900],
    ["cu-ofhc", "OFHC Copper / Cu-OF (C10200)", 8940],
    ["cu-dhp", "DHP Copper / Cu-DHP (C12200)", 8900],
  ]),
  ...group("Brass", "IS 319 / IS 407 (select by product form)", [
    ["b6040", "Brass 60/40 / CuZn40 (C28000)", 8500],
    ["b7030", "Cartridge Brass 70/30 / CuZn30", 8530],
    ["b8020", "Brass 80/20 / CuZn20", 8600],
    ["b-fc", "Free Cutting Brass / CuZn39Pb3", 8490],
  ]),
  ...group("Bronze", "IS 318 grade/product reference", [
    ["ltb4", "Leaded Tin Bronze LTB4 / C93700", 8800],
    ["pb-a", "Phosphor Bronze Grade A / CuSn5", 8860],
    ["pb-c", "Phosphor Bronze Grade C / CuSn8", 8800],
    ["albrnz", "Aluminium Bronze / CuAl10Fe3", 7600],
    ["gunmtl", "Gunmetal / G-CuSn10Zn2", 8750],
  ]),
  ...group(
    "Nickel Alloys",
    "Product-form-specific ASTM reference",
    [
      ["in600", "Inconel 600 / UNS N06600", 8470, "ASTM B166 (bar/rod/wire scope)"],
      ["in625", "Inconel 625 / UNS N06625", 8440, "ASTM B443 (plate/sheet/strip scope)"],
      ["hc276", "Hastelloy C-276 / UNS N10276", 8890, "ASTM B575 (plate/sheet/strip scope)"],
      ["mn400", "Monel 400 / UNS N04400", 8800, "ASTM B164 (bar/rod/wire scope)"],
    ],
    { referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED },
  ),
  ...group(
    "Titanium",
    "ASTM B265 (plate/sheet/strip scope)",
    [
      ["ti-g1", "Grade 1 / CP-Ti / UNS R50250", 4510],
      ["ti-g2", "Grade 2 / CP-Ti / UNS R50400", 4510],
      ["ti-g5", "Grade 5 / Ti-6Al-4V / UNS R56400", 4430],
    ],
    { referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED },
  ),
  ...group("Lead", "IS 27 product reference", [
    ["pb-p", "Commercial Lead 99.9%", 11340],
    ["pb-h", "Hard Lead Pb-Sb 6%", 10900],
  ]),
  ...group("Zinc / Zinc Alloys", "IS 209 / IS 742 grade reference", [
    ["zn-p", "Zinc 99.9%", 7133, "IS 209 grade reference"],
    ["zk3", "ZAMAK 3 / ZnAl4", 6600, "IS 742 grade reference"],
    ["zk5", "ZAMAK 5 / ZnAl4Cu1", 6600, "IS 742 grade reference"],
  ]),
  ...group(
    "Rubber",
    "No density certificate",
    [
      [
        "nr",
        "Natural Rubber NR",
        920,
        "Previous IS 6396 citation removed as unrelated",
        MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED,
      ],
      [
        "cr-r",
        "Neoprene CR",
        1230,
        "Previous IS 6395 citation removed as unrelated",
        MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED,
      ],
      ["si-r", "Silicone Rubber VMQ", 1200, "Supplier compound datasheet required", MATERIAL_REFERENCE_STATUSES.UNVERIFIED],
      [
        "nbr",
        "Nitrile NBR",
        1000,
        "Previous IS 6395 citation removed as unrelated",
        MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED,
      ],
      ["epdm", "EPDM", 1140, "Previous IS 11149 association not treated as density evidence", MATERIAL_REFERENCE_STATUSES.UNVERIFIED],
      [
        "sbr",
        "SBR",
        1050,
        "Previous IS 6395 citation removed as unrelated",
        MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED,
      ],
      [
        "fkm",
        "Fluoroelastomer FKM",
        1850,
        "ASTM D2000 classification only",
        MATERIAL_REFERENCE_STATUSES.CLASSIFICATION_ONLY,
      ],
      ["pur", "Polyurethane PU", 1200, "Supplier formulation datasheet required", MATERIAL_REFERENCE_STATUSES.UNVERIFIED],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.UNVERIFIED,
      note: RUBBER_NOTE,
    },
  ),
  ...group(
    "Engineering Plastics",
    "Supplier grade datasheet required",
    [
      ["pa6", "Nylon PA6", 1140, "Previous IS 11197 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["pa66", "Nylon PA66", 1150, "Previous IS 11197 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["hdpe", "HDPE", 960, "IS 2508 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED],
      ["ldpe", "LDPE", 920, "IS 2508 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED],
      ["pvcr", "PVC Rigid", 1400, "IS 10151 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED],
      ["pvcf", "PVC Flexible", 1200, "IS 10150 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED],
      ["pp", "Polypropylene PP", 910, "Previous IS 10975 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["pmma", "Acrylic PMMA", 1190, "Previous IS 13201 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["abs", "ABS", 1050, "Previous IS 11156 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["pc", "Polycarbonate PC", 1200, "Previous IS 13567 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["ptfe", "PTFE", 2200, "IS 10930 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED],
      ["uhmw", "UHMWPE", 930, "ASTM D4020 test/classification reference only", MATERIAL_REFERENCE_STATUSES.TEST_METHOD_ONLY],
      ["pom", "POM / Acetal", 1410, "Previous IS 15219 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["peek", "PEEK", 1320, "Previous ASTM D6262 association not treated as generic density evidence", MATERIAL_REFERENCE_STATUSES.UNVERIFIED],
      ["pei", "PEI", 1280, "Previous ASTM D5205 association not treated as generic density evidence", MATERIAL_REFERENCE_STATUSES.UNVERIFIED],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.UNVERIFIED,
      note: POLYMER_NOTE,
    },
  ),
  ...group(
    "Wood",
    "Moisture-conditioned stock data required",
    [
      ["teak", "Teak", 650, "Previous IS 12020 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["sal", "Sal Wood", 870, "Previous IS 12020 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
      ["ply", "Commercial Plywood", 680, "IS 303 product reference; not density evidence", MATERIAL_REFERENCE_STATUSES.MOISTURE_DEPENDENT],
      ["mdf", "MDF Board", 750, "IS 12406 product reference; density class/range must be selected", MATERIAL_REFERENCE_STATUSES.MOISTURE_DEPENDENT],
      ["rbwd", "Rubber Wood", 600, "Previous IS 12020 citation removed as unrelated", MATERIAL_REFERENCE_STATUSES.CITATION_REMOVED],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.MOISTURE_DEPENDENT,
      note: WOOD_NOTE,
    },
  ),
  ...group(
    "Glass",
    "Product-form standard; not density evidence",
    [
      ["gl-f", "Float Glass", 2500, "IS 2835 product reference"],
      ["gl-t", "Toughened Glass", 2500, "IS 2553 product reference"],
      ["gl-l", "Laminated Glass", 2500, "IS 6280 product reference"],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED,
      note: GLASS_NOTE,
    },
  ),
  ...group(
    "FRP / GRP Composites",
    "Laminate specification required",
    [
      [
        "grp",
        "GRP / GFRP",
        1850,
        "IS 6746 concerns polyester resin systems; not generic GRP density",
        MATERIAL_REFERENCE_STATUSES.PRODUCT_FORM_LIMITED,
      ],
      [
        "cfrp",
        "Carbon FRP (CFRP)",
        1600,
        "ASTM D3039 tensile test method only",
        MATERIAL_REFERENCE_STATUSES.TEST_METHOD_ONLY,
      ],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.UNVERIFIED,
      note: COMPOSITE_NOTE,
    },
  ),
  ...group(
    "Concrete",
    "IS 456:2000 strength-grade reference; not density evidence",
    [
      ["m20", "M20 Concrete", 2400],
      ["m25", "M25 Concrete", 2400],
      ["m30", "M30 Concrete", 2400],
      ["m40", "M40 Concrete", 2400],
    ],
    {
      referenceStatus: MATERIAL_REFERENCE_STATUSES.MIX_DEPENDENT,
      note: CONCRETE_NOTE,
    },
  ),
]);

export const MATERIAL_CATEGORIES = Object.freeze([
  ...new Set(MATERIALS.map(({ category }) => category)),
]);

const MATERIAL_BY_ID = new Map(
  MATERIALS.map((entry) => [entry.id, entry]),
);

export function getMaterial(id) {
  return MATERIAL_BY_ID.get(id) ?? null;
}
