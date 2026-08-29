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
      setStats("THAT FILE IS NOT AN IMAGE.");
      return;
    }
    setStats("PRESSING…");
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => engineRef.current?.addPlate(img);
      img.onerror = () => setStats("COULD NOT DECODE THAT IMAGE — TRY JPG / PNG / WEBP.");
      img.src = rd.result as string;
    };
    rd.onerror = () => setStats("COULD NOT READ THAT FILE.");
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
    glAvailable,
  };
}
