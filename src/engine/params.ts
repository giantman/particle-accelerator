export type MarkStyle = "dot" | "ascii";
export type MaskShape = "rect" | "square" | "oval" | "circle";

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
  radius: number;
  strength: number;
  swirl: number;
  spring: number;
  stagger: number;
  orbit: boolean;
  turbulence: number;
  gravity: number;
  gravityAngle: number;
  attract: boolean;
  depthWeight: number;
  mark: MarkStyle;
  charset: string;
  maskEnabled: boolean;
  mask: MaskShape;
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
  radius: 0.09,
  strength: 1,
  swirl: 0.35,
  spring: 1,
  stagger: 1.1,
  orbit: false,
  turbulence: 0,
  gravity: 0,
  gravityAngle: 90,
  attract: false,
  depthWeight: 0,
  mark: "dot",
  charset: ".:-=+*#%@",
  maskEnabled: false,
  mask: "circle",
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
    | "orbit"
    | "attract"
    | "depthRamp"
    | "rampColors"
  >,
  (v: number) => string
> = {
  density: (v) => String(v),
  dotScale: (v) => v.toFixed(2) + "×",
  contrast: (v) => v.toFixed(2),
  midtone: (v) => v.toFixed(2),
  radius: (v) => Math.round(v * 100) + "%",
  strength: (v) => v.toFixed(1) + "×",
  swirl: (v) => v.toFixed(2),
  spring: (v) => v.toFixed(1) + "×",
  stagger: (v) => v.toFixed(1) + "s",
  turbulence: (v) => v.toFixed(2),
  gravity: (v) => v.toFixed(1),
  gravityAngle: (v) => Math.round(v) + "°",
  depthWeight: (v) => v.toFixed(2),
};
