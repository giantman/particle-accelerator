import type { ScatterParams } from "../engine/params";

interface InkGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  swapInks: () => void;
}

export function InkGroup({ params, updateParam, swapInks }: InkGroupProps) {
  return (
    <div className="group">
      <h2>INKS</h2>
      <div className="row">
        <label htmlFor="inkColor">INK</label>
        <input
          type="color"
          id="inkColor"
          value={params.ink}
          onChange={(e) => updateParam("ink", e.target.value)}
        />
      </div>
      <div className="row">
        <label htmlFor="paperColor">PAPER</label>
        <input
          type="color"
          id="paperColor"
          value={params.paper}
          onChange={(e) => updateParam("paper", e.target.value)}
        />
      </div>
      <button className="btn ghost" type="button" onClick={swapInks}>
        SWAP INKS
      </button>
    </div>
  );
}
