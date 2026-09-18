import { useEffect, useState } from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import Home from "./home";
import TimerGame from "./timer";
import DiceGame from "./dice";
import { ensureAudio, unlockSpeech } from "./shared/audio";
import { applyThemeAttr, getAntdTheme, persistTheme, readStoredTheme } from "./shared/theme";
import "./shared/App.css";

export default function App() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeAttr(theme);
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    const unlock = () => {
      ensureAudio();
      unlockSpeech();
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const goHome = () => setPage("home");

  return (
    <ConfigProvider locale={zhCN} theme={getAntdTheme(theme)}>
      {page === "home" && <Home theme={theme} setTheme={setTheme} onOpen={setPage} />}
      {page === "timer" && <TimerGame theme={theme} setTheme={setTheme} onBack={goHome} />}
      {page === "dice" && <DiceGame theme={theme} setTheme={setTheme} onBack={goHome} />}
    </ConfigProvider>
  );
}
