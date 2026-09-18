import { useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import Home from "./home";
import TimerGame from "./timer";
import DiceGame from "./dice";
import { unlockAudio } from "./shared/audio";
import { applyThemeAttr, getAntdTheme, persistTheme, readStoredTheme } from "./shared/theme";
import type { PageId, ThemeId } from "./shared/types";
import "./shared/App.css";

export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);

  useEffect(() => {
    applyThemeAttr(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const goHome = () => setPage("home");

  return (
    <ConfigProvider locale={zhCN} theme={getAntdTheme(theme)}>
      {page === "home" && <Home theme={theme} setTheme={setTheme} onOpen={(id) => setPage(id)} />}
      {page === "timer" && <TimerGame theme={theme} setTheme={setTheme} onBack={goHome} />}
      {page === "dice" && <DiceGame theme={theme} setTheme={setTheme} onBack={goHome} />}
    </ConfigProvider>
  );
}
