import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { loadAppConfig } from "../firestore";
import {
  CATS as DEFAULT_CATS,
  CAT_GROUPS as DEFAULT_CAT_GROUPS,
  CAT_ICONS as DEFAULT_CAT_ICONS,
  DEFAULT_STORES,
  FX as DEFAULT_FX,
  FX_SYMBOLS as DEFAULT_FX_SYMBOLS,
} from "../config/defaults";

const ConfigContext = createContext(null);

/**
 * Provides app-level configuration loaded from Firestore config/appConfig.
 * Falls back to hardcoded defaults if Firestore is unavailable.
 */
export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAppConfig();
        if (!cancelled && data) setConfig(data);
      } catch (e) {
        console.warn("Using default config (Firestore unavailable):", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Derive convenience objects from Firestore config or fallback to defaults
  const value = useMemo(() => {
    if (config?.categories) {
      // Build CATS, CAT_ICONS, CAT_GROUPS from Firestore config
      const cats = {};
      const catIcons = {};
      const catGroupsMap = {};

      Object.entries(config.categories).forEach(([name, info]) => {
        cats[name] = info.color;
        catIcons[name] = info.icon;
        const group = info.group || "Inne";
        if (!catGroupsMap[group]) catGroupsMap[group] = [];
        catGroupsMap[group].push(name);
      });

      return {
        cats: Object.keys(cats).length > 0 ? cats : DEFAULT_CATS,
        allCats: Object.keys(cats).length > 0 ? Object.keys(cats) : Object.keys(DEFAULT_CATS),
        catGroups: config.categoryGroups || catGroupsMap || DEFAULT_CAT_GROUPS,
        catIcons: Object.keys(catIcons).length > 0 ? catIcons : DEFAULT_CAT_ICONS,
        defaultStores: config.defaultStores || DEFAULT_STORES,
        fx: config.fxRates || DEFAULT_FX,
        fxSymbols: config.fxSymbols || DEFAULT_FX_SYMBOLS,
        loading,
      };
    }

    // Fallback to hardcoded defaults
    return {
      cats: DEFAULT_CATS,
      allCats: Object.keys(DEFAULT_CATS),
      catGroups: DEFAULT_CAT_GROUPS,
      catIcons: DEFAULT_CAT_ICONS,
      defaultStores: DEFAULT_STORES,
      fx: DEFAULT_FX,
      fxSymbols: DEFAULT_FX_SYMBOLS,
      loading,
    };
  }, [config, loading]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * Hook to access app configuration.
 * Returns { cats, allCats, catGroups, catIcons, defaultStores, fx, fxSymbols, loading }
 */
export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
