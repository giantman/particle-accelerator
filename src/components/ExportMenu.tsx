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
}

export function ExportMenu({ onExportPNG, onExportGIF, gifExporting }: ExportMenuProps) {
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
          {gifExporting ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onExportPNG}>Export PNG</DropdownMenuItem>
        <DropdownMenuItem onSelect={onExportGIF} disabled={gifExporting}>
          {gifExporting ? "Rendering GIF…" : "Export GIF"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
