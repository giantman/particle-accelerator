import { useCallback, useEffect, useRef, useState } from "react";
import { ScatterPressEngine } from "../engine/ScatterPressEngine";
import { DEFAULTS, loadParams, loadPlates, savePlates, saveParams, type ScatterParams } from "../engine/params";
import { DEFAULT_IMG } from "../engine/defaultImage";

export function useScatterPress() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ScatterPressEngine | null>(null);
  // Only persist plates once there's something worth restoring — an upload,
  // or plates we already restored from a previous session — so a fresh
  // visit that never touches the default image doesn't write it to storage.
  const persistPlatesRef = useRef(false);

  const [params, setParams] = useState<ScatterParams>(() => loadParams());
  const [plates, setPlates] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [stats, setStats] = useState("");
  const [glAvailable, setGlAvailable] = useState(true);
  const [gifExporting, setGifExporting] = useState(false);
  const [svgExporting, setSvgExporting] = useState(false);
  const [wellCount, setWellCount] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ScatterPressEngine(canvasRef.current, {
      onStats: setStats,
      onPlates: (thumbs, i, sources) => {
        setPlates(thumbs);
        setCurrent(i);
        if (persistPlatesRef.current) savePlates(sources, i);
      },
      onWells: setWellCount,
    });
    engineRef.current = engine;
    setGlAvailable(engine.available);

    if (engine.available) {
      engine.setParams(params);
      if (frameRef.current) engine.observeResize(frameRef.current);

      const stored = loadPlates();
      if (stored) {
        persistPlatesRef.current = true;
        (async () => {
          for (const src of stored.sources) {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                engine.addPlate(img);
                resolve();
              };
              img.onerror = () => resolve();
              img.src = src;
            });
          }
          const clamped = Math.min(Math.max(stored.current, 0), stored.sources.length - 1);
          engine.selectPlate(clamped);
        })();
      } else {
        const img = new Image();
        img.onload = () => engine.addPlate(img);
        img.src = DEFAULT_IMG;
      }
    }

    return () => engine.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateParam = useCallback(<K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      saveParams(next);
      return next;
    });
    engineRef.current?.setParams({ [key]: value } as Partial<ScatterParams>);
  }, []);

  const swapInks = useCallback(() => {
    setParams((prev) => {
      const next = { ...prev, ink: prev.paper, paper: prev.ink };
      saveParams(next);
      engineRef.current?.setParams({ ink: next.ink, paper: next.paper });
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const next = { ...DEFAULTS };
    setParams(next);
    saveParams(next);
    engineRef.current?.resetTo(next);
  }, []);

  const replay = useCallback(() => engineRef.current?.replay(), []);

  const addPlateFromFile = useCallback((file: File) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      setStats("That file is not an image.");
      return;
    }
    const isVector = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    setStats("Pressing…");
    persistPlatesRef.current = true;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => engineRef.current?.addPlate(img, isVector);
      img.onerror = () => setStats("Could not decode that image — try jpg / png / webp.");
      img.src = rd.result as string;
    };
    rd.onerror = () => setStats("Could not read that file.");
    rd.readAsDataURL(file);
  }, []);

  const selectPlate = useCallback((i: number) => engineRef.current?.selectPlate(i), []);
  const removePlate = useCallback((i: number) => engineRef.current?.removePlate(i), []);
  const movePlate = useCallback((from: number, to: number) => engineRef.current?.movePlate(from, to), []);
  const clearWells = useCallback(() => engineRef.current?.clearWells(), []);

  // Auto-advance through plates on a timer. Reads `current`/plate count via
  // refs (kept fresh below) rather than closing over them directly, so the
  // interval doesn't need to restart — and lose its phase — every time the
  // selected plate changes; it only restarts when the loop settings
  // themselves change.
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);
  const plateCountRef = useRef(plates.length);
  useEffect(() => {
    plateCountRef.current = plates.length;
  }, [plates.length]);
  const loopDirectionRef = useRef(1);

  useEffect(() => {
    if (!params.loopEnabled) return;
    // Don't gate on plateCountRef here — on reload, restored plates finish
    // loading asynchronously after this effect first runs, and this effect
    // doesn't depend on plate count, so it would never re-fire to create
    // the interval once they're ready. The per-tick check below handles
    // "not enough plates (yet)" instead.
    const id = window.setInterval(() => {
      const count = plateCountRef.current;
      if (count < 2) return;
      const cur = currentRef.current;
      let next = cur;
      if (params.loopMode === "shuffle") {
        do {
          next = Math.floor(Math.random() * count);
        } while (next === cur && count > 1);
      } else if (params.loopMode === "pingpong") {
        let dir = loopDirectionRef.current;
        next = cur + dir;
        if (next >= count) {
          dir = -1;
          next = count - 2;
        } else if (next < 0) {
          dir = 1;
          next = 1;
        }
        loopDirectionRef.current = dir;
      } else {
        next = (cur + 1) % count;
      }
      engineRef.current?.selectPlate(next);
    }, Math.max(0.5, params.loopInterval) * 1000);
    return () => window.clearInterval(id);
  }, [params.loopEnabled, params.loopInterval, params.loopMode]);

  const exportPNG = useCallback(() => {
    const url = engineRef.current?.exportPNG();
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "scatter-press.png";
    a.click();
  }, []);

  const exportGIF = useCallback(async () => {
    if (!engineRef.current || gifExporting) return;
    setGifExporting(true);
    setStats("Rendering GIF…");
    try {
      const blob = await engineRef.current.exportGIF();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scatter-press.gif";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGifExporting(false);
    }
  }, [gifExporting]);

  const exportSVG = useCallback(async () => {
    if (!engineRef.current || svgExporting) return;
    setSvgExporting(true);
    setStats("Rendering SVG…");
    try {
      const svg = await engineRef.current.exportSVG();
      if (!svg) return;
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scatter-press.svg";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setSvgExporting(false);
    }
  }, [svgExporting]);

  return {
    canvasRef,
    frameRef,
    params,
    updateParam,
    swapInks,
    resetAll,
    replay,
    plates,
    current,
    addPlateFromFile,
    selectPlate,
    removePlate,
    movePlate,
    wellCount,
    clearWells,
    stats,
    exportPNG,
    exportGIF,
    gifExporting,
    exportSVG,
    svgExporting,
    glAvailable,
  };
}
