import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, FileSpreadsheet, Download } from "lucide-react";

export type ImportField = {
  /** database column */
  key: string;
  /** accepted spreadsheet header names (lowercased, no spaces) */
  aliases: string[];
  label: string;
  required?: boolean;
  /** transform raw cell value into db value */
  parse?: (value: string) => unknown;
};

type Props = {
  table: "students" | "teachers";
  entityLabel: string;
  fields: ImportField[];
  defaults?: Record<string, unknown>;
  onDone: () => void;
};

const norm = (s: string) => s.toString().toLowerCase().replace(/[\s_-]+/g, "");

function excelDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.y}-${p(d.m)}-${p(d.d)}`;
  }
  const s = String(v).trim();
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function ExcelImport({ table, entityLabel, fields, defaults, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setRows([]);
    setProblems([]);
    setFileName("");
    setErr(null);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([fields.map((f) => f.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, entityLabel);
    XLSX.writeFile(wb, `${table}-import-template.xlsx`);
  }

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: false });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("The file has no sheets.");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
        defval: "",
        raw: true,
      });
      if (raw.length === 0) throw new Error("No data rows found in the first sheet.");

      const issues: string[] = [];
      const parsed: Record<string, unknown>[] = [];

      raw.forEach((r, i) => {
        const lookup: Record<string, unknown> = {};
        Object.entries(r).forEach(([k, v]) => { lookup[norm(k)] = v; });

        const rec: Record<string, unknown> = { ...(defaults ?? {}) };
        let missing = false;
        for (const f of fields) {
          const hit = f.aliases.map(norm).find((a) => lookup[a] !== undefined && lookup[a] !== "");
          const val = hit ? lookup[hit] : "";
          if ((val === "" || val === null) && f.required) {
            issues.push(`Row ${i + 2}: missing "${f.label}"`);
            missing = true;
            continue;
          }
          if (val === "" || val === null) continue;
          rec[f.key] = f.parse ? f.parse(String(val).trim()) : String(val).trim();
        }
        if (!missing) parsed.push(rec);
      });

      setRows(parsed);
      setProblems(issues);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not read the file.");
    }
  }

  async function importRows() {
    setBusy(true);
    setErr(null);
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await supabase.from(table).insert(chunk as never);
      if (error) {
        setErr(`${error.message} (stopped after ${inserted} rows)`);
        setBusy(false);
        onDone();
        return;
      }
      inserted += chunk.length;
    }
    setBusy(false);
    setDone(inserted);
    setRows([]);
    onDone();
  }

  return (
    <>
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        <Upload className="h-4 w-4" /> Import Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/40 p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded-xl border border-border bg-card p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Import {entityLabel} from Excel</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an .xlsx or .csv file. The first row must contain column headers.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-muted-foreground">
                    Expected columns:{" "}
                    <span className="text-foreground">
                      {fields.map((f) => f.label + (f.required ? "*" : "")).join(", ")}
                    </span>
                  </span>
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" /> Template
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center hover:border-primary/60">
                <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName || "Choose spreadsheet file"}</span>
                <span className="text-xs text-muted-foreground">.xlsx, .xls or .csv</span>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>

              {err && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
              )}
              {done !== null && (
                <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">
                  Imported {done} {entityLabel.toLowerCase()}.
                </p>
              )}

              {problems.length > 0 && (
                <div className="rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{problems.length} row(s) skipped</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                    {problems.slice(0, 20).map((p) => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              )}

              {rows.length > 0 && (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>{fields.map((f) => <th key={f.key} className="px-3 py-2">{f.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          {fields.map((f) => (
                            <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                              {r[f.key] === undefined || r[f.key] === null ? "—" : String(r[f.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 5 && (
                    <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                      + {rows.length - 5} more row(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                Close
              </button>
              <button
                onClick={importRows}
                disabled={busy || rows.length === 0}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Importing…" : `Import ${rows.length || ""} row(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { excelDate };
