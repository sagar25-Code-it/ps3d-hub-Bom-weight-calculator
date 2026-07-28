import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

const PUBLIC_ROOT_FILES = new Set([
  "/favicon.svg",
  "/index.html",
  "/logo.png",
  "/manifest.webmanifest",
  "/styles.css",
  "/sw.js",
]);

async function readLocalEnv() {
  try {
    const content = await readFile(resolve(root, ".env"), "utf8");
    return Object.fromEntries(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const separator = line.indexOf("=");
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const localEnv = await readLocalEnv();

function send(response, status, headers, body = "") {
  response.writeHead(status, {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...headers,
  });
  response.end(body);
}

function cleanContact(value) {
  return String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 160);
}

async function handleRequest(request, response) {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    send(response, 405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" }, "Method not allowed");
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
  if (requestUrl.pathname === "/api/contact") {
    const payload = JSON.stringify({
      name: cleanContact(process.env.CONTACT_NAME || localEnv.CONTACT_NAME),
      brand: cleanContact(process.env.CONTACT_BRAND || localEnv.CONTACT_BRAND),
      phone: cleanContact(process.env.CONTACT_PHONE || localEnv.CONTACT_PHONE),
      email: cleanContact(process.env.CONTACT_EMAIL || localEnv.CONTACT_EMAIL),
      location: cleanContact(process.env.CONTACT_LOCATION || localEnv.CONTACT_LOCATION),
    });
    send(response, 200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, request.method === "HEAD" ? "" : payload);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    send(response, 400, { "Content-Type": "text/plain; charset=utf-8" }, "Bad request");
    return;
  }

  const publicPath = pathname === "/" ? "/index.html" : pathname;
  const isPublicAsset =
    PUBLIC_ROOT_FILES.has(publicPath) || /^\/js\/[a-z0-9._-]+\.js$/i.test(publicPath);
  if (!isPublicAsset) {
    send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
    return;
  }

  const requestedPath = resolve(root, `.${publicPath}`);
  if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
    send(response, 403, { "Content-Type": "text/plain; charset=utf-8" }, "Forbidden");
    return;
  }

  try {
    const info = await stat(requestedPath);
    const filePath = info.isDirectory() ? resolve(requestedPath, "index.html") : requestedPath;
    const bytes = await readFile(filePath);
    send(
      response,
      200,
      {
        "Content-Type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": extname(filePath) === ".html" ? "no-store" : "no-cache",
      },
      request.method === "HEAD" ? "" : bytes,
    );
  } catch {
    send(response, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
  }
}

createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    send(response, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Internal server error");
  });
}).listen(port, host, () => {
  console.log(`PS3D Hub workbench: http://${host}:${port}`);
});
