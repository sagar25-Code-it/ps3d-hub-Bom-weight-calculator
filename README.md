# PS3D Hub — Engineering Mass & BOM Workbench

A build-free web application for traceable theoretical mass calculations and recoverable bill-of-materials work.

## What changed in version 2

- Rebuilt the promotional four-column screen as a responsive engineering workbench.
- Separated the 3,339-line monolith into native ES modules and external CSS.
- Added strict geometry validation for all 22 shape models.
- Corrected the Z-section model and numerically stabilized thin-wall calculations.
- Added metric and imperial entry with a canonical SI calculation core.
- Added calculation evidence: formula, normalized substitution, volume, area, density, force, assumptions, and status.
- Added user-specified planning tolerance, waste/scrap, rate per kilogram, procurement mass, and cost.
- Retained 151 material choices while removing misleading or unrelated material-standard claims.
- Added custom measured/supplier density support.
- Replaced the 17,000-option 100-row editor with “calculate once, add to BOM” snapshots.
- Added local autosave, project/revision metadata, JSON import/export, spreadsheet-safe CSV, and print/PDF output.
- Removed mandatory PII lead capture and its non-durable storage endpoint.
- Added WCAG-oriented labels, focus states, live status, responsive controls, reduced-motion support, and mobile BOM cards.
- Added an offline app shell, strict deployment security headers, a correct `/api/contact` route, automated calculation tests, and secret-safe examples.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

No package installation or build step is required.

## Test and check

```bash
npm test
npm run check
```

The 40 automated checks include independent golden values for the supported geometry models, metric/imperial conversion, invalid cross-field relationships, small-mass formatting, quantity/planning rules, guarded storage, and spreadsheet-safe export.

## Calculation meaning

The core relationship is:

```text
theoretical mass (kg) = material volume (m³) × density (kg/m³)
```

The app calculates **mass**, commonly called “weight” in commercial use. Engineering weight force is shown separately in newtons using standard gravity.

Outputs are estimates. Actual supplied mass can differ because of:

- dimensional and mill tolerances;
- root/toe/corner radii and flange slopes;
- holes, cut-outs, tapers, weld metal, coatings, and corrugation;
- alloy chemistry, polymer formulation, composite lay-up, or wood moisture;
- supplier-specific product tables and measured variation.

For purchasing, certification, or safety-critical work, use the active drawing and standard plus a supplier table, material test certificate, datasheet, or measured value.

## Material references

The 151-item catalog is retained for practical continuity, but density is labelled as reference/indicative data. A grade or product standard is not automatically a density certificate.

Known unrelated legacy citations were removed. Current authoritative starting points are listed inside **Method & sources**, including BIS, NIST, W3C, USDA Forest Products Laboratory, and manufacturer technical datasheets.

## Data and privacy

- BOM/project data is stored only in the current browser through `localStorage`.
- Use **Download JSON** for a portable backup.
- No name, email, or mobile number is required to use the calculator.
- The app does not transmit BOM data.
- Optional public business contact details are served by `/api/contact`.
- A real `.env` is intentionally ignored and must never be committed or packaged.

Copy `.env.example` to `.env` for local contact details:

```env
CONTACT_NAME=Your Name
CONTACT_BRAND=PS3D Hub
CONTACT_PHONE=+91 00000 00000
CONTACT_EMAIL=hello@example.com
CONTACT_LOCATION=India
```

## Deployment

The project remains compatible with Vercel:

1. Push the source to a private or public Git repository without `.env`.
2. Import the repository in Vercel.
3. Add the optional `CONTACT_*` environment variables.
4. Deploy.

`vercel.json` adds CSP, content-type, referrer, permissions, and frame restrictions.
When publishing a new release, update the service-worker version in both `sw.js` and its registration URL in `js/app.js`.

## Structure

```text
.
├── index.html
├── styles.css
├── favicon.svg
├── manifest.webmanifest
├── sw.js
├── vercel.json
├── api/
│   └── contact.js
├── js/
│   ├── app.js
│   ├── engine.js
│   ├── export.js
│   ├── materials.js
│   ├── shapes.js
│   └── storage.js
├── scripts/
│   └── server.mjs
└── tests/
    ├── app-utils.test.mjs
    └── engine.test.mjs
```

## License

MIT. See `LICENSE`.
