import { useRef } from "react";
import { RangeRow } from "./RangeRow";
import { fmt, type MaskShape, type ScatterParams } from "../engine/params";

interface PlateGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  plates: string[];
  current: number;
  onSelectPlate: (i: number) => void;
  onAddFiles: (files: FileList) => void;
}

export function PlateGroup({ params, updateParam, plates, current, onSelectPlate, onAddFiles }: PlateGroupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="group">
      <h2>PLATE</h2>
      <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>
        UPLOAD IMAGE
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          if (e.target.files) onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {plates.length >= 2 && (
        <div className="tray">
          {plates.map((thumb, i) => (
            <button
              key={i}
              type="button"
              className={"chip" + (i === current ? " active" : "")}
              style={{ backgroundImage: `url(${thumb})` }}
              aria-label={`Plate ${i + 1}${i === current ? " (current)" : ""}`}
              onClick={() => i !== current && onSelectPlate(i)}
            />
          ))}
        </div>
      )}

      <div className="row">
        <label>MARK</label>
        <span className="seg" role="group" aria-label="Mark style">
          <button
            className={"btn" + (params.mark !== "dot" ? " ghost" : "")}
            type="button"
            aria-pressed={params.mark === "dot"}
            onClick={() => updateParam("mark", "dot")}
          >
            DOT
          </button>
          <button
            className={"btn" + (params.mark !== "ascii" ? " ghost" : "")}
            type="button"
            aria-pressed={params.mark === "ascii"}
            onClick={() => updateParam("mark", "ascii")}
          >
            ASCII
          </button>
        </span>
      </div>

      {params.mark === "ascii" && (
        <div className="row">
          <label htmlFor="charset">CHARSET</label>
          <input
            type="text"
            id="charset"
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            placeholder="LIGHT → DARK"
            value={params.charset}
            onChange={(e) => updateParam("charset", e.target.value || ".")}
          />
        </div>
      )}

      <RangeRow
        id="density"
        label="DENSITY"
        min={120}
        max={512}
        step={8}
        value={params.density}
        format={fmt.density}
        onChange={(v) => updateParam("density", v)}
      />
      <RangeRow
        id="dotScale"
        label="DOT SIZE"
        min={0.6}
        max={1.8}
        step={0.05}
        value={params.dotScale}
        format={fmt.dotScale}
        onChange={(v) => updateParam("dotScale", v)}
      />
      <RangeRow
        id="contrast"
        label="CONTRAST"
        min={0.5}
        max={2.2}
        step={0.05}
        value={params.contrast}
        format={fmt.contrast}
        onChange={(v) => updateParam("contrast", v)}
      />
      <RangeRow
        id="midtone"
        label="MIDTONES"
        min={0.5}
        max={2}
        step={0.05}
        value={params.midtone}
        format={fmt.midtone}
        onChange={(v) => updateParam("midtone", v)}
      />

      <div className="row">
        <span className="check">
          <input
            type="checkbox"
            id="invert"
            checked={params.invert}
            onChange={(e) => updateParam("invert", e.target.checked)}
          />
          <label htmlFor="invert">INVERT PLATE</label>
        </span>
      </div>

      <div className="row">
        <span className="check">
          <input
            type="checkbox"
            id="maskEnabled"
            checked={params.maskEnabled}
            onChange={(e) => updateParam("maskEnabled", e.target.checked)}
          />
          <label htmlFor="maskEnabled">MASK</label>
        </span>
      </div>

      {params.maskEnabled && (
        <div className="row">
          <label htmlFor="maskShape">SHAPE</label>
          <select
            id="maskShape"
            value={params.mask}
            onChange={(e) => updateParam("mask", e.target.value as MaskShape)}
          >
            <option value="square">SQUARE</option>
            <option value="oval">OVAL</option>
            <option value="circle">CIRCLE</option>
          </select>
        </div>
      )}
    </div>
  );
}
