import { useRef, useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { parseFile, type ParsedTable } from "@/lib/crm/parsers";
import { cn } from "@/lib/utils";

interface Props {
  onParsed: (table: ParsedTable, fileName: string) => void;
}

export default function FileUploader({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const table = await parseFile(file);
        if (!table.rows.length) throw new Error("No data rows found in the file.");
        onParsed(table, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse file.");
      } finally {
        setLoading(false);
      }
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {loading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Parsing file…</span>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Drop your file here or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">Supports Excel (.xlsx, .xls), CSV, and PDF</p>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span>Tip: Ensure row 1 contains column headers (Name, Phone, Budget, etc.)</span>
      </div>
    </div>
  );
}
