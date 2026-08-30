import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useScatterPress } from "./hooks/useScatterPress";
import { PlateGroup } from "./components/PlateGroup";
import { InkGroup } from "./components/InkGroup";
import { PhysicsGroup } from "./components/PhysicsGroup";
import { AssemblyGroup } from "./components/AssemblyGroup";
import { LoopGroup } from "./components/LoopGroup";
import { ExportMenu } from "./components/ExportMenu";
import { Stage } from "./components/Stage";
import { AccordionSection } from "./components/AccordionSection";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = ["plate", "inks", "physics", "assembly", "loop"];

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {
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
    stats,
    exportPNG,
    exportGIF,
    gifExporting,
    exportSVG,
    svgExporting,
    glAvailable,
  } = useScatterPress();

  const addFiles = (files: FileList) => [...files].forEach((f) => addPlateFromFile(f));

  return (
    <div className="flex h-screen w-screen">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={sidebarOpen ? "Hide toolbar" : "Show toolbar"}
        aria-pressed={sidebarOpen}
        className="fixed top-4 left-4 z-50 bg-background"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {sidebarOpen ? <X /> : <Menu />}
      </Button>
      <ExportMenu
        onExportPNG={exportPNG}
        onExportGIF={exportGIF}
        gifExporting={gifExporting}
        onExportSVG={exportSVG}
        svgExporting={svgExporting}
      />

      <aside
        className={cn(
          "box-border flex h-screen shrink-0 flex-col gap-3 overflow-y-auto border-r border-border transition-[width] duration-200",
          sidebarOpen ? "w-[280px] p-5 pt-16" : "w-0 overflow-hidden border-r-0 p-0"
        )}
      >
        <Accordion type="multiple" defaultValue={SECTIONS}>
          <AccordionSection value="plate" title="Plate">
            <PlateGroup
              params={params}
              updateParam={updateParam}
              plates={plates}
              current={current}
              onSelectPlate={selectPlate}
              onRemovePlate={removePlate}
              onMovePlate={movePlate}
              onAddFiles={addFiles}
            />
          </AccordionSection>
          <AccordionSection value="inks" title="Inks">
            <InkGroup params={params} updateParam={updateParam} swapInks={swapInks} />
          </AccordionSection>
          <AccordionSection value="physics" title="Physics">
            <PhysicsGroup params={params} updateParam={updateParam} />
          </AccordionSection>
          <AccordionSection value="assembly" title="Assembly">
            <AssemblyGroup params={params} updateParam={updateParam} replay={replay} />
          </AccordionSection>
          <AccordionSection value="loop" title="Loop">
            <LoopGroup params={params} updateParam={updateParam} plateCount={plates.length} />
          </AccordionSection>
        </Accordion>

        <Button type="button" variant="outline" className="w-full" onClick={resetAll}>
          Reset
        </Button>
      </aside>

      <Stage
        canvasRef={canvasRef}
        frameRef={frameRef}
        stats={stats}
        glAvailable={glAvailable}
        paper={params.paper}
        onDropFiles={addFiles}
      />
      <noscript>The press needs JavaScript to run.</noscript>
    </div>
  );
}
