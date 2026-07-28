export const STORAGE_KEY = "ps3d.workbench.v2";
export const STATE_VERSION = 2;

export function createDefaultProject() {
  return {
    version: STATE_VERSION,
    activeView: "calculator",
    theme: "light",
    unitSystem: "metric",
    project: {
      name: "",
      client: "",
      drawingNumber: "",
      revision: "",
      preparedBy: "",
      checkedBy: "",
      updatedAt: new Date().toISOString(),
    },
    bom: [],
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeStoredState(candidate) {
  const fallback = createDefaultProject();
  if (!isPlainObject(candidate)) return fallback;

  const project = isPlainObject(candidate.project) ? candidate.project : {};
  const normalized = {
    ...fallback,
    activeView: ["calculator", "bom", "method"].includes(candidate.activeView)
      ? candidate.activeView
      : fallback.activeView,
    theme: candidate.theme === "dark" ? "dark" : "light",
    unitSystem: candidate.unitSystem === "imperial" ? "imperial" : "metric",
    project: {
      name: String(project.name || "").slice(0, 100),
      client: String(project.client || "").slice(0, 100),
      drawingNumber: String(project.drawingNumber || "").slice(0, 60),
      revision: String(project.revision || "").slice(0, 20),
      preparedBy: String(project.preparedBy || "").slice(0, 80),
      checkedBy: String(project.checkedBy || "").slice(0, 80),
      updatedAt: typeof project.updatedAt === "string" ? project.updatedAt : new Date().toISOString(),
    },
    bom: Array.isArray(candidate.bom) ? candidate.bom.slice(0, 500) : [],
  };

  return normalized;
}

export function loadState(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.getItem !== "function") throw new Error("Browser storage is unavailable");
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return { state: createDefaultProject(), status: "empty" };
    return { state: normalizeStoredState(JSON.parse(raw)), status: "loaded" };
  } catch (error) {
    return {
      state: createDefaultProject(),
      status: "unavailable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function saveState(state, storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.setItem !== "function") throw new Error("Browser storage is unavailable");
    const next = normalizeStoredState({
      ...state,
      version: STATE_VERSION,
      project: {
        ...state.project,
        updatedAt: new Date().toISOString(),
      },
    });
    target.setItem(STORAGE_KEY, JSON.stringify(next));
    return { ok: true, state: next };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function clearState(storage) {
  try {
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target || typeof target.removeItem !== "function") throw new Error("Browser storage is unavailable");
    target.removeItem(STORAGE_KEY);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
