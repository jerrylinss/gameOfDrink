import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, InputNumber, Segmented, message } from "antd";
import AppHeader from "../shared/AppHeader";
import { playCaseOpen, playClick, playDealWin, playOfferChime } from "../shared/audio";
import type { GameScreenProps } from "../shared/types";
import DealIcon from "./DealIcon";
import {
  DEFAULT_DISCOUNT,
  MAX_BOXES,
  MIN_BOXES,
  amountMedian,
  defaultAmounts,
  fitAmounts,
  formatAmountList,
  formatCompact,
  formatMoney,
  isValidAmountText,
  makeBoxes,
  offersCanHappen,
  othersRemaining,
  parseAmountList,
  parseRounds,
  quoteOffer,
  readConfig,
  resizeManualAmounts,
  roundMoney,
  roundSize,
  shuffle,
  writeConfig,
  type AssignMode,
  type Box,
  type DealConfig,
  type OfferRecord,
} from "./logic";
import "./DealGame.css";

type Phase = "setup" | "pick" | "play" | "offer" | "end";

type Result = {
  gained: number;
  source: "offer" | "box";
  ownAmount: number;
  ownId: number;
};

const OPEN_DELAY = 420;

function resultCopy(result: Result): string {
  if (result.source === "box") {
    return `${result.ownId} 号箱一直挂到最后，现在里面的金额归你。`;
  }
  const own = `${result.ownId} 号箱里是 ${formatMoney(result.ownAmount)}`;
  const diff = roundMoney(result.ownAmount - result.gained);
  if (diff > 0) return `${own}，比报价多 ${formatMoney(diff)}。`;
  if (diff < 0) return `${own}，报价比它多 ${formatMoney(-diff)}。`;
  return `${own}，和报价一样。`;
}

export default function DealGame({ theme, setTheme, onBack }: GameScreenProps) {
  const [draft, setDraft] = useState<DealConfig>(readConfig);
  const [phase, setPhase] = useState<Phase>("setup");
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [ownId, setOwnId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [openedThisRound, setOpenedThisRound] = useState(0);
  const [rounds, setRounds] = useState<number[]>([3, 2, 1]);
  const [discount, setDiscount] = useState(DEFAULT_DISCOUNT);
  const [quote, setQuote] = useState({ average: 0, offer: 0, count: 0 });
  const [history, setHistory] = useState<OfferRecord[]>([]);
  const [openOrder, setOpenOrder] = useState<number[]>([]);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const phaseRef = useRef<Phase>("setup");
  const busyRef = useRef(false);
  const waitRef = useRef(0);
  const poolRef = useRef<number[]>([]);
  const modeRef = useRef<AssignMode>("random");
  const boxesRef = useRef<Box[]>([]);
  const openedRoundRef = useRef(0);

  useEffect(() => {
    writeConfig(draft);
  }, [draft]);

  useEffect(() => () => window.clearTimeout(waitRef.current), []);

  const goPhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const patchDraft = (partial: Partial<DealConfig>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      if (partial.count != null && partial.count !== prev.count) {
        const prevDefault = formatAmountList(defaultAmounts(prev.count));
        if (prev.amountsText.trim() === prevDefault) {
          next.amountsText = formatAmountList(defaultAmounts(partial.count));
        }
        next.manualAmounts = resizeManualAmounts(prev.manualAmounts, partial.count);
      }
      return next;
    });
  };

  const parsedRounds = useMemo(() => parseRounds(draft.roundsText), [draft.roundsText]);
  const roundHint = useMemo(() => {
    if (!parsedRounds) return "每轮填正整数，例如 3,2,1。只填一个数字则每轮都开这么多。";
    if (!offersCanHappen(draft.count, parsedRounds)) {
      return "第一轮就会把其他箱子开完，中间不会报价。把第一个数字改小，才会问成不成交。";
    }
    const preview = parsedRounds.join("、");
    return `第 1 轮开 ${parsedRounds[0]} 个，之后按 ${preview} 走；轮次用完后沿用最后一个数。`;
  }, [draft.count, parsedRounds]);

  const startMatch = (pool: number[], randomize: boolean, roundList: number[], discountPercent: number) => {
    window.clearTimeout(waitRef.current);
    busyRef.current = false;
    const amounts = randomize ? shuffle(pool) : pool.slice();
    const created = makeBoxes(amounts);
    poolRef.current = pool.slice();
    modeRef.current = randomize ? "random" : "manual";
    boxesRef.current = created;
    openedRoundRef.current = 0;
    setBoxes(created);
    setOwnId(null);
    setPendingId(null);
    setRoundIndex(0);
    setOpenedThisRound(0);
    setRounds(roundList);
    setDiscount(discountPercent);
    setHistory([]);
    setOpenOrder([]);
    setFlashId(null);
    setResult(null);
    setQuote({ average: 0, offer: 0, count: 0 });
    goPhase("pick");
  };

  const begin = () => {
    playClick();
    const parsed = parseAmountList(draft.amountsText);
    if (parsed.invalid > 0) {
      message.warning("金额里有无法识别的内容，请只填不小于 0 的数字");
      return;
    }
    const roundList = parseRounds(draft.roundsText);
    if (!roundList) {
      message.warning("每轮开箱数请填正整数，例如 3,2,1");
      return;
    }

    let pool: number[] = [];
    let note: string | null = null;
    if (draft.assignMode === "manual") {
      if (draft.manualAmounts.length !== draft.count || draft.manualAmounts.some((item) => !isValidAmountText(item))) {
        message.warning("手动模式下，请给每个箱子填写不小于 0 的金额");
        return;
      }
      pool = draft.manualAmounts.map((item) => roundMoney(Number(item)));
    } else {
      if (!parsed.amounts.length) {
        message.warning("请填写金额，用逗号或空格分开");
        return;
      }
      const fitted = fitAmounts(parsed.amounts, draft.count);
      pool = fitted.amounts;
      note = fitted.note;
    }

    if (note) message.info(note);
    startMatch(pool, draft.assignMode === "random", roundList, draft.discount);
  };

  const fillManual = () => {
    playClick();
    const parsed = parseAmountList(draft.amountsText);
    if (parsed.invalid > 0 || !parsed.amounts.length) {
      message.warning("先把上面的金额列表写成数字");
      return;
    }
    const fitted = fitAmounts(parsed.amounts, draft.count);
    patchDraft({ manualAmounts: fitted.amounts.map((amount) => String(amount)) });
    if (fitted.note) message.info(fitted.note);
  };

  const restoreDefaultAmounts = () => {
    playClick();
    patchDraft({ amountsText: formatAmountList(defaultAmounts(draft.count)) });
  };

  const backToSetup = () => {
    playClick();
    window.clearTimeout(waitRef.current);
    busyRef.current = false;
    goPhase("setup");
  };

  const replay = () => {
    playClick();
    startMatch(poolRef.current, modeRef.current === "random", rounds, discount);
  };

  const suspendBox = () => {
    if (pendingId == null) return;
    playClick();
    setOwnId(pendingId);
    setPendingId(null);
    goPhase("play");
  };

  const finishWithBox = (list: Box[], playerId: number) => {
    const own = list.find((box) => box.id === playerId);
    if (!own) return;
    const revealed = list.map((box) => (box.id === playerId ? { ...box, opened: true } : box));
    boxesRef.current = revealed;
    setBoxes(revealed);
    setFlashId(playerId);
    setOpenOrder((order) => (order.includes(playerId) ? order : [...order, playerId]));
    setResult({
      gained: own.amount,
      source: "box",
      ownAmount: own.amount,
      ownId: playerId,
    });
    goPhase("end");
    playDealWin();
    if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  };

  const openBox = (id: number) => {
    if (phaseRef.current !== "play" || busyRef.current || ownId == null) return;
    const current = boxesRef.current;
    const target = current.find((box) => box.id === id);
    if (!target || target.opened || target.id === ownId) return;

    playCaseOpen();
    if (navigator.vibrate) navigator.vibrate(12);

    const next = current.map((box) => (box.id === id ? { ...box, opened: true } : box));
    const openedNow = openedRoundRef.current + 1;
    const k = roundSize(rounds, roundIndex);
    const leftOthers = othersRemaining(next, ownId);
    boxesRef.current = next;
    openedRoundRef.current = openedNow;
    setBoxes(next);
    setOpenedThisRound(openedNow);
    setFlashId(id);
    setOpenOrder((order) => [...order, id]);

    if (leftOthers > 0 && openedNow < k) return;

    busyRef.current = true;
    window.clearTimeout(waitRef.current);
    waitRef.current = window.setTimeout(() => {
      busyRef.current = false;
      if (phaseRef.current !== "play") return;
      if (leftOthers === 0) {
        finishWithBox(next, ownId);
        return;
      }
      setQuote(quoteOffer(next, discount));
      goPhase("offer");
      playOfferChime();
      if (navigator.vibrate) navigator.vibrate([16, 30, 16]);
    }, OPEN_DELAY);
  };

  const acceptOffer = () => {
    if (ownId == null) return;
    playDealWin();
    const own = boxes.find((box) => box.id === ownId);
    if (!own) return;
    setHistory((list) => [...list, { round: roundIndex + 1, offer: quote.offer, accepted: true }]);
    const revealed = boxesRef.current.map((box) => (box.id === ownId ? { ...box, opened: true } : box));
    boxesRef.current = revealed;
    setBoxes(revealed);
    setFlashId(ownId);
    setOpenOrder((order) => (order.includes(ownId) ? order : [...order, ownId]));
    setResult({
      gained: quote.offer,
      source: "offer",
      ownAmount: own.amount,
      ownId,
    });
    goPhase("end");
  };

  const rejectOffer = () => {
    playClick();
    setHistory((list) => [...list, { round: roundIndex + 1, offer: quote.offer, accepted: false }]);
    openedRoundRef.current = 0;
    setRoundIndex((index) => index + 1);
    setOpenedThisRound(0);
    goPhase("play");
  };

  const median = useMemo(() => amountMedian(boxes), [boxes]);
  const ladder = useMemo(
    () => [...boxes].sort((a, b) => b.amount - a.amount || a.id - b.id),
    [boxes]
  );
  const openedBoxes = openOrder.flatMap((id) => {
    const box = boxes.find((item) => item.id === id);
    return box && box.opened && box.id !== ownId ? [box] : [];
  });

  const k = roundSize(rounds, roundIndex);
  const unopened = boxes.filter((box) => !box.opened).length;
  const openedCount = boxes.filter((box) => box.opened).length;
  const others = ownId == null ? 0 : othersRemaining(boxes, ownId);
  const need = Math.max(0, k - openedThisRound);

  const playHint = (() => {
    if (others > 0 && need > 0 && need >= others) return `再开 ${others} 个就会揭晓你的箱子`;
    if (need > 0) return `再开 ${need} 个箱子后报价`;
    return "等待报价";
  })();

  return (
    <div className="app">
      <AppHeader title="成不成交" icon={<DealIcon />} onBack={onBack} theme={theme} setTheme={setTheme} />

      <main className="stage deal-stage">
        <div className="deal-wrap">
          {phase === "setup" ? (
            <>
              <p className="deal-rules">
                先挂起一个箱子。再打开其他箱子，每开完一轮，就按剩下金额的平均值打折报价。接受就拿走报价，不接受就继续。最后只剩自己的箱子时，拿到里面的金额。
              </p>
              <div className="deal-form">
                <div className="deal-inline">
                  <label className="deal-field">
                    <span className="deal-label">
                      箱子数量 <span>{MIN_BOXES}–{MAX_BOXES}</span>
                    </span>
                    <InputNumber
                      min={MIN_BOXES}
                      max={MAX_BOXES}
                      precision={0}
                      value={draft.count}
                      inputMode="numeric"
                      onChange={(value) => {
                        if (typeof value !== "number") return;
                        patchDraft({ count: value });
                      }}
                    />
                  </label>
                  <label className="deal-field">
                    <span className="deal-label">
                      报价折扣 <span>少 {draft.discount}%</span>
                    </span>
                    <InputNumber
                      min={0}
                      max={90}
                      precision={0}
                      value={draft.discount}
                      inputMode="numeric"
                      addonAfter="%"
                      onChange={(value) => {
                        if (typeof value !== "number") return;
                        patchDraft({ discount: value });
                      }}
                    />
                  </label>
                </div>

                <div className="deal-field">
                  <div className="deal-label">
                    金额列表
                    <Button type="text" className="deal-link" onClick={restoreDefaultAmounts}>
                      恢复默认
                    </Button>
                  </div>
                  <Input.TextArea
                    value={draft.amountsText}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="0.1, 1, 5, 10, 20, 50, 100"
                    onChange={(event) => patchDraft({ amountsText: event.target.value })}
                  />
                  <p className="deal-help">个数最好和箱子一样。多了取前面的，少了用默认金额补上。随机模式下会打乱放进箱子。</p>
                </div>

                <div className="deal-field">
                  <span className="deal-label">分配方式</span>
                  <Segmented
                    block
                    className="mode-tabs"
                    value={draft.assignMode}
                    onChange={(value) => {
                      playClick();
                      patchDraft({ assignMode: value as AssignMode });
                    }}
                    options={[
                      { label: "随机分配", value: "random" },
                      { label: "手动填写", value: "manual" },
                    ]}
                  />
                </div>

                {draft.assignMode === "manual" ? (
                  <div className="deal-field">
                    <div className="manual-head">
                      <span className="deal-label">每个箱子的金额</span>
                      <Button type="text" className="deal-link" onClick={fillManual}>
                        用列表填入
                      </Button>
                    </div>
                    <div className="manual-grid">
                      {draft.manualAmounts.map((amount, index) => (
                        <label key={index} className="manual-cell">
                          <em>{index + 1}</em>
                          <input
                            inputMode="decimal"
                            value={amount}
                            aria-label={`${index + 1} 号箱金额`}
                            placeholder="金额"
                            onChange={(event) => {
                              const manualAmounts = draft.manualAmounts.slice();
                              manualAmounts[index] = event.target.value;
                              patchDraft({ manualAmounts });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="deal-help">手动金额按编号固定，开始后不会打乱，开箱前仍然隐藏。</p>
                  </div>
                ) : null}

                <label className="deal-field">
                  <span className="deal-label">
                    每轮开箱数 <span>k</span>
                  </span>
                  <Input
                    value={draft.roundsText}
                    placeholder="3,2,1"
                    inputMode="numeric"
                    onChange={(event) => patchDraft({ roundsText: event.target.value })}
                  />
                  <p className={`deal-help${parsedRounds && !offersCanHappen(draft.count, parsedRounds) ? " warn" : ""}`}>
                    {roundHint}
                  </p>
                </label>

                <div className="actions">
                  <Button className="btn-start" type="primary" onClick={begin}>
                    开始
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="deal-stats">
                <div className="deal-stat">
                  <b>{phase === "pick" ? "选箱" : `第 ${roundIndex + 1} 轮`}</b>
                  <span>进度</span>
                </div>
                <div className="deal-stat">
                  <b>{phase === "pick" ? "—" : `${openedThisRound}/${k}`}</b>
                  <span>本轮</span>
                </div>
                <div className="deal-stat">
                  <b>{openedCount}</b>
                  <span>已开</span>
                </div>
                <div className="deal-stat">
                  <b>{unopened}</b>
                  <span>未开</span>
                </div>
              </div>

              <div className="ladder" aria-label="金额">
                {ladder.map((box) => (
                  <span key={box.id} className={`ladder-chip${box.opened ? " off" : ""}`}>
                    {formatCompact(box.amount)}
                  </span>
                ))}
              </div>

              <div className="case-grid">
                {boxes.map((box) => {
                  const mine = box.id === ownId;
                  const picked = phase === "pick" && box.id === pendingId;
                  const opened = box.opened;
                  const high = opened && box.amount >= median;
                  const canPress = phase === "pick" || (phase === "play" && !opened && !mine);
                  return (
                    <button
                      key={box.id}
                      type="button"
                      className={`case${picked ? " picked" : ""}${mine ? " mine" : ""}${opened ? " opened" : ""}${opened ? (high ? " high" : " low") : ""}${flashId === box.id ? " flash" : ""}`}
                      disabled={!canPress}
                      onClick={() => {
                        if (phase === "pick") {
                          playClick();
                          setPendingId(box.id);
                          return;
                        }
                        openBox(box.id);
                      }}
                      aria-label={
                        opened
                          ? `${box.id} 号箱，${formatMoney(box.amount)}`
                          : mine
                            ? `${box.id} 号箱，已挂起`
                            : `${box.id} 号箱`
                      }
                    >
                      {mine && !opened ? <span className="case-tag">我的</span> : null}
                      {picked ? <span className="case-tag">选中</span> : null}
                      <span className="case-no">{box.id}</span>
                      {opened ? <span className="case-amount">{formatCompact(box.amount)}</span> : null}
                    </button>
                  );
                })}
              </div>

              {phase === "pick" ? (
                <p className="hint">{pendingId == null ? "点一个箱子，挂起后直到最后才打开" : `准备挂起 ${pendingId} 号箱`}</p>
              ) : null}
              {phase === "play" || phase === "offer" ? (
                <p className="hint">
                  你的箱子是 {ownId} 号。{playHint}
                </p>
              ) : null}

              {openedBoxes.length > 0 && phase !== "end" ? (
                <p className="opened-line">
                  已开：
                  {openedBoxes.map((box) => `${box.id}号 ${formatCompact(box.amount)}`).join(" · ")}
                </p>
              ) : null}

              {history.length > 0 ? (
                <ul className="deal-history">
                  {history.map((item) => (
                    <li key={`${item.round}-${item.offer}`} className={item.accepted ? "took" : ""}>
                      第 {item.round} 轮 {formatMoney(item.offer)} {item.accepted ? "接受" : "拒绝"}
                    </li>
                  ))}
                </ul>
              ) : null}

              {phase === "end" && result ? (
                <section className="deal-result">
                  <h2>{result.source === "offer" ? "成交" : "开到自己的箱子"}</h2>
                  <div className={`deal-gain${result.source === "offer" && result.gained < result.ownAmount ? " miss" : ""}`}>
                    {formatMoney(result.gained)}
                  </div>
                  <p>{resultCopy(result)}</p>
                </section>
              ) : null}

              <div className="deal-dock">
                <div className="actions">
                  {phase === "pick" ? (
                    <Button className="btn-start" type="primary" disabled={pendingId == null} onClick={suspendBox}>
                      {pendingId == null ? "先选一个箱子" : `挂起 ${pendingId} 号`}
                    </Button>
                  ) : null}
                  {phase === "end" ? (
                    <Button className="btn-start" type="primary" onClick={replay}>
                      再来一局
                    </Button>
                  ) : null}
                  <Button className="btn-reset" onClick={backToSetup}>
                    返回设置
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {phase === "offer" ? (
        <div className="deal-mask" role="dialog" aria-modal="true" aria-labelledby="deal-offer-title">
          <div className="deal-modal">
            <h2 id="deal-offer-title">成不成交</h2>
            <div className="deal-offer">{formatMoney(quote.offer)}</div>
            <div className="deal-choice">
              <Button className="deal-accept" type="primary" onClick={acceptOffer}>
                接受
              </Button>
              <Button className="deal-reject" onClick={rejectOffer}>
                不接受
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
