import { MAX_RAMP_STOPS, MIN_RAMP_STOPS, type ScatterParams } from "../engine/params";

interface InkGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  swapInks: () => void;
}

export function InkGroup({ params, updateParam, swapInks }: InkGroupProps) {
  const stops = params.rampColors;

  const setStop = (i: number, color: string) => {
    const next = [...stops];
    next[i] = color;
    updateParam("rampColors", next);
  };
  const addStop = () => {
    if (stops.length >= MAX_RAMP_STOPS) return;
    updateParam("rampColors", [...stops, stops[stops.length - 1]]);
  };
  const removeStop = (i: number) => {
    if (stops.length <= MIN_RAMP_STOPS) return;
    updateParam(
      "rampColors",
      stops.filter((_, idx) => idx !== i)
    );
  };

  return (
    <div className="group">
      <h2>INKS</h2>

      {!params.depthRamp && (
        <div className="row">
          <label htmlFor="inkColor">INK</label>
          <input
            type="color"
            id="inkColor"
            value={params.ink}
            onChange={(e) => updateParam("ink", e.target.value)}
          />
        </div>
      )}
      <div className="row">
        <label htmlFor="paperColor">PAPER</label>
        <input
          type="color"
          id="paperColor"
          value={params.paper}
          onChange={(e) => updateParam("paper", e.target.value)}
        />
      </div>
      <button className="btn ghost" type="button" onClick={swapInks} disabled={params.depthRamp}>
        SWAP INKS
      </button>

      <div className="row">
        <span className="check">
          <input
            type="checkbox"
            id="depthRamp"
            checked={params.depthRamp}
            onChange={(e) => updateParam("depthRamp", e.target.checked)}
          />
          <label htmlFor="depthRamp">DEPTH RAMP</label>
        </span>
      </div>

      {params.depthRamp && (
        <>
          {stops.map((color, i) => (
            <div className="row" key={i}>
              <label>STOP {i + 1}</label>
              <input type="color" value={color} onChange={(e) => setStop(i, e.target.value)} />
              {stops.length > MIN_RAMP_STOPS && (
                <button
                  className="btn ghost"
                  type="button"
                  style={{ width: "auto", flex: "none", padding: "6px 9px" }}
                  aria-label={`Remove stop ${i + 1}`}
                  onClick={() => removeStop(i)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {stops.length < MAX_RAMP_STOPS && (
            <button className="btn ghost" type="button" onClick={addStop}>
              ADD COLOR
            </button>
          )}
        </>
      )}
    </div>
  );
}
