import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

// Used when there is no saved preference (new visitors, cleared storage).
const DEFAULT_THEME: Theme = "light";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  toggle: () => {},
});

const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem("axis-theme");
    return stored === "dark" || stored === "light" ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const themeScript = `(function(){try{var s=localStorage.getItem('axis-theme');var t=s==='dark'||s==='light'?s:'${DEFAULT_THEME}';document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
    document.documentElement.style.colorScheme = stored;
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("axis-theme", t);
    } catch {
      // Storage blocked: the choice still applies to this page view.
    }
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t;
  }, []);

  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
