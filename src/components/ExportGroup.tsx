interface ExportGroupProps {
  onExportPNG: () => void;
}

export function ExportGroup({ onExportPNG }: ExportGroupProps) {
  return (
    <div className="group">
      <h2>EXPORT</h2>
      <button className="btn" type="button" onClick={onExportPNG}>
        EXPORT PNG
      </button>
    </div>
  );
}
