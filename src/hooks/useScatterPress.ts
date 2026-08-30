import { useCallback, useEffect, useRef, useState } from "react";
import { ScatterPressEngine } from "../engine/ScatterPressEngine";
import { DEFAULTS, loadParams, saveParams, type ScatterParams } from "../engine/params";
import { DEFAULT_IMG } from "../engine/defaultImage";

export function useScatterPress() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ScatterPressEngine | null>(null);

  const [params, setParams] = useState<ScatterParams>(() => loadParams());
  const [plates, setPlates] = useState<string[]>([]);
  const [current, setCurrent] = useState(-1);
  const [stats, setStats] = useState("");
  const [glAvailable, setGlAvailable] = useState(true);
  const [gifExporting, setGifExporting] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new ScatterPressEngine(canvasRef.current, {
      onStats: setStats,
      onPlates: (thumbs, i) => {
        setPlates(thumbs);
        setCurrent(i);
      },
    });
    engineRef.current = engine;
    setGlAvailable(engine.available);

    if (engine.available) {
      engine.setParams(params);
      if (frameRef.current) engine.observeResize(frameRef.current);

      const img = new Image();
      img.onload = () => engine.addPlate(img);
      img.src = DEFAULT_IMG;
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
    stats,
    exportPNG,
    exportGIF,
    gifExporting,
    glAvailable,
  };
}
