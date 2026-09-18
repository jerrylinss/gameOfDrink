import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, InputNumber, Segmented, Switch, message } from "antd";
import {
  DEFAULT_VOICE_TEXT,
  ensureAudio,
  persistVoiceSettings,
  playClick,
  playExplosion,
  readVoiceSettings,
  speak,
  unlockSpeech,
} from "../shared/audio";
import AppHeader from "../shared/AppHeader";
import type { GameScreenProps, TimerMode } from "../shared/types";
import { formatMs, readTargetMs } from "./format";
import WineGlassIcon from "./WineGlassIcon";
import "./TimerGame.css";

type TimerClass = "" | "flash" | "done";

export default function TimerGame({ theme, setTheme, onBack }: GameScreenProps) {
  const [mode, setMode] = useState<TimerMode>("stopwatch");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [displayMs, setDisplayMs] = useState(0);
  const [seconds, setSeconds] = useState<number | null>(3);
  const [showCounter, setShowCounter] = useState(false);
  const [hideUntilZero, setHideUntilZero] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => readVoiceSettings().enabled);
  const [voiceText, setVoiceText] = useState(() => readVoiceSettings().text);
  const [timerClass, setTimerClass] = useState<TimerClass>("");
  const [hint, setHint] = useState("隐藏计时：开始后数字模糊，停止才揭晓");

  const rafRef = useRef(0);
  const startTsRef = useRef(0);
  const remainingRef = useRef(0);
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const modeRef = useRef(mode);
  const showCounterRef = useRef(showCounter);
  const hideUntilZeroRef = useRef(hideUntilZero);
  const secondsRef = useRef(seconds);
  const voiceEnabledRef = useRef(voiceEnabled);
  const voiceTextRef = useRef(voiceText);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    showCounterRef.current = showCounter;
  }, [showCounter]);
  useEffect(() => {
    hideUntilZeroRef.current = hideUntilZero;
  }, [hideUntilZero]);
  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);
  useEffect(() => {
    voiceTextRef.current = voiceText;
  }, [voiceText]);
  useEffect(() => {
    persistVoiceSettings({ enabled: voiceEnabled, text: voiceText });
  }, [voiceEnabled, voiceText]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const idleHint = useCallback((nextMode = modeRef.current) => {
    if (nextMode === "countdown") {
      return hideUntilZeroRef.current
        ? "输入秒数后开始，到 0 才显示；中途暂停也不揭晓"
        : "输入秒数后开始，可随时停止再继续";
    }
    return showCounterRef.current
      ? "点击开始，再点一下停止看秒数"
      : "隐藏计时：开始后数字模糊，停止才揭晓";
  }, []);

  const countdownRunHint = useCallback(
    () =>
      hideUntilZeroRef.current
        ? "倒计时中… 到 0 才显示，暂停也不揭晓"
        : "倒计时中… 可随时停止",
    []
  );

  const resetDisplay = useCallback(
    (nextMode = modeRef.current) => {
      stopLoop();
      runningRef.current = false;
      pausedRef.current = false;
      finishedRef.current = false;
      elapsedRef.current = 0;
      setRunning(false);
      setPaused(false);
      setFinished(false);
      setTimerClass("");
      if (nextMode === "countdown") {
        remainingRef.current = readTargetMs(secondsRef.current);
        setDisplayMs(remainingRef.current || 0);
      } else {
        remainingRef.current = 0;
        setDisplayMs(0);
      }
      setHint(idleHint(nextMode));
    },
    [idleHint, stopLoop]
  );

  const finishStopwatch = useCallback(() => {
    stopLoop();
    const elapsed = performance.now() - startTsRef.current;
    elapsedRef.current = elapsed;
    runningRef.current = false;
    setRunning(false);
    setDisplayMs(elapsed);
    setTimerClass("done");
    message.success(`结果：${formatMs(elapsed)} 秒`);
    setHint("再来一把？点开始继续");
  }, [stopLoop]);

  const finishCountdown = useCallback(() => {
    stopLoop();
    runningRef.current = false;
    pausedRef.current = false;
    finishedRef.current = true;
    remainingRef.current = 0;
    setRunning(false);
    setPaused(false);
    setFinished(true);
    setDisplayMs(0);
    setTimerClass("flash");
    playExplosion();
    const endText = (voiceTextRef.current || DEFAULT_VOICE_TEXT).trim() || DEFAULT_VOICE_TEXT;
    message.error(endText);
    if (voiceEnabledRef.current) speak(endText, 520);
    setHint("倒计时结束，点重置或再设秒数开始");
    if (navigator.vibrate) navigator.vibrate([80, 40, 80, 40, 160]);
  }, [stopLoop]);

  const loopStopwatch = useCallback((now: number) => {
    elapsedRef.current = now - startTsRef.current;
    setDisplayMs(elapsedRef.current);
    rafRef.current = requestAnimationFrame(loopStopwatch);
  }, []);

  const loopCountdown = useCallback(
    (now: number) => {
      const left = Math.max(0, remainingRef.current - (now - startTsRef.current));
      setDisplayMs(left);
      if (left <= 0) {
        finishCountdown();
        return;
      }
      rafRef.current = requestAnimationFrame(loopCountdown);
    },
    [finishCountdown]
  );

  const pauseCountdown = useCallback(() => {
    remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startTsRef.current));
    stopLoop();
    runningRef.current = false;
    if (remainingRef.current <= 0) {
      finishCountdown();
      return;
    }
    pausedRef.current = true;
    setRunning(false);
    setPaused(true);
    setDisplayMs(remainingRef.current);
    setHint(
      hideUntilZeroRef.current
        ? "已暂停，到 0 前不会显示剩余时间"
        : `已暂停：还剩 ${formatMs(remainingRef.current)}，点「继续」接着倒`
    );
  }, [finishCountdown, stopLoop]);

  const start = useCallback(() => {
    ensureAudio();
    unlockSpeech();
    playClick();
    setTimerClass("");

    if (modeRef.current === "stopwatch") {
      if (runningRef.current) {
        finishStopwatch();
        return;
      }
      startTsRef.current = performance.now();
      elapsedRef.current = 0;
      runningRef.current = true;
      pausedRef.current = false;
      setRunning(true);
      setPaused(false);
      setHint(
        showCounterRef.current
          ? "计时中… 点击任意处或「停止」结束"
          : "数字已隐藏… 点击任意处揭晓秒数"
      );
      rafRef.current = requestAnimationFrame(loopStopwatch);
      return;
    }

    if (runningRef.current) {
      pauseCountdown();
      return;
    }

    if (pausedRef.current && remainingRef.current > 0) {
      startTsRef.current = performance.now();
      runningRef.current = true;
      pausedRef.current = false;
      finishedRef.current = false;
      setRunning(true);
      setPaused(false);
      setFinished(false);
      setHint(countdownRunHint());
      rafRef.current = requestAnimationFrame(loopCountdown);
      return;
    }

    const target = readTargetMs(secondsRef.current);
    if (!target) {
      message.warning("请输入大于 0 的秒数");
      return;
    }
    remainingRef.current = target;
    startTsRef.current = performance.now();
    runningRef.current = true;
    pausedRef.current = false;
    finishedRef.current = false;
    setRunning(true);
    setPaused(false);
    setFinished(false);
    setHint(countdownRunHint());
    rafRef.current = requestAnimationFrame(loopCountdown);
  }, [countdownRunHint, finishStopwatch, loopCountdown, loopStopwatch, pauseCountdown]);

  const reset = useCallback(() => {
    if (runningRef.current) return;
    playClick();
    resetDisplay();
  }, [resetDisplay]);

  const switchMode = useCallback(
    (next: string | number) => {
      if (next !== "stopwatch" && next !== "countdown") return;
      if (runningRef.current || next === modeRef.current) return;
      playClick();
      modeRef.current = next;
      setMode(next);
      resetDisplay(next);
    },
    [resetDisplay]
  );

  useEffect(() => {
    remainingRef.current = readTargetMs(3);
    return () => stopLoop();
  }, [stopLoop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        start();
      } else if ((e.key === "r" || e.key === "R") && !runningRef.current) {
        reset();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reset, start]);

  const currentMs = useMemo(() => {
    if (mode === "countdown" && running) {
      return Math.max(0, remainingRef.current - (performance.now() - startTsRef.current));
    }
    return displayMs;
  }, [displayMs, mode, running]);

  const hideDigits =
    (mode === "stopwatch" && running && !showCounter) ||
    (mode === "countdown" && hideUntilZero && (running || paused) && !finished);

  const startLabel = running ? "停止" : mode === "countdown" && paused ? "继续" : "开始";
  const canReset =
    !running &&
    ((mode === "stopwatch" && elapsedRef.current > 0) ||
      (mode === "countdown" && (finished || paused || remainingRef.current !== readTargetMs(seconds))));

  const extraSettings = (
    <>
      <div className="settings-label">计时</div>
      <div className="row">
        <span>正计时过程中显示数字</span>
        <Switch
          checked={showCounter}
          disabled={running && mode === "stopwatch"}
          onChange={(checked) => {
            setShowCounter(checked);
            showCounterRef.current = checked;
            if (!runningRef.current && !pausedRef.current) setHint(idleHint());
            else if (modeRef.current === "stopwatch" && runningRef.current) {
              setHint(
                checked
                  ? "计时中… 点击任意处或「停止」结束"
                  : "数字已隐藏… 点击任意处揭晓秒数"
              );
            }
          }}
        />
      </div>
      <div className="row">
        <span>倒计时仅到 0 才显示数字</span>
        <Switch
          checked={hideUntilZero}
          onChange={(checked) => {
            setHideUntilZero(checked);
            hideUntilZeroRef.current = checked;
            if (modeRef.current !== "countdown") {
              if (!runningRef.current && !pausedRef.current) setHint(idleHint());
              return;
            }
            if ((runningRef.current || pausedRef.current) && !finishedRef.current) {
              const left = runningRef.current
                ? Math.max(0, remainingRef.current - (performance.now() - startTsRef.current))
                : remainingRef.current;
              setDisplayMs(left);
              if (runningRef.current) setHint(countdownRunHint());
              else {
                setHint(
                  checked
                    ? "已暂停，到 0 前不会显示剩余时间"
                    : `已暂停：还剩 ${formatMs(left)}，点「继续」接着倒`
                );
              }
              return;
            }
            if (!runningRef.current && !pausedRef.current) setHint(idleHint());
          }}
        />
      </div>
      <div className="settings-label">语音</div>
      <div className="row">
        <span>倒计时结束播报</span>
        <Switch
          checked={voiceEnabled}
          onChange={(checked) => {
            setVoiceEnabled(checked);
            voiceEnabledRef.current = checked;
          }}
        />
      </div>
      <div className="voice-text">
        <Input
          className="voice-input"
          value={voiceText}
          maxLength={40}
          placeholder={DEFAULT_VOICE_TEXT}
          onChange={(e) => {
            setVoiceText(e.target.value);
            voiceTextRef.current = e.target.value;
          }}
        />
        <Button
          className="voice-preview"
          onClick={() => {
            ensureAudio();
            unlockSpeech();
            speak((voiceText || DEFAULT_VOICE_TEXT).trim() || DEFAULT_VOICE_TEXT, 0);
          }}
        >
          试听
        </Button>
      </div>
    </>
  );

  return (
    <div className="app">
      <AppHeader
        title="倒计时"
        icon={<WineGlassIcon />}
        onBack={onBack}
        extraSettings={extraSettings}
        theme={theme}
        setTheme={setTheme}
        onOpenChange={setSettingsOpen}
      >
        <Segmented
          className="mode-tabs"
          block
          disabled={running}
          value={mode}
          onChange={switchMode}
          options={[
            { label: "正计时", value: "stopwatch" },
            { label: "倒计时", value: "countdown" },
          ]}
        />
      </AppHeader>

      <main className="stage">
        <p className="hint">{hint}</p>
        <div
          className={`timer${hideDigits ? " hidden-run" : ""}${timerClass ? ` ${timerClass}` : ""}`}
          aria-live="polite"
        >
          {hideDigits ? "??.???" : formatMs(currentMs)}
        </div>

        {mode === "countdown" && (
          <div className="countdown-input">
            <InputNumber
              min={0.001}
              step={0.001}
              value={seconds}
              disabled={running || paused}
              inputMode="decimal"
              controls={false}
              onChange={(value) => {
                const next = typeof value === "number" ? value : null;
                setSeconds(next);
                secondsRef.current = next;
                if (!runningRef.current && !pausedRef.current) {
                  remainingRef.current = readTargetMs(next);
                  finishedRef.current = false;
                  setFinished(false);
                  setTimerClass("");
                  setDisplayMs(remainingRef.current || 0);
                }
              }}
            />
            <span className="unit">秒</span>
          </div>
        )}

        <div className="actions">
          <Button
            className={`btn-start${running ? " stop" : ""}`}
            type="primary"
            onClick={start}
          >
            {startLabel}
          </Button>
          <Button className="btn-reset" disabled={!canReset} onClick={reset}>
            重置
          </Button>
        </div>
      </main>

      <footer className="footer">满屏秒表 · 毫秒精度 · 点停即显</footer>
      <div
        className={`tap-overlay${running && !settingsOpen ? " active" : ""}`}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!runningRef.current || settingsOpen) return;
          playClick();
          if (modeRef.current === "stopwatch") finishStopwatch();
          else pauseCountdown();
        }}
      />
    </div>
  );
}
