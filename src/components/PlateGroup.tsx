import { useRef } from "react";
import { RangeRow } from "./RangeRow";
import { CheckboxField } from "./CheckboxField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    <>
      <Button type="button" className="w-full" onClick={() => fileInputRef.current?.click()}>
        Upload image
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {plates.length >= 2 && (
        <div className="flex flex-wrap gap-1.5">
          {plates.map((thumb, i) => (
            <button
              key={i}
              type="button"
              className={
                "h-9 w-[46px] cursor-pointer rounded-md border bg-cover bg-center p-0 " +
                (i === current
                  ? "border-primary outline-2 outline-offset-1 outline-primary"
                  : "border-border")
              }
              style={{ backgroundImage: `url(${thumb})` }}
              aria-label={`Plate ${i + 1}${i === current ? " (current)" : ""}`}
              onClick={() => i !== current && onSelectPlate(i)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2.5">
        <Label className="w-28 shrink-0 text-xs font-normal text-muted-foreground">Mark</Label>
        <div className="flex flex-1 gap-1.5" role="group" aria-label="Mark style">
          <Button
            type="button"
            size="sm"
            className="flex-1"
            variant={params.mark === "dot" ? "default" : "outline"}
            aria-pressed={params.mark === "dot"}
            onClick={() => updateParam("mark", "dot")}
          >
            Dot
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1"
            variant={params.mark === "ascii" ? "default" : "outline"}
            aria-pressed={params.mark === "ascii"}
            onClick={() => updateParam("mark", "ascii")}
          >
            Ascii
          </Button>
        </div>
      </div>

      {params.mark === "ascii" && (
        <div className="flex items-center justify-between gap-2.5">
          <Label htmlFor="charset" className="w-28 shrink-0 text-xs font-normal text-muted-foreground">
            Charset
          </Label>
          <Input
            type="text"
            id="charset"
            maxLength={24}
            spellCheck={false}
            autoComplete="off"
            placeholder="Light → dark"
            value={params.charset}
            onChange={(e) => updateParam("charset", e.target.value || ".")}
            className="h-7 flex-1 text-xs"
          />
        </div>
      )}

      <RangeRow
        id="density"
        label="Density"
        min={120}
        max={512}
        step={8}
        value={params.density}
        format={fmt.density}
        onChange={(v) => updateParam("density", v)}
      />
      <RangeRow
        id="dotScale"
        label="Dot size"
        min={0.6}
        max={3}
        step={0.05}
        value={params.dotScale}
        format={fmt.dotScale}
        onChange={(v) => updateParam("dotScale", v)}
      />
      <RangeRow
        id="contrast"
        label="Contrast"
        min={0.5}
        max={2.2}
        step={0.05}
        value={params.contrast}
        format={fmt.contrast}
        onChange={(v) => updateParam("contrast", v)}
      />
      <RangeRow
        id="midtone"
        label="Midtones"
        min={0.5}
        max={2}
        step={0.05}
        value={params.midtone}
        format={fmt.midtone}
        onChange={(v) => updateParam("midtone", v)}
      />

      <CheckboxField
        id="invert"
        label="Invert plate"
        checked={params.invert}
        onCheckedChange={(v) => updateParam("invert", v)}
      />
      <CheckboxField
        id="maskEnabled"
        label="Mask"
        checked={params.maskEnabled}
        onCheckedChange={(v) => updateParam("maskEnabled", v)}
      />

      {params.maskEnabled && (
        <div className="flex items-center justify-between gap-2.5">
          <Label htmlFor="maskShape" className="w-28 shrink-0 text-xs font-normal text-muted-foreground">
            Shape
          </Label>
          <Select value={params.mask} onValueChange={(v) => updateParam("mask", v as MaskShape)}>
            <SelectTrigger id="maskShape" size="sm" className="flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="oval">Oval</SelectItem>
              <SelectItem value="circle">Circle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  );
}
