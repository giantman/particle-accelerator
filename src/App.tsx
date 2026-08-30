import { useScatterPress } from "./hooks/useScatterPress";
import { PlateGroup } from "./components/PlateGroup";
import { InkGroup } from "./components/InkGroup";
import { PhysicsGroup } from "./components/PhysicsGroup";
import { AssemblyGroup } from "./components/AssemblyGroup";
import { ExportGroup } from "./components/ExportGroup";
import { Stage } from "./components/Stage";

export default function App() {
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
    stats,
    exportPNG,
    glAvailable,
  } = useScatterPress();

  const addFiles = (files: FileList) => [...files].forEach((f) => addPlateFromFile(f));

  return (
    <div className="studio">
      <aside>
        <PlateGroup
          params={params}
          updateParam={updateParam}
          plates={plates}
          current={current}
          onSelectPlate={selectPlate}
          onAddFiles={addFiles}
        />
        <InkGroup params={params} updateParam={updateParam} swapInks={swapInks} />
        <PhysicsGroup params={params} updateParam={updateParam} />
        <AssemblyGroup params={params} updateParam={updateParam} replay={replay} />
        <ExportGroup onExportPNG={exportPNG} />
        <button className="btn ghost" type="button" onClick={resetAll}>
          RESET
        </button>
      </aside>

      <Stage
        canvasRef={canvasRef}
        frameRef={frameRef}
        stats={stats}
        glAvailable={glAvailable}
        onDropFiles={addFiles}
      />
      <noscript>The press needs JavaScript to run.</noscript>
    </div>
  );
}
