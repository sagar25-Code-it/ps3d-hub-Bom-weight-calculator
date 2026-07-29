import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectRoot, "public");
const checkOnly = process.argv.includes("--check");
const unknownArguments = process.argv.slice(2).filter((argument) => argument !== "--check");

const rootFiles = [
  "index.html",
  "styles.css",
  "favicon.svg",
  "logo.png",
  "manifest.webmanifest",
  "sw.js",
];

const JavaScriptFiles = [
  "app.js",
  "engine.js",
  "export.js",
  "materials.js",
  "shapes.js",
  "storage.js",
];

const requiredReferences = [
  "./styles.css",
  "./favicon.svg",
  "./manifest.webmanifest",
  "./js/app.js",
];

function assertSafeOutputDirectory() {
  if (
    outputDirectory === projectRoot
    || dirname(outputDirectory) !== projectRoot
    || basename(outputDirectory) !== "public"
  ) {
    throw new Error(`Refusing to modify unsafe output directory: ${outputDirectory}`);
  }
}

async function assertRegularFile(filePath, label, minimumBytes = 1) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile() || fileStat.size < minimumBytes) {
    throw new Error(`${label} is missing, empty, or not a regular file.`);
  }
}

async function validateSource() {
  for (const file of rootFiles) {
    const minimumBytes = file === "styles.css" ? 10_000 : 1;
    await assertRegularFile(resolve(projectRoot, file), `Source ${file}`, minimumBytes);
  }

  for (const file of JavaScriptFiles) {
    await assertRegularFile(resolve(projectRoot, "js", file), `Source js/${file}`);
  }

  const indexHtml = await readFile(resolve(projectRoot, "index.html"), "utf8");
  for (const reference of requiredReferences) {
    if (!indexHtml.includes(reference)) {
      throw new Error(`index.html does not reference required asset ${reference}`);
    }
  }
}

async function assertByteIdentical(relativePath) {
  const [source, built] = await Promise.all([
    readFile(resolve(projectRoot, relativePath)),
    readFile(resolve(outputDirectory, relativePath)),
  ]);

  if (!source.equals(built)) {
    throw new Error(`Built asset is stale: public/${relativePath}`);
  }
}

async function verifyBuild() {
  assertSafeOutputDirectory();
  await validateSource();

  const actualRootEntries = (await readdir(outputDirectory)).sort();
  const expectedRootEntries = [...rootFiles, "js"].sort();
  if (actualRootEntries.join("\n") !== expectedRootEntries.join("\n")) {
    throw new Error(
      `Unexpected public/ contents.\nExpected: ${expectedRootEntries.join(", ")}\nActual: ${actualRootEntries.join(", ")}`,
    );
  }

  const actualJavaScriptEntries = (await readdir(resolve(outputDirectory, "js"))).sort();
  const expectedJavaScriptEntries = [...JavaScriptFiles].sort();
  if (actualJavaScriptEntries.join("\n") !== expectedJavaScriptEntries.join("\n")) {
    throw new Error(
      `Unexpected public/js contents.\nExpected: ${expectedJavaScriptEntries.join(", ")}\nActual: ${actualJavaScriptEntries.join(", ")}`,
    );
  }

  for (const file of rootFiles) {
    await assertByteIdentical(file);
  }
  for (const file of JavaScriptFiles) {
    await assertByteIdentical(`js/${file}`);
  }

  const builtStyles = await readFile(resolve(outputDirectory, "styles.css"), "utf8");
  if (!builtStyles.includes("--ps3d-ui-ready: 1")) {
    throw new Error("Built stylesheet is missing the PS3D UI readiness marker.");
  }

  console.log(`Verified deployable bundle: ${expectedRootEntries.length - 1 + expectedJavaScriptEntries.length} files in public/.`);
}

async function build() {
  assertSafeOutputDirectory();
  await validateSource();
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(resolve(outputDirectory, "js"), { recursive: true });

  for (const file of rootFiles) {
    await cp(resolve(projectRoot, file), resolve(outputDirectory, file));
  }
  for (const file of JavaScriptFiles) {
    await cp(
      resolve(projectRoot, "js", file),
      resolve(outputDirectory, "js", file),
    );
  }

  await verifyBuild();
}

if (unknownArguments.length > 0) {
  throw new Error(`Unknown argument(s): ${unknownArguments.join(", ")}`);
}

if (checkOnly) {
  await verifyBuild();
} else {
  await build();
}
