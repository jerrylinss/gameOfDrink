import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "antd";
import { LockFilled } from "@ant-design/icons";
import AppHeader from "../shared/AppHeader";
import { playClick, playDice, playLock } from "../shared/audio";
import DiceIcon from "./DiceIcon";
import "./DiceGame.css";

const MAX_DICE = 6;
const PIP_MAP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function makeDice(count) {
  return Array.from({ length: count }, (_, id) => ({
    id,
    value: 1,
    locked: false,
  }));
}

function Die({ value, locked, rolling, idle, onToggle }) {
  const pips = PIP_MAP[value] || PIP_MAP[1];
  return (
    <button
      type="button"
      className={`die${locked ? " locked" : ""}${rolling ? " rolling" : ""}${idle ? " idle" : ""}`}
      onClick={onToggle}
      aria-label={`${value} 点${locked ? "，已锁定" : ""}`}
      aria-pressed={locked}
    >
      <span className="die-face">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className={`pip${pips.includes(i) ? " on" : ""}`} />
        ))}
      </span>
      {locked ? (
        <span className="die-lock">
          <LockFilled />
        </span>
      ) : null}
    </button>
  );
}

export default function DiceGame({ theme, setTheme, onBack }) {
  const [count, setCount] = useState(5);
  const [dice, setDice] = useState(() => makeDice(5));
  const [rolling, setRolling] = useState(false);
  const [rolled, setRolled] = useState(false);
  const timerRef = useRef(0);

  const lockedCount = useMemo(() => dice.filter((d) => d.locked).length, [dice]);
  const sum = useMemo(() => dice.reduce((acc, d) => acc + d.value, 0), [dice]);
  const allLocked = rolled && lockedCount === dice.length;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = 0;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const changeCount = (next) => {
    if (rolling || next === count) return;
    playClick();
    clearTimer();
    setCount(next);
    setDice(makeDice(next));
    setRolled(false);
    setRolling(false);
  };

  const roll = () => {
    if (rolling) return;
    const unlocked = dice.filter((d) => !d.locked);
    if (rolled && unlocked.length === 0) return;
    playDice();
    if (navigator.vibrate) navigator.vibrate([18, 24, 18, 24, 36]);
    setRolling(true);
    let ticks = 0;
    clearTimer();
    timerRef.current = window.setInterval(() => {
      ticks += 1;
      setDice((prev) =>
        prev.map((die) =>
          die.locked ? die : { ...die, value: 1 + Math.floor(Math.random() * 6) }
        )
      );
      if (ticks >= 12) {
        clearTimer();
        setDice((prev) =>
          prev.map((die) =>
            die.locked ? die : { ...die, value: 1 + Math.floor(Math.random() * 6) }
          )
        );
        setRolling(false);
        setRolled(true);
      }
    }, 55);
  };

  const toggleLock = (id) => {
    if (rolling || !rolled) return;
    playLock();
    setDice((prev) =>
      prev.map((die) => (die.id === id ? { ...die, locked: !die.locked } : die))
    );
  };

  const unlockAll = () => {
    if (rolling || lockedCount === 0) return;
    playClick();
    setDice((prev) => prev.map((die) => ({ ...die, locked: false })));
  };

  const reset = () => {
    if (rolling) return;
    playClick();
    clearTimer();
    setDice(makeDice(count));
    setRolled(false);
    setRolling(false);
  };

  const hint = rolling
    ? "色子跳动中…"
    : !rolled
      ? "选好个数后摇一摇，摇完点色子可锁定"
      : allLocked
        ? "已全部锁定，点色子可解锁，或重置再来"
        : "点色子锁定/解锁，再摇只动没锁的";

  const rollLabel = rolling ? "摇晃中" : rolled ? "再摇" : "摇一摇";

  return (
    <div className="app">
      <AppHeader
        title="摇色子"
        icon={<DiceIcon />}
        onBack={onBack}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="stage dice-stage">
        <p className="hint">{hint}</p>

        <div className="dice-count" role="group" aria-label="色子个数">
          {Array.from({ length: MAX_DICE }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`count-chip${count === n ? " active" : ""}`}
              disabled={rolling}
              onClick={() => changeCount(n)}
            >
              {n}
            </button>
          ))}
        </div>

        <div className={`dice-board count-${count}`}>
          {dice.map((die) => (
            <Die
              key={die.id}
              value={die.value}
              locked={die.locked}
              rolling={rolling && !die.locked}
              idle={!rolled && !rolling}
              onToggle={() => toggleLock(die.id)}
            />
          ))}
        </div>

        <div className={`dice-sum${rolled ? "" : " muted"}`}>
          {rolled ? `合计 ${sum}` : "合计 —"}
        </div>

        <div className="actions">
          <Button
            className="btn-start"
            type="primary"
            disabled={rolling || allLocked}
            onClick={roll}
          >
            {rollLabel}
          </Button>
          <div className="dice-side-actions">
            <Button className="btn-reset" disabled={rolling || lockedCount === 0} onClick={unlockAll}>
              解锁
            </Button>
            <Button className="btn-reset" disabled={rolling || (!rolled && lockedCount === 0)} onClick={reset}>
              重置
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
