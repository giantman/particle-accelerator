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
  radius: number;
  strength: number;
  swirl: number;
  spring: number;
  stagger: number;
  orbit: boolean;
  mark: MarkStyle;
  charset: string;
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
  radius: 0.09,
  strength: 1,
  swirl: 0.35,
  spring: 1,
  stagger: 1.1,
  orbit: false,
  mark: "dot",
  charset: ".:-=+*#%@",
  mask: "rect",
};

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
  "mask",
];

export const fmt: Record<
  keyof Omit<ScatterParams, "invert" | "ink" | "paper" | "mark" | "charset" | "mask" | "orbit">,
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
};
