import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  rawHeaders: string[];
}

export async function parseFile(file: File): Promise<ParsedTable> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCSV(file);
  if (ext === "xlsx" || ext === "xls") return parseExcel(file);
  if (ext === "pdf") return parsePDF(file);
  throw new Error(`Unsupported file type: .${ext}. Please upload CSV, Excel, or PDF.`);
}

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, "_").toLowerCase();
}

function parseCSV(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete(results) {
        const rawHeaders = results.meta.fields ?? [];
        const headers = rawHeaders.map(normalizeHeader);
        const rows = results.data.map((row) => {
          const normalized: Record<string, string> = {};
          rawHeaders.forEach((raw, i) => {
            normalized[headers[i]] = String(row[raw] ?? "").trim();
          });
          return normalized;
        });
        resolve({ headers, rawHeaders, rows });
      },
      error(err) {
        reject(new Error(err.message));
      },
    });
  });
}

function parseExcel(file: File): Promise<ParsedTable> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" });
        if (!json.length) return resolve({ headers: [], rawHeaders: [], rows: [] });

        const rawHeaders = (json[0] as string[]).map((h) => String(h).trim());
        const headers = rawHeaders.map(normalizeHeader);

        const rows = (json.slice(1) as string[][])
          .filter((row) => row.some((cell) => cell !== "" && cell != null))
          .map((row) => {
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => {
              obj[h] = String(row[i] ?? "").trim();
            });
            return obj;
          });

        resolve({ headers, rawHeaders, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

async function parsePDF(file: File): Promise<ParsedTable> {
  // Extract plain text from PDF, then attempt to parse tabular lines
  const text = await extractPDFText(file);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Heuristic: find a line that looks like a header (multiple tab/comma-separated tokens)
  const headerLineIndex = lines.findIndex((l) => l.split(/[\t,|]/).length >= 3);
  if (headerLineIndex === -1) {
    // Return raw text as single-column data for manual review
    return {
      headers: ["text"],
      rawHeaders: ["text"],
      rows: lines.map((l) => ({ text: l })),
    };
  }

  const sep = detectSeparator(lines[headerLineIndex]);
  const rawHeaders = lines[headerLineIndex].split(sep).map((h) => h.trim());
  const headers = rawHeaders.map(normalizeHeader);

  const rows = lines.slice(headerLineIndex + 1).map((line) => {
    const cells = line.split(sep).map((c) => c.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? "";
    });
    return obj;
  });

  return { headers, rawHeaders, rows };
}

function detectSeparator(line: string): string {
  const counts = { "\t": 0, ",": 0, "|": 0 };
  for (const ch of line) {
    if (ch in counts) counts[ch as keyof typeof counts]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

async function extractPDFText(file: File): Promise<string> {
  // Use PDF.js from CDN if available, otherwise fall back to raw text extraction
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Try to detect if it's a text-based PDF by looking for stream content
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(uint8);

  // Extract text between BT (Begin Text) and ET (End Text) markers
  const textBlocks: string[] = [];
  const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    const tjRegex = /\(([^)]*)\)\s*T[jJ]/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textBlocks.push(tjMatch[1]);
    }
  }

  if (textBlocks.length > 0) return textBlocks.join("\n");

  // If no text extracted, return placeholder
  throw new Error(
    "This PDF appears to be image-based (scanned). Please export your data as CSV or Excel for best results."
  );
}
