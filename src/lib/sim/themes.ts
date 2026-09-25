export interface Theme {
  id: string;
  name: string;
  dark: boolean;
  vars: Record<string, string>;
}

const base = (dark: boolean) =>
  dark
    ? {
        "--shadow": "0 10px 40px rgba(0,0,0,.48)",
        "--hi": "#34d399",
        // Brightened from #64748b: against a dark navy/gray grid the old
        // LOW color sat close to WCAG's minimum contrast for graphics and
        // was hard to tell apart from "no wire" at a glance — especially
        // for colorblind users who can't lean on hue (green vs gray-blue)
        // alone. Paired with the new on-wire 0/1 value labels below, LOW
        // nets should now read clearly by both luminance and text.
        "--lo": "#94a3b8",
        "--xx": "#f59e0b",
        "--zz": "#67e8f9",
      }
    : {
        "--shadow": "0 10px 28px rgba(15,23,42,.10)",
        "--hi": "#059669",
        "--lo": "#94a3b8",
        "--xx": "#d97706",
        "--zz": "#0891b2",
      };

export const THEMES: Theme[] = [
  {
    id: "blue-dark",
    name: "Navy · Dark",
    dark: true,
    vars: {
      ...base(true),
      "--bg": "#0b1220",
      "--panel": "#0f1829",
      "--panel2": "#131f33",
      "--border": "#1e2c46",
      "--text": "#dbe6f6",
      "--muted": "#7d90ad",
      "--accent": "#4d9fff",
      "--accent2": "#1e6fd9",
      "--grid": "#16233a",
      "--grid2": "#1d2e4b",
      "--node": "#152238",
      "--accent-fg": "#0b1220",
    },
  },
  {
    id: "blue-light",
    name: "Navy · Light",
    dark: false,
    vars: {
      ...base(false),
      "--bg": "#eef3fb",
      "--panel": "#ffffff",
      "--panel2": "#f4f8ff",
      "--border": "#d3e0f2",
      "--text": "#16263d",
      "--muted": "#60789a",
      "--accent": "#2f7fe0",
      "--accent2": "#1a63bd",
      "--grid": "#dde7f5",
      "--grid2": "#cbdaee",
      "--node": "#ffffff",
      "--accent-fg": "#ffffff",
    },
  },
  {
    id: "gray-dark",
    name: "Graphite · Dark",
    dark: true,
    vars: {
      ...base(true),
      "--bg": "#0e0f11",
      "--panel": "#141618",
      "--panel2": "#1a1d20",
      "--border": "#26292e",
      "--text": "#e2e5e9",
      "--muted": "#8b9199",
      "--accent": "#9aa7b4",
      "--accent2": "#6e7b89",
      "--grid": "#1b1e22",
      "--grid2": "#24282d",
      "--node": "#17191c",
      "--accent-fg": "#0e0f11",
    },
  },
  {
    id: "gray-light",
    name: "Graphite · Light",
    dark: false,
    vars: {
      ...base(false),
      "--bg": "#f2f3f5",
      "--panel": "#ffffff",
      "--panel2": "#f7f8fa",
      "--border": "#dfe2e6",
      "--text": "#20242a",
      "--muted": "#6b7280",
      "--accent": "#55606d",
      "--accent2": "#39424d",
      "--grid": "#e6e8eb",
      "--grid2": "#d8dbdf",
      "--node": "#ffffff",
      "--accent-fg": "#ffffff",
    },
  },
  {
    id: "teal-dark",
    name: "Teal · Dark",
    dark: true,
    vars: {
      ...base(true),
      "--bg": "#071413",
      "--panel": "#0c1c1b",
      "--panel2": "#122624",
      "--border": "#1d3a37",
      "--text": "#d7eeea",
      "--muted": "#7aa39c",
      "--accent": "#2dd4bf",
      "--accent2": "#0f766e",
      "--grid": "#102422",
      "--grid2": "#183330",
      "--node": "#0e201e",
      "--accent-fg": "#071413",
    },
  },
  {
    id: "teal-light",
    name: "Teal · Light",
    dark: false,
    vars: {
      ...base(false),
      "--bg": "#eef7f5",
      "--panel": "#ffffff",
      "--panel2": "#f3fbf9",
      "--border": "#cfe3de",
      "--text": "#14302c",
      "--muted": "#5b7f79",
      "--accent": "#0f766e",
      "--accent2": "#115e59",
      "--grid": "#dceee9",
      "--grid2": "#c9e3dc",
      "--node": "#ffffff",
      "--accent-fg": "#ffffff",
    },
  },
  {
    id: "pink-dark",
    name: "Pink · Dark",
    dark: true,
    vars: {
      ...base(true),
      "--bg": "#170b13",
      "--panel": "#20101b",
      "--panel2": "#2a1523",
      "--border": "#452038",
      "--text": "#fbe3f0",
      "--muted": "#b07c98",
      "--accent": "#f472b6",
      "--accent2": "#db2777",
      "--grid": "#25121e",
      "--grid2": "#301727",
      "--node": "#1c0f18",
      "--accent-fg": "#170b13",
    },
  },
  {
    id: "pink-light",
    name: "Pink · Light",
    dark: false,
    vars: {
      ...base(false),
      "--bg": "#fdf1f7",
      "--panel": "#ffffff",
      "--panel2": "#fff5fa",
      "--border": "#f4d3e6",
      "--text": "#4a1130",
      "--muted": "#a5688f",
      "--accent": "#ec4899",
      "--accent2": "#db2777",
      "--grid": "#fbe5f1",
      "--grid2": "#f6d2e6",
      "--node": "#ffffff",
      "--accent-fg": "#ffffff",
    },
  },
];

export function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.colorScheme = t.dark ? "dark" : "light";
}
