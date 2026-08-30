import { DEFAULTS, REBUILD_KEYS, saveParams, type ScatterParams } from "./params";

export interface Plate {
  canvas: HTMLCanvasElement;
  thumb: string;
}

export interface ScatterPressCallbacks {
  onStats?: (text: string) => void;
  onPlates?: (thumbs: string[], current: number) => void;
}

const REBUILD_KEY_SET = new Set<string>(REBUILD_KEYS);
const MAX_PLATES = 12;
const ORBIT_SPEED = 1.3; // radians/sec
const ORBIT_AMPLITUDE = 1.2; // fraction of a grid cell, at orbitStrength 1×

/**
 * Two-color halftone particle engine, ported from scatter_press_test_3.html.
 *
 * An image is sampled into a coverage grid (one value per particle "home"
 * cell). Particles fly in on a staggered assembly, spring back to their home
 * position, get pushed/swirled by the pointer, and scatter on a click burst.
 * Rendering is WebGL points, either soft dots or glyphs from a text atlas.
 */
export class ScatterPressEngine {
  private canvas: HTMLCanvasElement;
  private callbacks: ScatterPressCallbacks;
  private reduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  params: ScatterParams = { ...DEFAULTS };

  private plates: Plate[] = [];
  private current = -1;
  private srcCanvas: HTMLCanvasElement | null = null;
  private srcReady = false;

  private gl: WebGLRenderingContext | null = null;
  private uSize!: WebGLUniformLocation | null;
  private uCell!: WebGLUniformLocation | null;
  private uDpr!: WebGLUniformLocation | null;
  private uScale!: WebGLUniformLocation | null;
  private uInk!: WebGLUniformLocation | null;
  private uMode!: WebGLUniformLocation | null;
  private uGlyphN!: WebGLUniformLocation | null;
  private uAtlasLoc!: WebGLUniformLocation | null;
  private uRampLoc!: WebGLUniformLocation | null;
  private uUseRamp!: WebGLUniformLocation | null;
  private bufPos!: WebGLBuffer | null;
  private bufCov!: WebGLBuffer | null;
  private bufRand!: WebGLBuffer | null;
  private bufRampT!: WebGLBuffer | null;
  private locPos = 0;
  private locCov = 0;
  private locRand = 0;
  private locRampT = 0;

  private atlasTex: WebGLTexture | null = null;
  private glyphN = 1;
  private rampTex: WebGLTexture | null = null;

  private count = 0;
  private home = new Float32Array(0);
  private homeU = new Float32Array(0);
  private covArr = new Float32Array(0);
  private pos = new Float32Array(0);
  private vel = new Float32Array(0);
  private randF = new Float32Array(0);

  private W = 0;
  private H = 0;
  private dpr = 1;
  private cell = 3;
  private GW = 4;
  private GH = 3;

  private t0 = 0;
  private raf = 0;
  private still = 0;
  private mx = -1e4;
  private my = -1e4;
  private mAct = false;

  private rebuildTimer = 0;
  private atlasTimer = 0;
  private resizeObserver: ResizeObserver | null = null;

  private onPointerEnter = (e: PointerEvent) => {
    this.mAct = true;
    this.toLocal(e);
    this.wake();
  };
  private onPointerMove = (e: PointerEvent) => {
    this.mAct = true;
    this.toLocal(e);
    this.wake();
  };
  private onPointerLeave = () => {
    this.mAct = false;
    this.wake();
  };
  private onPointerDown = (e: PointerEvent) => {
    this.mAct = true;
    this.toLocal(e);
    this.burst(this.mx, this.my);
  };
  private loopBound = (now: number) => this.frameLoop(now);

  constructor(canvas: HTMLCanvasElement, callbacks: ScatterPressCallbacks = {}) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.t0 = performance.now();

    this.gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      // Reliable synchronous PNG export via canvas.toDataURL().
      preserveDrawingBuffer: true,
    }) as WebGLRenderingContext | null;

    if (this.gl) {
      this.initGL();
      this.buildAtlas();
      this.buildRamp();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this.buildAtlas());
      }
      canvas.addEventListener("pointerenter", this.onPointerEnter);
      canvas.addEventListener("pointermove", this.onPointerMove);
      canvas.addEventListener("pointerleave", this.onPointerLeave);
      canvas.addEventListener("pointerdown", this.onPointerDown, { passive: true });
    }
  }

  get available(): boolean {
    return !!this.gl;
  }

  observeResize(el: HTMLElement) {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(el);
  }

  private toLocal(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    this.mx = e.clientX - r.left;
    this.my = e.clientY - r.top;
  }

  // ---------- GL setup ----------
  private initGL() {
    const gl = this.gl!;
    const vsrc = `
      attribute vec2 aPos; attribute float aCov; attribute vec2 aRand; attribute float aRampT;
      uniform vec2 uSize; uniform float uCell, uDpr, uScale, uMode;
      varying float vCov;
      varying float vRampT;
      void main() {
        vec2 clip = vec2(aPos.x / uSize.x * 2.0 - 1.0, 1.0 - aPos.y / uSize.y * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
        float dDot = uCell * uScale * (1.2 * sqrt(aCov) + 0.5 * aCov * aCov) * (0.94 + 0.12 * aRand.x);
        float dChar = uCell * uScale * 1.45;
        float d = mix(dDot, dChar, uMode);
        gl_PointSize = max(d * uDpr, 1.15);
        vCov = aCov;
        vRampT = aRampT;
      }`;
    const fsrc = `
      precision mediump float;
      uniform vec3 uInk;
      uniform highp float uMode, uGlyphN, uUseRamp;
      uniform sampler2D uAtlas;
      uniform sampler2D uRamp;
      varying float vCov;
      varying float vRampT;
      void main() {
        float a;
        if (uMode < 0.5) {
          float r = length(gl_PointCoord - 0.5);
          a = 1.0 - smoothstep(0.38, 0.5, r);
        } else {
          float gi = clamp(floor(vCov * uGlyphN), 0.0, uGlyphN - 1.0);
          vec2 uv = vec2((gi + gl_PointCoord.x) / uGlyphN, gl_PointCoord.y);
          a = texture2D(uAtlas, uv).a;
        }
        if (a < 0.01) discard;
        vec3 col = uUseRamp > 0.5 ? texture2D(uRamp, vec2(vRampT, 0.5)).rgb : uInk;
        gl_FragColor = vec4(col, a);
      }`;
    const sh = (t: number, s: string) => {
      const o = gl.createShader(t)!;
      gl.shaderSource(o, s);
      gl.compileShader(o);
      return o;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("GL link:", gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.uSize = gl.getUniformLocation(prog, "uSize");
    this.uCell = gl.getUniformLocation(prog, "uCell");
    this.uDpr = gl.getUniformLocation(prog, "uDpr");
    this.uScale = gl.getUniformLocation(prog, "uScale");
    this.uInk = gl.getUniformLocation(prog, "uInk");
    this.uMode = gl.getUniformLocation(prog, "uMode");
    this.uGlyphN = gl.getUniformLocation(prog, "uGlyphN");
    this.uAtlasLoc = gl.getUniformLocation(prog, "uAtlas");
    this.uRampLoc = gl.getUniformLocation(prog, "uRamp");
    this.uUseRamp = gl.getUniformLocation(prog, "uUseRamp");
    gl.uniform1i(this.uAtlasLoc, 0);
    gl.uniform1i(this.uRampLoc, 1);
    this.bufPos = gl.createBuffer();
    this.bufCov = gl.createBuffer();
    this.bufRand = gl.createBuffer();
    this.bufRampT = gl.createBuffer();
    this.locPos = gl.getAttribLocation(prog, "aPos");
    this.locCov = gl.getAttribLocation(prog, "aCov");
    this.locRand = gl.getAttribLocation(prog, "aRand");
    this.locRampT = gl.getAttribLocation(prog, "aRampT");
    gl.enableVertexAttribArray(this.locPos);
    gl.enableVertexAttribArray(this.locCov);
    gl.enableVertexAttribArray(this.locRand);
    gl.enableVertexAttribArray(this.locRampT);
  }

  private buildAtlas() {
    const gl = this.gl;
    if (!gl) return;
    const chars = (this.params.charset && this.params.charset.length ? this.params.charset : ".")
      .slice(0, 24)
      .split("");
    this.glyphN = chars.length;
    const cs = 96;
    const c = document.createElement("canvas");
    c.width = cs * this.glyphN;
    c.height = cs;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = "#fff";
    x.font = "500 " + Math.round(cs * 0.82) + "px 'IBM Plex Mono', ui-monospace, monospace";
    x.textAlign = "center";
    x.textBaseline = "middle";
    chars.forEach((ch, i) => x.fillText(ch, i * cs + cs / 2, cs * 0.56));
    if (!this.atlasTex) this.atlasTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.wake();
  }

  // A 1D gradient (256x1) across the coverage value, blended from the ramp's
  // color stops. Sampled directly in the fragment shader — cheap and smooth
  // regardless of how many stops the designer has added.
  private buildRamp() {
    const gl = this.gl;
    if (!gl) return;
    const stops = this.params.rampColors.length >= 2 ? this.params.rampColors : [this.params.ink, this.params.ink];
    const W = 256;
    const data = new Uint8Array(W * 4);
    const segCount = stops.length - 1;
    for (let x = 0; x < W; x++) {
      const t = x / (W - 1);
      const segF = t * segCount;
      const i0 = Math.min(segCount - 1, Math.floor(segF));
      const localT = segF - i0;
      const c0 = this.hex2rgb(stops[i0]);
      const c1 = this.hex2rgb(stops[i0 + 1]);
      data[x * 4] = Math.round((c0[0] + (c1[0] - c0[0]) * localT) * 255);
      data[x * 4 + 1] = Math.round((c0[1] + (c1[1] - c0[1]) * localT) * 255);
      data[x * 4 + 2] = Math.round((c0[2] + (c1[2] - c0[2]) * localT) * 255);
      data[x * 4 + 3] = 255;
    }
    if (!this.rampTex) this.rampTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.rampTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
    this.wake();
  }

  // ---------- plates ----------
  // `isVector` is set for SVG uploads: browsers report a bogus small intrinsic
  // size (often 300x150, or an aspect-correct-but-tiny size) for SVGs that
  // only declare a viewBox with no width/height — but <canvas> still
  // rasterizes them crisply at whatever size we draw them at. So for vector
  // sources we always target the full working resolution (upscaling that
  // bogus size is free/lossless); for raster uploads we keep the old
  // never-upscale behavior since that would just blur a small bitmap.
  addPlate(img: HTMLImageElement, isVector = false): number {
    if (this.plates.length >= MAX_PLATES) {
      this.callbacks.onStats?.(`Plate tray full · ${MAX_PLATES} max.`);
      return this.current;
    }
    const maxDim = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const sc = isVector ? 2000 / maxDim : Math.min(1, 2000 / maxDim);
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.round((img.naturalWidth || img.width) * sc));
    c.height = Math.max(2, Math.round((img.naturalHeight || img.height) * sc));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const t = document.createElement("canvas");
    const ts = 92 / Math.max(c.width, c.height);
    t.width = Math.max(2, Math.round(c.width * ts));
    t.height = Math.max(2, Math.round(c.height * ts));
    t.getContext("2d")!.drawImage(c, 0, 0, t.width, t.height);
    this.plates.push({ canvas: c, thumb: t.toDataURL("image/jpeg", 0.72) });
    this.selectPlate(this.plates.length - 1);
    return this.current;
  }

  selectPlate(i: number) {
    if (i < 0 || i >= this.plates.length) return;
    this.current = i;
    this.srcCanvas = this.plates[i].canvas;
    this.srcReady = true;
    this.emitPlates();
    this.rebuild();
  }

  private emitPlates() {
    this.callbacks.onPlates?.(
      this.plates.map((p) => p.thumb),
      this.current
    );
  }

  // ---------- sampling ----------
  private sampleCoverage() {
    const src = this.srcCanvas!;
    const p = this.params;
    const gw = Math.round(p.density);
    const gh = Math.max(8, Math.round((gw * src.height) / src.width));
    const t = document.createElement("canvas");
    t.width = gw;
    t.height = gh;
    const tc = t.getContext("2d", { willReadFrequently: true })!;
    // two-step downscale for cleaner averaging on big ratios
    const mid = document.createElement("canvas");
    mid.width = Math.max(gw * 2, 2);
    mid.height = Math.max(gh * 2, 2);
    mid.getContext("2d")!.drawImage(src, 0, 0, mid.width, mid.height);
    tc.drawImage(mid, 0, 0, gw, gh);
    const d = tc.getImageData(0, 0, gw, gh).data;
    const cov = new Float32Array(gw * gh);
    for (let i = 0; i < cov.length; i++) {
      const L = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
      let v = p.invert ? L : 1 - L; // ink = darkness
      v = 0.5 + (v - 0.5) * p.contrast; // contrast around mid
      v = Math.pow(Math.min(Math.max(v, 0), 1), p.midtone);
      cov[i] = v;
    }
    return { cov, gw, gh };
  }

  // Rank-equalize coverage values into a percentile in [0,1] across the
  // actual dot population, so the depth ramp's colors are spread evenly
  // regardless of how skewed the source image's tonal range is (e.g. a
  // mostly-midtone photo would otherwise crowd into one ramp color).
  //
  // This ranks every particle individually rather than bucketing into a
  // fixed number of histogram bins: a binned approach maps every particle
  // that lands in the same bin to one shared output value, so a large flat
  // region (a bold logo's solid interior, a thresholded photo) — where
  // thousands of particles share the exact same coverage — collapses onto a
  // single ramp color no matter how many bins you use. Ranking instead gives
  // each particle a distinct percentile; ties are broken by each particle's
  // existing random seed, so a flat region spreads into a dithered mix
  // across its share of the ramp instead of one flat block.
  private equalize(cov: Float32Array, tieBreak: Float32Array, count: number): Float32Array {
    const order = new Array<number>(count);
    for (let i = 0; i < count; i++) order[i] = i;
    order.sort((a, b) => cov[a] - cov[b] || tieBreak[a * 2] - tieBreak[b * 2]);
    const out = new Float32Array(count);
    const denom = Math.max(1, count - 1);
    for (let rank = 0; rank < count; rank++) out[order[rank]] = rank / denom;
    return out;
  }

  // ---------- geometry rebuild ----------
  rebuild() {
    const gl = this.gl;
    if (!this.srcReady || !gl) return;
    const oldPos = this.pos,
      oldCount = this.count,
      oldW = this.W,
      oldH = this.H;
    const { cov, gw, gh } = this.sampleCoverage();
    this.GW = gw;
    this.GH = gh;
    const TH = 0.04;
    const gw2 = gw / 2,
      gh2 = gh / 2,
      mrad = Math.min(gw, gh) / 2;
    const shape = this.params.maskEnabled ? this.params.mask : "rect";
    const inMask = (gx: number, gy: number) => {
      if (shape === "rect") return true;
      const dx = gx + 0.5 - gw2,
        dy = gy + 0.5 - gh2;
      if (shape === "oval") return (dx * dx) / (gw2 * gw2) + (dy * dy) / (gh2 * gh2) <= 1;
      if (shape === "circle") return dx * dx + dy * dy <= mrad * mrad;
      return Math.abs(dx) <= mrad && Math.abs(dy) <= mrad;
    };
    let count = 0;
    for (let gy = 0; gy < gh; gy++)
      for (let gx = 0; gx < gw; gx++) if (cov[gy * gw + gx] >= TH && inMask(gx, gy)) count++;
    this.count = count;
    this.homeU = new Float32Array(count * 2);
    this.covArr = new Float32Array(count);
    this.randF = new Float32Array(count * 2);
    let p = 0,
      seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let gy = 0; gy < gh; gy++)
      for (let gx = 0; gx < gw; gx++) {
        const c = cov[gy * gw + gx];
        if (c < TH || !inMask(gx, gy)) continue;
        this.homeU[p * 2] = (gx + 0.5) / gw;
        this.homeU[p * 2 + 1] = (gy + 0.5) / gh;
        this.covArr[p] = c;
        this.randF[p * 2] = rnd();
        this.randF[p * 2 + 1] = rnd();
        p++;
      }
    this.home = new Float32Array(count * 2);
    this.pos = new Float32Array(count * 2);
    this.vel = new Float32Array(count * 2);
    const rampT = this.equalize(this.covArr, this.randF, count);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCov);
    gl.bufferData(gl.ARRAY_BUFFER, this.covArr, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.locCov, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufRampT);
    gl.bufferData(gl.ARRAY_BUFFER, rampT, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.locRampT, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufRand);
    gl.bufferData(gl.ARRAY_BUFFER, this.randF, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.locRand, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.pos.byteLength, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(this.locPos, 2, gl.FLOAT, false, 0, 0);
    this.resize();
    if (this.reduced) this.snapHome();
    else if (!oldCount || !oldPos.length) this.seedRandom();
    else {
      this.t0 = performance.now() - 1e7; // skip stagger: fly straight to new homes
      const msx = oldW ? this.W / oldW : 1,
        msy = oldH ? this.H / oldH : 1;
      for (let i = 0; i < count; i++) {
        const j = Math.floor((i * oldCount) / count);
        this.pos[i * 2] = oldPos[j * 2] * msx;
        this.pos[i * 2 + 1] = oldPos[j * 2 + 1] * msy;
        this.vel[i * 2] = (this.randF[i * 2] - 0.5) * 2;
        this.vel[i * 2 + 1] = (this.randF[i * 2 + 1] - 0.5) * 2;
      }
    }
    const plateSuffix = this.plates.length > 1 ? ` · plate ${this.current + 1}/${this.plates.length}` : "";
    this.callbacks.onStats?.(`${count.toLocaleString()} dots · ${gw} × ${gh} cells${plateSuffix}`);
    this.wake();
  }

  resize() {
    const gl = this.gl;
    if (!gl || !this.count) return;
    const frame = this.canvas.parentElement;
    if (!frame) return;
    const availW = Math.max(2, frame.clientWidth - 3);
    const availH = Math.max(2, frame.clientHeight - 3);
    const aspect = this.GW / this.GH;
    let cssW = availW;
    let cssH = Math.round(cssW / aspect);
    if (cssH > availH) {
      cssH = availH;
      cssW = Math.round(cssH * aspect);
    }
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.style.width = cssW + "px";
    this.canvas.style.height = cssH + "px";
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    const sx = this.W ? cssW / this.W : 0;
    this.W = cssW;
    this.H = cssH;
    this.cell = this.W / this.GW;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uSize, this.W, this.H);
    gl.uniform1f(this.uCell, this.cell);
    gl.uniform1f(this.uDpr, this.dpr);
    for (let i = 0; i < this.count; i++) {
      this.home[i * 2] = this.homeU[i * 2] * this.W;
      this.home[i * 2 + 1] = this.homeU[i * 2 + 1] * this.H;
      if (sx) {
        this.pos[i * 2] *= sx;
        this.pos[i * 2 + 1] *= sx;
      }
    }
    this.wake();
  }

  private snapHome() {
    this.t0 = performance.now() - 1e7; // no intro phase
    this.pos.set(this.home);
    this.vel.fill(0);
  }

  private seedRandom() {
    this.t0 = performance.now();
    for (let i = 0; i < this.count; i++) {
      this.pos[i * 2] = this.randF[i * 2] * this.W;
      this.pos[i * 2 + 1] = this.randF[i * 2 + 1] * this.H;
      this.vel[i * 2] = (this.randF[i * 2 + 1] - 0.5) * 6;
      this.vel[i * 2 + 1] = (this.randF[i * 2] - 0.5) * 6;
    }
  }

  // Reshapes the normalized 0..1 distance-from-center falloff used by both
  // the hover push and the click burst. Low falloff (soft cushion) raises the
  // exponent so force stays concentrated near the pointer and fades early;
  // high falloff (hard edge) lowers it so force holds near-full strength
  // across the radius and only cuts off sharply right at the boundary.
  private falloffExp(): number {
    const SOFT_K = 3.5,
      HARD_K = 0.35;
    return SOFT_K + (HARD_K - SOFT_K) * this.params.falloff;
  }

  private burst(bx: number, by: number) {
    if (this.reduced || !this.count) return;
    const p = this.params;
    const L = Math.max(80, this.W * p.radius * 2.2);
    const A = 16 * p.strength * (this.W / 640);
    const k = this.falloffExp();
    for (let i = 0; i < this.count; i++) {
      const ix = i * 2,
        iy = ix + 1;
      const dx = this.pos[ix] - bx,
        dy = this.pos[iy] - by;
      const d = Math.sqrt(dx * dx + dy * dy) + 6;
      const f = Math.max(0, 1 - d / L);
      const m = A * Math.pow(f, k);
      this.vel[ix] += (dx / d) * m + (this.randF[ix] - 0.5) * m * 0.4;
      this.vel[iy] += (dy / d) * m + (this.randF[iy] - 0.5) * m * 0.4;
    }
    this.wake();
  }

  private step(now: number): number {
    const p = this.params;
    const K = 0.022 * p.spring,
      DAMP = Math.min(0.97, 0.86 + 0.03 * (1 - Math.min(p.spring, 1)));
    const R = Math.max(40, this.W * p.radius),
      R2 = R * R;
    const kick = this.reduced ? 0 : this.W * 0.006 * p.strength;
    const STAG = p.stagger * 1000;
    const ti = now - this.t0;
    const t = now / 1000;
    const orbitOn = p.orbit && !this.reduced;
    const turbOn = p.turbulence > 0 && !this.reduced;
    const gravOn = p.gravity > 0 && !this.reduced;
    const depthOn = p.depthWeight > 0 && this.covArr.length === this.count;
    const attractDir = p.attract ? -1 : 1;
    const turbAmp = this.cell * 1.6 * p.turbulence;
    const gRad = (p.gravityAngle * Math.PI) / 180;
    const gAccel = p.gravity * (this.W / 640) * 0.05;
    const gAx = Math.cos(gRad) * gAccel;
    const gAy = Math.sin(gRad) * gAccel;
    const falloffK = this.falloffExp();
    let energy = 0;
    for (let i = 0; i < this.count; i++) {
      const ix = i * 2,
        iy = ix + 1;
      const px = this.pos[ix],
        py = this.pos[iy];
      if (!this.reduced && ti < this.randF[ix] * STAG) {
        const fvx = this.vel[ix] * 0.985,
          fvy = this.vel[iy] * 0.985;
        this.vel[ix] = fvx;
        this.vel[iy] = fvy;
        this.pos[ix] = px + fvx;
        this.pos[iy] = py + fvy;
        energy += 1;
        continue;
      }
      // Depth-weighted response: dots sampled from denser ink are treated as
      // heavier, so every force below (spring, gravity, turbulence, pointer)
      // moves them less — a cheap parallax/inertia cue tied to the plate art.
      const wgt = depthOn ? 1 / (1 + this.covArr[i] * p.depthWeight * 3) : 1;
      let hx = this.home[ix];
      let hy = this.home[iy];
      if (orbitOn) {
        const angle = this.randF[ix] * Math.PI * 2 + t * ORBIT_SPEED;
        const amp = this.cell * ORBIT_AMPLITUDE * p.orbitStrength;
        hx += Math.cos(angle) * amp;
        hy += Math.sin(angle) * amp;
      }
      if (turbOn) {
        // Sum of two off-frequency sines per particle, phase-shifted by its
        // random seed, so the drift reads as loose ambient noise rather than
        // a synchronized wobble.
        const ph = this.randF[ix] * 6.2832,
          ph2 = this.randF[iy] * 6.2832;
        hx += (Math.sin(t * 0.7 + ph) + Math.sin(t * 1.9 + ph * 1.7)) * 0.5 * turbAmp;
        hy += (Math.cos(t * 0.8 + ph2) + Math.sin(t * 2.3 + ph2 * 1.3)) * 0.5 * turbAmp;
      }
      let vx = (this.vel[ix] + (hx - px) * (K * (0.7 + 0.6 * this.randF[ix]) * wgt)) * DAMP;
      let vy = (this.vel[iy] + (hy - py) * (K * (0.7 + 0.6 * this.randF[iy]) * wgt)) * DAMP;
      if (gravOn) {
        vx += gAx * wgt;
        vy += gAy * wgt;
      }
      if (this.mAct && kick) {
        const dx = px - this.mx,
          dy = py - this.my,
          d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 4;
          const f = Math.max(0, 1 - d / R);
          const s = (kick * Math.pow(f, falloffK) * attractDir * wgt) / d;
          // Coherent tangential spin around the pointer (same rotational
          // direction for every particle, unlike a per-particle random
          // jitter) so high swirl reads as a real vortex, not extra noise.
          const spin = s * p.swirl * 2.6 * (0.85 + 0.3 * this.randF[ix]);
          vx += dx * s - dy * spin;
          vy += dy * s + dx * spin;
        }
      }
      this.vel[ix] = vx;
      this.vel[iy] = vy;
      this.pos[ix] = px + vx;
      this.pos[iy] = py + vy;
      energy += vx * vx + vy * vy;
    }
    return energy / this.count;
  }

  private hex2rgb(h: string): [number, number, number] {
    return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
  }

  private draw() {
    const gl = this.gl!;
    const p = this.params;
    const ink = this.hex2rgb(p.ink),
      paper = this.hex2rgb(p.paper);
    gl.clearColor(paper[0], paper[1], paper[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(this.uInk, ink);
    gl.uniform1f(this.uScale, p.dotScale);
    gl.uniform1f(this.uMode, p.mark === "ascii" ? 1 : 0);
    gl.uniform1f(this.uGlyphN, this.glyphN);
    gl.uniform1f(this.uUseRamp, p.depthRamp ? 1 : 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.vertexAttribPointer(this.locPos, 2, gl.FLOAT, false, 0, 0);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }

  private frameLoop(now: number) {
    const e = this.step(now);
    this.draw();
    const introDone = now - this.t0 > this.params.stagger * 1000 + 2500;
    const restless = (this.params.orbit || this.params.turbulence > 0) && !this.reduced;
    this.still = !restless && e < 0.0004 && !this.mAct && introDone ? this.still + 1 : 0;
    if (this.still > 45) {
      this.raf = 0;
      return;
    }
    this.raf = requestAnimationFrame(this.loopBound);
  }

  wake() {
    if (!this.raf && this.gl && this.count) this.raf = requestAnimationFrame(this.loopBound);
  }

  // ---------- public controls ----------
  private queueRebuild() {
    clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => this.rebuild(), 180);
  }

  private queueAtlas() {
    clearTimeout(this.atlasTimer);
    this.atlasTimer = window.setTimeout(() => this.buildAtlas(), 150);
  }

  setParams(patch: Partial<ScatterParams>) {
    Object.assign(this.params, patch);
    saveParams(this.params);
    const keys = Object.keys(patch);
    if (keys.some((k) => REBUILD_KEY_SET.has(k))) this.queueRebuild();
    if ("charset" in patch) this.queueAtlas();
    if ("rampColors" in patch) this.buildRamp();
    this.wake();
  }

  resetTo(params: ScatterParams) {
    this.params = { ...params };
    saveParams(this.params);
    this.buildAtlas();
    this.buildRamp();
    this.rebuild();
  }

  replay() {
    if (!this.reduced) this.seedRandom();
    else this.snapHome();
    this.wake();
  }

  exportPNG(): string | null {
    if (!this.gl) return null;
    // Draw one fresh frame right before reading pixels so the export always
    // reflects current params even if the sim has gone idle.
    this.draw();
    return this.canvas.toDataURL("image/png");
  }

  private gifBusy = false;

  // Captures a short looping clip of whatever motion is currently playing
  // (hover drift, orbit, turbulence, a burst in progress...) as an animated
  // GIF. Drives the sim's own step/draw loop manually at a fixed cadence
  // instead of sampling the ambient rAF loop, so the clip's playback speed
  // is deterministic regardless of how long encoding each frame takes.
  async exportGIF(): Promise<Blob | null> {
    if (!this.gl || this.gifBusy) return null;
    this.gifBusy = true;
    try {
      const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

      // Pause the ambient render loop for the duration of the capture so we
      // don't double-step the physics.
      if (this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }

      const FPS = 12;
      const DURATION_MS = 1800;
      const FRAME_DELAY = Math.round(1000 / FPS);
      const TOTAL_FRAMES = Math.round(DURATION_MS / FRAME_DELAY);
      const MAX_DIM = 480;

      const srcW = this.canvas.width,
        srcH = this.canvas.height;
      const scale = Math.min(1, MAX_DIM / Math.max(srcW, srcH));
      const outW = Math.max(2, Math.round(srcW * scale));
      const outH = Math.max(2, Math.round(srcH * scale));

      const sample = document.createElement("canvas");
      sample.width = outW;
      sample.height = outH;
      const sctx = sample.getContext("2d", { willReadFrequently: true })!;

      const gif = GIFEncoder();
      let now = performance.now();
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        now += FRAME_DELAY;
        this.step(now);
        this.draw();
        sctx.drawImage(this.canvas, 0, 0, outW, outH);
        const { data } = sctx.getImageData(0, 0, outW, outH);
        const palette = quantize(data, 256);
        const index = applyPalette(data, palette);
        gif.writeFrame(index, outW, outH, { palette, delay: FRAME_DELAY, repeat: 0 });
        // Yield to the browser between frames so a long capture doesn't
        // freeze the tab.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      gif.finish();
      return new Blob([new Uint8Array(gif.bytes())], { type: "image/gif" });
    } finally {
      this.gifBusy = false;
      this.wake();
    }
  }

  dispose() {
    clearTimeout(this.rebuildTimer);
    clearTimeout(this.atlasTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener("pointerenter", this.onPointerEnter);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
  }
}
