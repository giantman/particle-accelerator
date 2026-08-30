import { useState, type DragEvent, type RefObject } from "react";

interface StageProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  frameRef: RefObject<HTMLDivElement>;
  stats: string;
  glAvailable: boolean;
  onDropFiles: (files: FileList) => void;
}

export function Stage({ canvasRef, frameRef, stats, glAvailable, onDropFiles }: StageProps) {
  const [dragover, setDragover] = useState(false);

  const enter = (e: DragEvent) => {
    e.preventDefault();
    setDragover(true);
  };
  const leave = (e: DragEvent) => {
    e.preventDefault();
    setDragover(false);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragover(false);
    if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files);
  };

  return (
    <div className="flex h-screen min-w-0 flex-1 flex-col">
      <div
        className="relative flex flex-1 min-h-0 items-center justify-center bg-background"
        ref={frameRef}
        onDragEnter={enter}
        onDragOver={enter}
        onDragLeave={leave}
        onDrop={drop}
      >
        {glAvailable ? (
          <canvas
            ref={canvasRef}
            className="block max-w-full touch-none cursor-crosshair"
            aria-label="Halftone particle rendering of the loaded image; dots scatter under the cursor, a click blasts them outward, and they re-form on their own."
          />
        ) : (
          <p className="p-6 text-[13px]">WebGL is unavailable in this browser, so the press cannot run.</p>
        )}
        {dragover && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/82 text-sm text-foreground">
            Drop to press
          </div>
        )}
      </div>
      <div className="flex flex-none flex-wrap justify-between gap-3.5 border-t border-border px-[18px] py-2.5 text-xs text-muted-foreground">
        <span className="tabular-nums text-foreground">{stats}</span>
        <span>Hover stirs &middot; click blasts &middot; dials re-tune</span>
      </div>
    </div>
  );
}
