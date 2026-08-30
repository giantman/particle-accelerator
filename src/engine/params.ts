export type MarkStyle = "dot" | "ascii";
export type MaskShape = "rect" | "square" | "oval" | "circle";
export type OrbitPath = "circle" | "figure8" | "noisy";
export type LoopMode = "forward" | "pingpong" | "shuffle";

export interface ScatterParams {
  density: number;
  dotScale: number;
  contrast: number;
  midtone: number;
  invert: boolean;
  ink: string;
  paper: string;
  depthRamp: boolean;
  rampColors: string[];
  blastEnabled: boolean;
  radius: number;
  strength: number;
  falloff: number;
  swirl: number;
  spring: number;
  stagger: number;
  orbit: boolean;
  orbitStrength: number;
  orbitSpeed: number;
  orbitDepthLink: number;
  orbitEccentricity: number;
  orbitAngle: number;
  orbitPath: OrbitPath;
  turbulence: number;
  gravity: number;
  gravityAngle: number;
  attract: boolean;
  depthWeight: number;
  mark: MarkStyle;
  charset: string;
  maskEnabled: boolean;
  mask: MaskShape;
  loopEnabled: boolean;
  loopInterval: number;
  loopMode: LoopMode;
}

export const DEFAULTS: ScatterParams = {
  density: 384,
  dotScale: 1,
  contrast: 1.15,
  midtone: 1,
  invert: false,
  ink: "#3143EB",
  paper: "#F8F8FC",
  depthRamp: false,
  rampColors: ["#1F2CB4", "#3143EB", "#7A86F0"],
  blastEnabled: true,
  radius: 0.09,
  strength: 1,
  falloff: 0.5,
  swirl: 0.35,
  spring: 1,
  stagger: 1.1,
  orbit: false,
  orbitStrength: 1,
  orbitSpeed: 1.3,
  orbitDepthLink: 0,
  orbitEccentricity: 0,
  orbitAngle: 0,
  orbitPath: "circle",
  turbulence: 0,
  gravity: 0,
  gravityAngle: 90,
  attract: false,
  depthWeight: 0,
  mark: "dot",
  charset: ".:-=+*#%@",
  maskEnabled: false,
  mask: "circle",
  loopEnabled: false,
  loopInterval: 3,
  loopMode: "forward",
};

export const MIN_RAMP_STOPS = 2;
export const MAX_RAMP_STOPS = 5;

const STORAGE_KEY = "scatter-press-v1";

export function loadParams(): ScatterParams {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") return { ...DEFAULTS, ...saved };
  } catch {
    /* ignore corrupt storage */
  }
  return { ...DEFAULTS };
}

export function saveParams(p: ScatterParams): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable (private mode, quota, etc.) — non-fatal */
  }
}

// Uploaded plates otherwise live only in memory, so a reload silently
// discards them and falls back to the default image. Persist the capped
// "source" copy each plate carries (small enough that a handful comfortably
// fit) so an upload survives a refresh.
const PLATES_KEY = "scatter-press-v1-plates";

export interface StoredPlates {
  sources: string[];
  current: number;
}

export function loadPlates(): StoredPlates | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PLATES_KEY) || "null");
    if (saved && Array.isArray(saved.sources) && saved.sources.length) return saved;
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

export function savePlates(sources: string[], current: number): void {
  try {
    if (!sources.length) {
      localStorage.removeItem(PLATES_KEY);
      return;
    }
    localStorage.setItem(PLATES_KEY, JSON.stringify({ sources, current }));
  } catch {
    /* storage unavailable or quota exceeded — non-fatal, just won't persist */
  }
}

// Which param keys require the particle geometry (coverage grid) to be
// resampled from the source image, vs. ones that only affect live uniforms.
export const REBUILD_KEYS: (keyof ScatterParams)[] = [
  "density",
  "contrast",
  "midtone",
  "invert",
  "maskEnabled",
  "mask",
];

export const fmt: Record<
  keyof Omit<
    ScatterParams,
    | "invert"
    | "ink"
    | "paper"
    | "mark"
    | "charset"
    | "maskEnabled"
    | "mask"
    | "blastEnabled"
    | "orbit"
    | "orbitPath"
    | "attract"
    | "depthRamp"
    | "rampColors"
    | "loopEnabled"
    | "loopMode"
  >,
  (v: number) => string
> = {
  density: (v) => String(v),
  dotScale: (v) => v.toFixed(2) + "×",
  contrast: (v) => v.toFixed(2),
  midtone: (v) => v.toFixed(2),
  radius: (v) => Math.round(v * 100) + "%",
  strength: (v) => v.toFixed(1) + "×",
  falloff: (v) => (v <= 0.05 ? "Soft" : v >= 0.95 ? "Hard" : v.toFixed(2)),
  swirl: (v) => v.toFixed(2),
  spring: (v) => v.toFixed(1) + "×",
  stagger: (v) => v.toFixed(1) + "s",
  orbitStrength: (v) => v.toFixed(1) + "×",
  orbitSpeed: (v) => v.toFixed(1) + " rad/s",
  orbitDepthLink: (v) => v.toFixed(2),
  orbitEccentricity: (v) => v.toFixed(2),
  orbitAngle: (v) => Math.round(v) + "°",
  turbulence: (v) => v.toFixed(2),
  gravity: (v) => v.toFixed(1),
  gravityAngle: (v) => Math.round(v) + "°",
  depthWeight: (v) => v.toFixed(2),
  loopInterval: (v) => v.toFixed(1) + "s",
};
