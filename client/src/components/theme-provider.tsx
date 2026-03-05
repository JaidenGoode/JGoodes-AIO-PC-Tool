import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ThemeMode = "dark" | "light";

export interface ThemeColor {
  name: string;
  hue: number;
  label: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { name: "red",    hue: 0,   label: "Crimson" },
  { name: "orange", hue: 22,  label: "Inferno" },
  { name: "amber",  hue: 38,  label: "Ember"   },
  { name: "yellow", hue: 48,  label: "Gold"    },
  { name: "lime",   hue: 80,  label: "Toxic"   },
  { name: "green",  hue: 140, label: "Matrix"  },
  { name: "teal",   hue: 170, label: "Neon"    },
  { name: "cyan",   hue: 190, label: "Ice"     },
  { name: "blue",   hue: 215, label: "Arctic"  },
  { name: "indigo", hue: 245, label: "Void"    },
  { name: "violet", hue: 265, label: "Ultra"   },
  { name: "purple", hue: 280, label: "Plasma"  },
  { name: "pink",   hue: 330, label: "Pulse"   },
];

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  accentHue: number;
  setAccentHue: (hue: number) => void;
  currentColor: ThemeColor;
  fontSize: number;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function applyTheme(mode: ThemeMode, hue: number) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");

  if (mode === "dark") {
    root.style.setProperty("--background",                  `${hue} 0% 4%`);
    root.style.setProperty("--foreground",                  `${hue} 5% 97%`);
    root.style.setProperty("--border",                      `${hue} 3% 13%`);
    root.style.setProperty("--card",                        `${hue} 3% 7%`);
    root.style.setProperty("--card-foreground",             `${hue} 5% 97%`);
    root.style.setProperty("--card-border",                 `${hue} 3% 10%`);
    root.style.setProperty("--sidebar",                     `${hue} 4% 6%`);
    root.style.setProperty("--sidebar-foreground",          `${hue} 5% 97%`);
    root.style.setProperty("--sidebar-border",              `${hue} 3% 10%`);
    root.style.setProperty("--sidebar-primary",             `${hue} 84% 40%`);
    root.style.setProperty("--sidebar-primary-foreground",  `0 0% 98%`);
    root.style.setProperty("--sidebar-accent",              `${hue} 6% 11%`);
    root.style.setProperty("--sidebar-accent-foreground",   `${hue} 5% 97%`);
    root.style.setProperty("--sidebar-ring",                `${hue} 84% 50%`);
    root.style.setProperty("--popover",                     `${hue} 3% 9%`);
    root.style.setProperty("--popover-foreground",          `${hue} 5% 97%`);
    root.style.setProperty("--popover-border",              `${hue} 3% 13%`);
    root.style.setProperty("--primary",                     `${hue} 84% 40%`);
    root.style.setProperty("--primary-foreground",          `0 0% 98%`);
    root.style.setProperty("--secondary",                   `${hue} 5% 14%`);
    root.style.setProperty("--secondary-foreground",        `${hue} 5% 97%`);
    root.style.setProperty("--muted",                       `${hue} 4% 13%`);
    root.style.setProperty("--muted-foreground",            `${hue} 5% 62%`);
    root.style.setProperty("--accent",                      `${hue} 5% 12%`);
    root.style.setProperty("--accent-foreground",           `${hue} 5% 97%`);
    root.style.setProperty("--destructive",                 `0 84% 40%`);
    root.style.setProperty("--destructive-foreground",      `0 0% 98%`);
    root.style.setProperty("--input",                       `${hue} 0% 28%`);
    root.style.setProperty("--ring",                        `${hue} 84% 50%`);
  } else {
    root.style.setProperty("--background",                  `${hue} 0% 100%`);
    root.style.setProperty("--foreground",                  `${hue} 5% 9%`);
    root.style.setProperty("--border",                      `${hue} 3% 92%`);
    root.style.setProperty("--card",                        `${hue} 2% 98%`);
    root.style.setProperty("--card-foreground",             `${hue} 5% 9%`);
    root.style.setProperty("--card-border",                 `${hue} 3% 94%`);
    root.style.setProperty("--sidebar",                     `${hue} 3% 96%`);
    root.style.setProperty("--sidebar-foreground",          `${hue} 5% 9%`);
    root.style.setProperty("--sidebar-border",              `${hue} 3% 92%`);
    root.style.setProperty("--sidebar-primary",             `${hue} 84% 35%`);
    root.style.setProperty("--sidebar-primary-foreground",  `0 0% 98%`);
    root.style.setProperty("--sidebar-accent",              `${hue} 3% 91%`);
    root.style.setProperty("--sidebar-accent-foreground",   `${hue} 5% 9%`);
    root.style.setProperty("--sidebar-ring",                `${hue} 84% 45%`);
    root.style.setProperty("--popover",                     `${hue} 2% 94%`);
    root.style.setProperty("--popover-foreground",          `${hue} 5% 9%`);
    root.style.setProperty("--popover-border",              `${hue} 3% 90%`);
    root.style.setProperty("--primary",                     `${hue} 84% 35%`);
    root.style.setProperty("--primary-foreground",          `0 0% 98%`);
    root.style.setProperty("--secondary",                   `${hue} 3% 88%`);
    root.style.setProperty("--secondary-foreground",        `${hue} 5% 9%`);
    root.style.setProperty("--muted",                       `${hue} 3% 90%`);
    root.style.setProperty("--muted-foreground",            `${hue} 5% 28%`);
    root.style.setProperty("--accent",                      `${hue} 3% 92%`);
    root.style.setProperty("--accent-foreground",           `${hue} 5% 9%`);
    root.style.setProperty("--destructive",                 `0 84% 35%`);
    root.style.setProperty("--destructive-foreground",      `0 0% 98%`);
    root.style.setProperty("--input",                       `${hue} 0% 75%`);
    root.style.setProperty("--ring",                        `${hue} 84% 45%`);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read saved values and apply theme SYNCHRONOUSLY before first render
  // to prevent flash of wrong theme
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = (localStorage.getItem("theme-mode") as ThemeMode) || "dark";
    const savedHue = parseInt(localStorage.getItem("theme-hue") || "0", 10);
    applyTheme(saved, savedHue);
    return saved;
  });

  const [accentHue, setAccentHueState] = useState<number>(() => {
    return parseInt(localStorage.getItem("theme-hue") || "0", 10);
  });

  const [fontSize, setFontSizeState] = useState<number>(() => {
    const size = parseInt(localStorage.getItem("theme-fontsize") || "14", 10);
    document.documentElement.style.fontSize = `${size}px`;
    return size;
  });

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("theme-mode", m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme-mode", next);
      return next;
    });
  }, []);

  const setAccentHue = useCallback((hue: number) => {
    setAccentHueState(hue);
    localStorage.setItem("theme-hue", String(hue));
  }, []);

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size);
    localStorage.setItem("theme-fontsize", String(size));
  }, []);

  // Re-apply whenever mode or hue changes (after the synchronous initial apply)
  useEffect(() => {
    applyTheme(mode, accentHue);
  }, [mode, accentHue]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  const currentColor =
    THEME_COLORS.find((c) => c.hue === accentHue) || THEME_COLORS[0];

  return (
    <ThemeContext.Provider
      value={{ mode, setMode, toggleMode, accentHue, setAccentHue, currentColor, fontSize, setFontSize }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
