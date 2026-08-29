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
    <div className="stage">
      <div
        className={"frame" + (dragover ? " dragover" : "")}
        ref={frameRef}
        onDragEnter={enter}
        onDragOver={enter}
        onDragLeave={leave}
        onDrop={drop}
      >
        {glAvailable ? (
          <canvas
            ref={canvasRef}
            aria-label="Halftone particle rendering of the loaded image; dots scatter under the cursor, a click blasts them outward, and they re-form on their own."
          />
        ) : (
          <p style={{ padding: 24, fontSize: 13 }}>
            WebGL is unavailable in this browser, so the press cannot run.
          </p>
        )}
      </div>
      <div className="plate-mark">
        <span>{stats}</span>
        <span>HOVER STIRS &middot; CLICK BLASTS &middot; DIALS RE-TUNE</span>
      </div>
    </div>
  );
}
