import { theme as antdTheme } from "antd";

export const THEME_STORAGE_KEY = "jiuzhuo-theme";
export const DEFAULT_THEME = "amber";

export const THEME_OPTIONS = [
  { id: "amber", label: "橙色" },
  { id: "night", label: "黑夜" },
];

const THEME_IDS = new Set(THEME_OPTIONS.map((item) => item.id));

const FONT_FAMILY =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';

const PRESETS = {
  amber: {
    token: {
      colorPrimary: "#ff8a1f",
      colorSuccess: "#7dffb3",
      colorError: "#ff5c5c",
      colorText: "#ffe8c8",
      colorTextSecondary: "rgba(255, 232, 200, 0.55)",
      colorBgElevated: "#160c08",
      colorBorder: "rgba(255, 179, 71, 0.28)",
    },
    components: {
      Switch: { colorPrimary: "#ff8a1f", handleBg: "#ffe8c8" },
      Message: { contentBg: "rgba(10, 6, 4, 0.92)", colorText: "#ffe8c8" },
      Popover: { colorBgElevated: "#160c08" },
    },
  },
  night: {
    token: {
      colorPrimary: "#8ab4ff",
      colorSuccess: "#5dffc1",
      colorError: "#ff6b7a",
      colorText: "#e8edf5",
      colorTextSecondary: "rgba(232, 237, 245, 0.55)",
      colorBgElevated: "#10131a",
      colorBorder: "rgba(138, 180, 255, 0.28)",
    },
    components: {
      Switch: { colorPrimary: "#8ab4ff", handleBg: "#e8edf5" },
      Message: { contentBg: "rgba(8, 10, 14, 0.94)", colorText: "#e8edf5" },
      Popover: { colorBgElevated: "#10131a" },
    },
  },
};

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    if (THEME_IDS.has(value)) return value;
  } catch {
    // ignore quota / private mode
  }
  return DEFAULT_THEME;
}

export function persistTheme(id) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // ignore quota / private mode
  }
}

export function applyThemeAttr(id) {
  document.documentElement.setAttribute("data-theme", id);
}

export function getAntdTheme(id) {
  const preset = PRESETS[id] || PRESETS[DEFAULT_THEME];
  return {
    algorithm: antdTheme.darkAlgorithm,
    token: {
      borderRadius: 12,
      fontFamily: FONT_FAMILY,
      ...preset.token,
    },
    components: preset.components,
  };
}
