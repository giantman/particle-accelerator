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
const ORBIT_AMPLITUDE = 0.4; // fraction of a grid cell

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
  private bufPos!: WebGLBuffer | null;
  private bufCov!: WebGLBuffer | null;
  private bufRand!: WebGLBuffer | null;
  private locPos = 0;
  private locCov = 0;
  private locRand = 0;

  private atlasTex: WebGLTexture | null = null;
  private glyphN = 1;

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
      attribute vec2 aPos; attribute float aCov; attribute vec2 aRand;
      uniform vec2 uSize; uniform float uCell, uDpr, uScale, uMode;
      varying float vCov;
      void main() {
        vec2 clip = vec2(aPos.x / uSize.x * 2.0 - 1.0, 1.0 - aPos.y / uSize.y * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
        float dDot = uCell * uScale * (1.2 * sqrt(aCov) + 0.5 * aCov * aCov) * (0.94 + 0.12 * aRand.x);
        float dChar = uCell * uScale * 1.45;
        float d = mix(dDot, dChar, uMode);
        gl_PointSize = max(d * uDpr, 1.15);
        vCov = aCov;
      }`;
    const fsrc = `
      precision mediump float;
      uniform vec3 uInk;
      uniform highp float uMode, uGlyphN;
      uniform sampler2D uAtlas;
      varying float vCov;
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
        gl_FragColor = vec4(uInk, a);
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
    gl.uniform1i(this.uAtlasLoc, 0);
    this.bufPos = gl.createBuffer();
    this.bufCov = gl.createBuffer();
    this.bufRand = gl.createBuffer();
    this.locPos = gl.getAttribLocation(prog, "aPos");
    this.locCov = gl.getAttribLocation(prog, "aCov");
    this.locRand = gl.getAttribLocation(prog, "aRand");
    gl.enableVertexAttribArray(this.locPos);
    gl.enableVertexAttribArray(this.locCov);
    gl.enableVertexAttribArray(this.locRand);
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

  // ---------- plates ----------
  addPlate(img: HTMLImageElement): number {
    if (this.plates.length >= MAX_PLATES) {
      this.callbacks.onStats?.(`PLATE TRAY FULL · ${MAX_PLATES} MAX.`);
      return this.current;
    }
    const sc = Math.min(
      1,
      2000 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)
    );
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
    const shape = this.params.mask || "rect";
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCov);
    gl.bufferData(gl.ARRAY_BUFFER, this.covArr, gl.STATIC_DRAW);
    gl.vertexAttribPointer(this.locCov, 1, gl.FLOAT, false, 0, 0);
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
    const plateSuffix = this.plates.length > 1 ? ` · PLATE ${this.current + 1}/${this.plates.length}` : "";
    this.callbacks.onStats?.(`${count.toLocaleString()} DOTS · ${gw} × ${gh} CELLS${plateSuffix}`);
    this.wake();
  }

  resize() {
    const gl = this.gl;
    if (!gl || !this.count) return;
    const frame = this.canvas.parentElement;
    if (!frame) return;
    const availW = frame.clientWidth - 3;
    const maxH = Math.max(320, Math.min(720, innerHeight * 0.78));
    const cssW = Math.min(availW, Math.round((maxH * this.GW) / this.GH));
    const cssH = Math.round((cssW * this.GH) / this.GW);
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

  private burst(bx: number, by: number) {
    if (this.reduced || !this.count) return;
    const p = this.params;
    const L = Math.max(80, this.W * p.radius * 2.2);
    const A = 16 * p.strength * (this.W / 640);
    for (let i = 0; i < this.count; i++) {
      const ix = i * 2,
        iy = ix + 1;
      const dx = this.pos[ix] - bx,
        dy = this.pos[iy] - by;
      const d = Math.sqrt(dx * dx + dy * dy) + 6;
      const m = A * Math.exp(-d / L);
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
      let hx = this.home[ix];
      let hy = this.home[iy];
      if (p.orbit && !this.reduced) {
        const angle = this.randF[ix] * Math.PI * 2 + (now / 1000) * ORBIT_SPEED;
        const amp = this.cell * ORBIT_AMPLITUDE;
        hx += Math.cos(angle) * amp;
        hy += Math.sin(angle) * amp;
      }
      let vx = (this.vel[ix] + (hx - px) * (K * (0.7 + 0.6 * this.randF[ix]))) * DAMP;
      let vy = (this.vel[iy] + (hy - py) * (K * (0.7 + 0.6 * this.randF[iy]))) * DAMP;
      if (this.mAct && kick) {
        const dx = px - this.mx,
          dy = py - this.my,
          d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + 4;
          const f = 1 - d / R;
          const s = (kick * f * f) / d;
          const sw = p.swirl;
          vx += dx * s - dy * s * sw * (this.randF[ix] - 0.5) * 2.0;
          vy += dy * s + dx * s * sw * (this.randF[iy] - 0.5) * 2.0;
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
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.vertexAttribPointer(this.locPos, 2, gl.FLOAT, false, 0, 0);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }

  private frameLoop(now: number) {
    const e = this.step(now);
    this.draw();
    const introDone = now - this.t0 > this.params.stagger * 1000 + 2500;
    const orbiting = this.params.orbit && !this.reduced;
    this.still = !orbiting && e < 0.0004 && !this.mAct && introDone ? this.still + 1 : 0;
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
    this.wake();
  }

  resetTo(params: ScatterParams) {
    this.params = { ...params };
    saveParams(this.params);
    this.buildAtlas();
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
