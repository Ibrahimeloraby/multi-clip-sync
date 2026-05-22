import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface Goal {
  id: string;
  label: string;
}

interface SpendCategory {
  id: string;
  label: string;
  amount: number;
}

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
  selectedPrograms: string[];
  setSelectedPrograms: (ids: string[]) => void;
  goals: string[];
  setGoals: (goals: string[]) => void;
  spendCategories: Record<string, number>;
  setSpendCategories: (cats: Record<string, number>) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(
    () => (localStorage.getItem("loyaltyone_lang") as Language) || "en"
  );
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [spendCategories, setSpendCategories] = useState<Record<string, number>>({});

  const isRTL = language === "ar";

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("loyaltyone_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [isRTL, language]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        isRTL,
        selectedPrograms,
        setSelectedPrograms,
        goals,
        setGoals,
        spendCategories,
        setSpendCategories,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
