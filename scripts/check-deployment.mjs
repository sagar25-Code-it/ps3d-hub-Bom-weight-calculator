const assetChecks = [
  { path: "/", type: "text/html", minimumBytes: 10_000 },
  { path: "/styles.css", type: "text/css", minimumBytes: 10_000, marker: "--ps3d-ui-ready: 1" },
  { path: "/js/app.js", type: "javascript", minimumBytes: 10_000 },
  { path: "/js/engine.js", type: "javascript", minimumBytes: 5_000 },
  { path: "/js/export.js", type: "javascript", minimumBytes: 1_000 },
  { path: "/js/materials.js", type: "javascript", minimumBytes: 10_000 },
  { path: "/js/shapes.js", type: "javascript", minimumBytes: 10_000 },
  { path: "/js/storage.js", type: "javascript", minimumBytes: 1_000 },
  { path: "/sw.js", type: "javascript", minimumBytes: 500 },
  { path: "/manifest.webmanifest", type: "json", minimumBytes: 100 },
  { path: "/favicon.svg", type: "image/svg+xml", minimumBytes: 100 },
  { path: "/logo.png", type: "image/png", minimumBytes: 100 },
];

function deploymentOrigin(value) {
  if (!value) {
    throw new Error("Pass the deployment URL, for example: npm run check:deployment -- https://example.vercel.app");
  }

  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Deployment URL must use http:// or https://.");
  }
  return url.origin;
}

function matchesContentType(actual, expected) {
  const normalized = actual.toLowerCase();
  if (expected === "javascript") return normalized.includes("javascript");
  if (expected === "json") return normalized.includes("json");
  return normalized.includes(expected);
}

async function inspectAsset(origin, check) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(new URL(check.path, origin), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "PS3D-Deployment-Check/2.0.1" },
    });
    const body = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    const text = check.marker ? new TextDecoder().decode(body) : "";
    const problems = [];

    if (!response.ok) problems.push(`HTTP ${response.status}`);
    if (!matchesContentType(contentType, check.type)) {
      problems.push(`content-type "${contentType || "missing"}"`);
    }
    if (body.byteLength < check.minimumBytes) {
      problems.push(`${body.byteLength} bytes; expected at least ${check.minimumBytes}`);
    }
    if (check.marker && !text.includes(check.marker)) {
      problems.push(`missing marker "${check.marker}"`);
    }

    if (problems.length > 0) {
      throw new Error(`${check.path}: ${problems.join("; ")}`);
    }
    console.log(`PASS ${check.path} — ${response.status}, ${contentType}, ${body.byteLength} bytes`);
  } finally {
    clearTimeout(timeout);
  }
}

const origin = deploymentOrigin(process.argv[2]);
const failures = [];

for (const check of assetChecks) {
  try {
    await inspectAsset(origin, check);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  throw new Error(`Deployment check failed:\n- ${failures.join("\n- ")}`);
}

console.log(`Deployment asset check passed for ${origin}`);
