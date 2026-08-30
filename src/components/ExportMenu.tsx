import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportMenuProps {
  onExportPNG: () => void;
  onExportGIF: () => void;
  gifExporting: boolean;
  onExportSVG: () => void;
  svgExporting: boolean;
}

export function ExportMenu({
  onExportPNG,
  onExportGIF,
  gifExporting,
  onExportSVG,
  svgExporting,
}: ExportMenuProps) {
  const busy = gifExporting || svgExporting;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Export"
          className="fixed top-4 right-4 z-50 bg-background"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onExportPNG}>Export PNG</DropdownMenuItem>
        <DropdownMenuItem onSelect={onExportGIF} disabled={busy}>
          {gifExporting ? "Rendering GIF…" : "Export GIF"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onExportSVG} disabled={busy}>
          {svgExporting ? "Rendering SVG…" : "Export animated SVG"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
