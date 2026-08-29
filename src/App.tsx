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
      <header>
        <p className="eyebrow">TWO-COLOR HALFTONE ENGINE</p>
        <h1>Scatter Press</h1>
        <p className="hint">
          Drop any photo on the plate. Hover stirs the ink; click fires a blast; every dial below re-tunes the
          press.
        </p>
      </header>

      <div className="layout">
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
            RESET PRESS
          </button>
        </aside>

        <Stage
          canvasRef={canvasRef}
          frameRef={frameRef}
          stats={stats}
          glAvailable={glAvailable}
          onDropFiles={addFiles}
        />
      </div>
      <noscript>The press needs JavaScript to run.</noscript>
    </div>
  );
}
