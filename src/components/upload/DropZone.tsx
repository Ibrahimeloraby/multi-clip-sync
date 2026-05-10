import { useCallback, useState } from "react";
import { Upload, X, FileText, Music, Image, Table, File, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MIME_TO_CATEGORY, MAX_FILE_SIZE_MB, MAX_FILES_PER_UPLOAD } from "@/lib/constants";
import type { UploadFile } from "@/types";

function fileIcon(mime: string) {
  const cat = MIME_TO_CATEGORY[mime];
  if (cat === "image") return Image;
  if (cat === "audio") return Music;
  if (cat === "spreadsheet") return Table;
  if (cat === "pdf") return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  files: UploadFile[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}

export default function DropZone({ files, onAdd, onRemove }: Props) {
  const [dragging, setDragging] = useState(false);

  const validate = useCallback((raw: FileList | File[]): File[] => {
    const arr = Array.from(raw);
    return arr.filter((f) => {
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) return false;
      return true;
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const valid = validate(e.dataTransfer.files);
      if (valid.length) onAdd(valid.slice(0, MAX_FILES_PER_UPLOAD - files.length));
    },
    [files.length, onAdd, validate]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const valid = validate(e.target.files);
      if (valid.length) onAdd(valid.slice(0, MAX_FILES_PER_UPLOAD - files.length));
      e.target.value = "";
    },
    [files.length, onAdd, validate]
  );

  return (
    <div className="space-y-4">
      {/* Drop target */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
          dragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-600 hover:border-indigo-500/50 hover:bg-slate-800/50"
        )}
      >
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-colors", dragging ? "bg-indigo-500/20" : "bg-slate-700")}>
          <Upload className={cn("w-6 h-6 transition-colors", dragging ? "text-indigo-400" : "text-slate-400")} />
        </div>
        <div className="text-center">
          <p className="text-white font-medium">
            {dragging ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-slate-400 text-sm mt-1">or click to browse</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {["PDF", "Images", "Audio", "Excel / CSV", "WhatsApp exports", "ZIP"].map((t) => (
            <span key={t} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <p className="text-slate-500 text-xs">Max {MAX_FILE_SIZE_MB} MB per file · Up to {MAX_FILES_PER_UPLOAD} files</p>
        <input
          type="file"
          multiple
          accept={Object.keys(MIME_TO_CATEGORY).join(",")}
          onChange={onInputChange}
          className="sr-only"
        />
      </label>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uf) => {
            const Icon = fileIcon(uf.file.type);
            return (
              <div key={uf.id} className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 border border-slate-700">
                <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{uf.file.name}</div>
                  <div className="text-slate-400 text-xs">{formatSize(uf.file.size)}</div>
                  {uf.status === "uploading" && (
                    <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${uf.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {uf.status === "done" && <CheckCircle className="w-4 h-4 text-green-400" />}
                  {uf.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {uf.status === "uploading" && (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {uf.status === "idle" && (
                    <button onClick={() => onRemove(uf.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
