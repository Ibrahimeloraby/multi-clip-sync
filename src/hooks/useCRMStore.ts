import { useState, useEffect, useCallback } from "react";
import type { CRMStore, Prospect, FilterPreset, OutreachTemplate, ImportSession } from "@/types/crm";
import { v4 as uuid } from "../lib/crm/uuid";

const STORAGE_KEY = "crm_store_v1";

const empty: CRMStore = {
  prospects: [],
  importSessions: [],
  filterPresets: [],
  outreachTemplates: [],
};

function load(): CRMStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...empty };
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return { ...empty };
  }
}

function save(store: CRMStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useCRMStore() {
  const [store, setStore] = useState<CRMStore>(load);

  const update = useCallback((next: Partial<CRMStore>) => {
    setStore((prev) => {
      const merged = { ...prev, ...next };
      save(merged);
      return merged;
    });
  }, []);

  const addProspects = useCallback(
    (incoming: Omit<Prospect, "id" | "importedAt" | "tags" | "status">[], session: Omit<ImportSession, "id">) => {
      const now = new Date().toISOString();
      const sessionId = uuid();
      const prospects: Prospect[] = incoming.map((p) => ({
        ...p,
        id: uuid(),
        importedAt: now,
        tags: [],
        status: "new",
      }));
      const importSession: ImportSession = { ...session, id: sessionId };
      setStore((prev) => {
        const merged = {
          ...prev,
          prospects: [...prev.prospects, ...prospects],
          importSessions: [...prev.importSessions, importSession],
        };
        save(merged);
        return merged;
      });
      return prospects.length;
    },
    []
  );

  const updateProspectStatus = useCallback((id: string, status: Prospect["status"]) => {
    setStore((prev) => {
      const merged = {
        ...prev,
        prospects: prev.prospects.map((p) => (p.id === id ? { ...p, status } : p)),
      };
      save(merged);
      return merged;
    });
  }, []);

  const deleteProspects = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setStore((prev) => {
      const merged = { ...prev, prospects: prev.prospects.filter((p) => !set.has(p.id)) };
      save(merged);
      return merged;
    });
  }, []);

  const saveFilterPreset = useCallback((preset: Omit<FilterPreset, "id" | "createdAt">) => {
    const full: FilterPreset = { ...preset, id: uuid(), createdAt: new Date().toISOString() };
    setStore((prev) => {
      const merged = { ...prev, filterPresets: [...prev.filterPresets, full] };
      save(merged);
      return merged;
    });
    return full;
  }, []);

  const deleteFilterPreset = useCallback((id: string) => {
    setStore((prev) => {
      const merged = { ...prev, filterPresets: prev.filterPresets.filter((p) => p.id !== id) };
      save(merged);
      return merged;
    });
  }, []);

  const saveOutreachTemplate = useCallback((tpl: Omit<OutreachTemplate, "id">) => {
    const full: OutreachTemplate = { ...tpl, id: uuid() };
    setStore((prev) => {
      const merged = { ...prev, outreachTemplates: [...prev.outreachTemplates, full] };
      save(merged);
      return merged;
    });
    return full;
  }, []);

  const deleteOutreachTemplate = useCallback((id: string) => {
    setStore((prev) => {
      const merged = { ...prev, outreachTemplates: prev.outreachTemplates.filter((t) => t.id !== id) };
      save(merged);
      return merged;
    });
  }, []);

  const clearAll = useCallback(() => {
    setStore({ ...empty });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    ...store,
    addProspects,
    updateProspectStatus,
    deleteProspects,
    saveFilterPreset,
    deleteFilterPreset,
    saveOutreachTemplate,
    deleteOutreachTemplate,
    clearAll,
  };
}
