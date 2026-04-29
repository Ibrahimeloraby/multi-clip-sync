import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { INDUSTRIES, getIndustry, getStakeholder } from "@/lib/crm/industries";
import { autoMapColumns, cleanProspectData, applyFilterRules } from "@/lib/crm/dataClean";
import { useCRMStore } from "@/hooks/useCRMStore";
import type { FilterRule, Prospect } from "@/types/crm";
import type { ParsedTable } from "@/lib/crm/parsers";

import IndustrySelector from "@/components/crm/IndustrySelector";
import FileUploader from "@/components/crm/FileUploader";
import ColumnMapper from "@/components/crm/ColumnMapper";
import FilterPanel from "@/components/crm/FilterPanel";
import ProspectList from "@/components/crm/ProspectList";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Filter,
  Search,
  Users,
  ChevronLeft,
  ArrowRight,
  CheckCircle2,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type ImportStep = "industry" | "stakeholder" | "upload" | "map" | "done";

export default function CRMDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useCRMStore();

  // Employee identity (simple name stored in localStorage)
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem("crm_employee_id") ?? "");
  const [employeeInput, setEmployeeInput] = useState(employeeId);

  // Active view state
  const [activeIndustry, setActiveIndustry] = useState<string | null>(
    searchParams.get("industry") ?? (INDUSTRIES[0]?.id ?? null)
  );
  const [activeStakeholder, setActiveStakeholder] = useState<string | null>(null);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Import flow state
  const [importStep, setImportStep] = useState<ImportStep>("industry");
  const [importIndustry, setImportIndustry] = useState<string | null>(null);
  const [importStakeholder, setImportStakeholder] = useState<string | null>(null);
  const [parsedTable, setParsedTable] = useState<ParsedTable | null>(null);
  const [fileName, setFileName] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const industry = getIndustry(activeIndustry ?? "");
  const stakeholder = getStakeholder(activeIndustry ?? "", activeStakeholder ?? "");

  // Set default stakeholder when industry changes
  useEffect(() => {
    if (industry?.stakeholders.length) {
      setActiveStakeholder(industry.stakeholders[0].id);
    }
    setFilterRules([]);
  }, [activeIndustry]);

  // Filter + search prospects
  const filteredProspects = useMemo(() => {
    if (!activeIndustry || !activeStakeholder) return [];
    let list = store.prospects.filter(
      (p) => p.industryId === activeIndustry && p.stakeholderType === activeStakeholder
    );
    list = applyFilterRules(list, filterRules);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        Object.values(p.data).some((v) => v && String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [store.prospects, activeIndustry, activeStakeholder, filterRules, searchQuery]);

  // Counts per stakeholder for the active industry
  const stakeholderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    store.prospects
      .filter((p) => p.industryId === activeIndustry)
      .forEach((p) => {
        counts[p.stakeholderType] = (counts[p.stakeholderType] ?? 0) + 1;
      });
    return counts;
  }, [store.prospects, activeIndustry]);

  // ── Import flow ──────────────────────────────────────────────────────────

  const startImport = () => {
    setImportStep("industry");
    setImportIndustry(activeIndustry);
    setImportStakeholder(null);
    setParsedTable(null);
    setColumnMapping({});
    setImportDialogOpen(true);
  };

  const handleFileParsed = (table: ParsedTable, name: string) => {
    setParsedTable(table);
    setFileName(name);
    const fields = getStakeholder(importIndustry!, importStakeholder!)?.fields ?? [];
    const autoMap = autoMapColumns(table.headers, fields);
    setColumnMapping(autoMap);
    setImportStep("map");
  };

  const confirmImport = () => {
    if (!importIndustry || !importStakeholder || !parsedTable) return;
    const fields = getStakeholder(importIndustry, importStakeholder)!.fields;

    const cleaned = parsedTable.rows.map((row) => ({
      industryId: importIndustry,
      stakeholderType: importStakeholder,
      data: cleanProspectData(row, columnMapping, fields),
    }));

    const count = store.addProspects(cleaned, {
      industryId: importIndustry,
      stakeholderType: importStakeholder,
      fileName,
      importedAt: new Date().toISOString(),
      recordCount: cleaned.length,
      columnMapping,
    });

    toast.success(`Imported ${count} prospects from ${fileName}`);
    setImportDialogOpen(false);
    setActiveIndustry(importIndustry);
    setActiveStakeholder(importStakeholder);
  };

  const saveEmployee = () => {
    localStorage.setItem("crm_employee_id", employeeInput.trim());
    setEmployeeId(employeeInput.trim());
    toast.success("Name saved");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-semibold text-base">CRM Prospects</span>
            {employeeId && <Badge variant="outline" className="text-xs">{employeeId}</Badge>}
          </div>

          <div className="flex items-center gap-2">
            {/* Employee settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Your name / ID</Label>
                    <p className="text-xs text-muted-foreground">
                      Filter presets and templates are saved per employee.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={employeeInput}
                        onChange={(e) => setEmployeeInput(e.target.value)}
                        placeholder="e.g. Ahmed, Sales-Team-1"
                        className="flex-1"
                        onKeyDown={(e) => { if (e.key === "Enter") saveEmployee(); }}
                      />
                      <Button onClick={saveEmployee}>Save</Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-destructive">Danger zone</Label>
                    <Button
                      variant="destructive"
                      className="w-full gap-2"
                      onClick={() => {
                        if (confirm("Delete ALL imported data and presets? This cannot be undone.")) {
                          store.clearAll();
                          toast.success("All data cleared");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear all data
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Import button */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8" onClick={startImport}>
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Prospects</DialogTitle>
                </DialogHeader>

                <ImportWizard
                  step={importStep}
                  onStepChange={setImportStep}
                  importIndustry={importIndustry}
                  onIndustryChange={setImportIndustry}
                  importStakeholder={importStakeholder}
                  onStakeholderChange={setImportStakeholder}
                  parsedTable={parsedTable}
                  onFileParsed={handleFileParsed}
                  columnMapping={columnMapping}
                  onMappingChange={setColumnMapping}
                  onConfirm={confirmImport}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 space-y-4">
        {/* Industry tabs */}
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((ind) => {
            const count = store.prospects.filter((p) => p.industryId === ind.id).length;
            return (
              <button
                key={ind.id}
                onClick={() => setActiveIndustry(ind.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  activeIndustry === ind.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <span>{ind.icon}</span>
                <span>{ind.label}</span>
                {count > 0 && (
                  <span className={`rounded-full text-xs px-1.5 ${activeIndustry === ind.id ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {industry && (
          <>
            {/* Stakeholder tabs */}
            <Tabs value={activeStakeholder ?? ""} onValueChange={setActiveStakeholder}>
              <TabsList className="h-auto flex-wrap gap-1 bg-muted/50">
                {industry.stakeholders.map((sh) => (
                  <TabsTrigger key={sh.id} value={sh.id} className="gap-1.5 text-xs">
                    <span className={`inline-block h-2 w-2 rounded-full ${sh.color}`} />
                    {sh.label}
                    {stakeholderCounts[sh.id] ? (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">{stakeholderCounts[sh.id]}</Badge>
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex gap-4">
              {/* Filter sidebar */}
              <div className="hidden lg:block w-72 shrink-0">
                <div className="rounded-xl border bg-card p-4 space-y-3 sticky top-20">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Filter className="h-4 w-4" />
                    Filters
                    {filterRules.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">{filterRules.length}</Badge>
                    )}
                  </div>
                  {stakeholder && (
                    <FilterPanel
                      fields={stakeholder.fields}
                      activeRules={filterRules}
                      onRulesChange={setFilterRules}
                      presets={store.filterPresets}
                      onSavePreset={(name, rules) => {
                        store.saveFilterPreset({
                          name,
                          industryId: activeIndustry!,
                          stakeholderType: activeStakeholder!,
                          rules,
                          employeeId,
                        });
                        toast.success(`Filter preset "${name}" saved`);
                      }}
                      onLoadPreset={(preset) => setFilterRules(preset.rules)}
                      onDeletePreset={store.deleteFilterPreset}
                      employeeId={employeeId}
                      industryId={activeIndustry!}
                      stakeholderType={activeStakeholder!}
                    />
                  )}
                </div>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Search + mobile filter */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search prospects…"
                      className="pl-8 h-9"
                    />
                  </div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="lg:hidden gap-1 h-9">
                        <Filter className="h-4 w-4" />
                        Filter
                        {filterRules.length > 0 && <Badge variant="secondary">{filterRules.length}</Badge>}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                      </SheetHeader>
                      <div className="mt-4">
                        {stakeholder && (
                          <FilterPanel
                            fields={stakeholder.fields}
                            activeRules={filterRules}
                            onRulesChange={setFilterRules}
                            presets={store.filterPresets}
                            onSavePreset={(name, rules) => {
                              store.saveFilterPreset({
                                name,
                                industryId: activeIndustry!,
                                stakeholderType: activeStakeholder!,
                                rules,
                                employeeId,
                              });
                              toast.success(`Filter preset "${name}" saved`);
                            }}
                            onLoadPreset={(preset) => setFilterRules(preset.rules)}
                            onDeletePreset={store.deleteFilterPreset}
                            employeeId={employeeId}
                            industryId={activeIndustry!}
                            stakeholderType={activeStakeholder!}
                          />
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Prospects */}
                {stakeholder ? (
                  <ProspectList
                    prospects={filteredProspects}
                    fields={stakeholder.fields}
                    stakeholderColor={stakeholder.color}
                    outreachTemplates={store.outreachTemplates}
                    defaultTemplate={stakeholder.defaultOutreachTemplate}
                    industryId={activeIndustry!}
                    stakeholderType={activeStakeholder!}
                    employeeId={employeeId}
                    onStatusChange={store.updateProspectStatus}
                    onDelete={store.deleteProspects}
                    onSaveTemplate={store.saveOutreachTemplate}
                    onDeleteTemplate={store.deleteOutreachTemplate}
                  />
                ) : (
                  <EmptyState onImport={startImport} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Import Wizard ──────────────────────────────────────────────────────────

interface WizardProps {
  step: ImportStep;
  onStepChange: (s: ImportStep) => void;
  importIndustry: string | null;
  onIndustryChange: (id: string) => void;
  importStakeholder: string | null;
  onStakeholderChange: (id: string) => void;
  parsedTable: ParsedTable | null;
  onFileParsed: (table: ParsedTable, name: string) => void;
  columnMapping: Record<string, string>;
  onMappingChange: (m: Record<string, string>) => void;
  onConfirm: () => void;
}

function ImportWizard({
  step,
  onStepChange,
  importIndustry,
  onIndustryChange,
  importStakeholder,
  onStakeholderChange,
  parsedTable,
  onFileParsed,
  columnMapping,
  onMappingChange,
  onConfirm,
}: WizardProps) {
  const steps: { key: ImportStep; label: string }[] = [
    { key: "industry", label: "Industry" },
    { key: "stakeholder", label: "Type" },
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);
  const industry = getIndustry(importIndustry ?? "");
  const stakeholder = getStakeholder(importIndustry ?? "", importStakeholder ?? "");

  return (
    <div className="space-y-5">
      {/* Step progress */}
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i < currentIndex
                  ? "bg-primary text-primary-foreground"
                  : i === currentIndex
                  ? "border-2 border-primary text-primary"
                  : "border border-border text-muted-foreground"
              }`}
            >
              {i < currentIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-xs ${i === currentIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <Separator />

      {/* Step content */}
      {step === "industry" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Select your industry</p>
          <IndustrySelector selected={importIndustry} onSelect={onIndustryChange} />
          <Button
            className="w-full gap-1"
            disabled={!importIndustry}
            onClick={() => onStepChange("stakeholder")}
          >
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === "stakeholder" && industry && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">What type of contacts are you importing?</p>
          <div className="grid grid-cols-2 gap-2">
            {industry.stakeholders.map((sh) => (
              <button
                key={sh.id}
                onClick={() => onStakeholderChange(sh.id)}
                className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                  importStakeholder === sh.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className={`h-3 w-3 rounded-full ${sh.color}`} />
                {sh.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onStepChange("industry")} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button className="flex-1 gap-1" disabled={!importStakeholder} onClick={() => onStepChange("upload")}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload your {stakeholder?.label ?? "contacts"} data file.
          </p>
          <FileUploader onParsed={onFileParsed} />
          <Button variant="outline" onClick={() => onStepChange("stakeholder")} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      )}

      {step === "map" && parsedTable && stakeholder && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {parsedTable.rows.length} rows detected. Map columns to fields.
          </p>
          <ColumnMapper
            parsedHeaders={parsedTable.headers}
            rawHeaders={parsedTable.rawHeaders}
            sampleRows={parsedTable.rows.slice(0, 2)}
            fields={stakeholder.fields}
            mapping={columnMapping}
            onChange={onMappingChange}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onStepChange("upload")} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="flex-1 gap-1"
              disabled={!Object.keys(columnMapping).length}
              onClick={onConfirm}
            >
              Import {parsedTable.rows.length} records
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
      <Users className="mb-3 h-10 w-10 text-muted-foreground opacity-40" />
      <p className="text-sm font-medium text-muted-foreground">No prospects yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Upload a CSV or Excel file to get started.</p>
      <Button className="mt-4 gap-2" onClick={onImport}>
        <Upload className="h-4 w-4" />
        Import prospects
      </Button>
    </div>
  );
}
