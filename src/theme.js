import { theme as antdTheme } from "antd";

export const THEME_STORAGE_KEY = "jiuzhuo-theme";
export const DEFAULT_THEME = "amber";

export const THEME_OPTIONS = [
  { id: "amber", label: "橙色" },
  { id: "day", label: "白天" },
  { id: "night", label: "黑夜" },
  { id: "deep-blue", label: "深蓝" },
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
  day: {
    token: {
      colorPrimary: "#d45a00",
      colorSuccess: "#1b8a4a",
      colorError: "#d32f2f",
      colorText: "#2a1c12",
      colorTextSecondary: "rgba(42, 28, 18, 0.58)",
      colorBgElevated: "#fffbf5",
      colorBorder: "rgba(212, 90, 0, 0.28)",
    },
    components: {
      Switch: { colorPrimary: "#d45a00", handleBg: "#fff8ef" },
      Message: { contentBg: "rgba(255, 252, 247, 0.96)", colorText: "#2a1c12" },
      Popover: { colorBgElevated: "#fffbf5" },
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
  "deep-blue": {
    token: {
      colorPrimary: "#29b6f6",
      colorSuccess: "#69f0ae",
      colorError: "#ff6b81",
      colorText: "#e3f2fd",
      colorTextSecondary: "rgba(227, 242, 253, 0.55)",
      colorBgElevated: "#0b1c34",
      colorBorder: "rgba(79, 195, 247, 0.28)",
    },
    components: {
      Switch: { colorPrimary: "#29b6f6", handleBg: "#e3f2fd" },
      Message: { contentBg: "rgba(4, 16, 31, 0.94)", colorText: "#e3f2fd" },
      Popover: { colorBgElevated: "#0b1c34" },
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
    algorithm: id === "day" ? antdTheme.defaultAlgorithm : antdTheme.darkAlgorithm,
    token: {
      borderRadius: 12,
      fontFamily: FONT_FAMILY,
      ...preset.token,
    },
    components: preset.components,
  };
}
