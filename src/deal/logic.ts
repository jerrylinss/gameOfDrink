// 成不成交：规则与纯计算。改报价、轮次、金额补齐时先看这里。

export const MIN_BOXES = 2;
export const MAX_BOXES = 20;
export const DEFAULT_COUNT = 10;
export const DEFAULT_DISCOUNT = 10;
export const DEFAULT_ROUNDS_TEXT = "3,2,1";
export const CONFIG_STORAGE_KEY = "jiuzhuo-deal-config";

/** 默认金额阶梯。箱子变多时从这里往下取，超出后按最后一档翻倍。 */
const AMOUNT_LADDER = [
  0.1, 1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000,
  500000, 1000000, 2000000,
];

const TOKEN_SPLIT = /[\s,，、;；]+/;

export type AssignMode = "random" | "manual";

export type DealConfig = {
  count: number;
  amountsText: string;
  assignMode: AssignMode;
  manualAmounts: string[];
  roundsText: string;
  discount: number;
};

export type Box = {
  id: number;
  amount: number;
  opened: boolean;
};

export type OfferQuote = {
  average: number;
  offer: number;
  count: number;
};

export type OfferRecord = {
  round: number;
  offer: number;
  accepted: boolean;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return roundMoney(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

/** 箱子和金额条上用的短写法，避免大数字撑破格子。 */
export function formatCompact(value: number): string {
  const n = roundMoney(value);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 100000000) return `${sign}${trimNumber(abs / 100000000)}亿`;
  if (abs >= 10000) return `${sign}${trimNumber(abs / 10000)}万`;
  return formatMoney(n);
}

function trimNumber(value: number): string {
  const n = roundMoney(value);
  return Number.isInteger(n) ? String(n) : String(n);
}

export function defaultAmounts(count: number): number[] {
  if (count <= AMOUNT_LADDER.length) return AMOUNT_LADDER.slice(0, count);
  const list = [...AMOUNT_LADDER];
  let last = list[list.length - 1];
  while (list.length < count) {
    last *= 2;
    list.push(last);
  }
  return list;
}

export function formatAmountList(amounts: number[]): string {
  return amounts.map((amount) => trimNumber(amount)).join(", ");
}

export function defaultConfig(): DealConfig {
  const count = DEFAULT_COUNT;
  return {
    count,
    amountsText: formatAmountList(defaultAmounts(count)),
    assignMode: "random",
    manualAmounts: Array.from({ length: count }, () => ""),
    roundsText: DEFAULT_ROUNDS_TEXT,
    discount: DEFAULT_DISCOUNT,
  };
}

export function resizeManualAmounts(list: string[], count: number): string[] {
  const next = list.slice(0, count);
  while (next.length < count) next.push("");
  return next;
}

function clampCount(value: number): number {
  if (!Number.isInteger(value)) return DEFAULT_COUNT;
  return Math.min(MAX_BOXES, Math.max(MIN_BOXES, value));
}

function clampDiscount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DISCOUNT;
  return Math.min(90, Math.max(0, Math.round(value)));
}

export function readConfig(): DealConfig {
  const fallback = defaultConfig();
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw) as Partial<DealConfig>;
    const count = clampCount(Number(data.count));
    const assignMode: AssignMode = data.assignMode === "manual" ? "manual" : "random";
    const manualSource = Array.isArray(data.manualAmounts) ? data.manualAmounts.map(String) : [];
    const discount = clampDiscount(Number(data.discount));
    const amountsText = typeof data.amountsText === "string" ? data.amountsText.slice(0, 2000) : fallback.amountsText;
    const roundsText =
      typeof data.roundsText === "string" && data.roundsText.trim()
        ? data.roundsText.slice(0, 80)
        : fallback.roundsText;
    return {
      count,
      amountsText,
      assignMode,
      manualAmounts: resizeManualAmounts(manualSource, count),
      roundsText,
      discount,
    };
  } catch {
    return fallback;
  }
}

export function writeConfig(config: DealConfig) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 无痕模式或配额满时忽略，游戏仍可继续
  }
}

export type ParsedAmounts = {
  amounts: number[];
  invalid: number;
};

export function parseAmountList(text: string): ParsedAmounts {
  const tokens = text
    .split(TOKEN_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const amounts: number[] = [];
  let invalid = 0;
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isFinite(value) || value < 0) {
      invalid += 1;
      continue;
    }
    amounts.push(roundMoney(value));
  }
  return { amounts, invalid };
}

/**
 * 金额个数和箱子个数不一致时自动收口：
 * 多了取前面的，少了用默认阶梯里还没出现的数字补上。
 */
export function fitAmounts(raw: number[], count: number): { amounts: number[]; note: string | null } {
  if (raw.length === count) return { amounts: raw.slice(), note: null };
  if (raw.length > count) {
    return {
      amounts: raw.slice(0, count),
      note: `金额写了 ${raw.length} 个，箱子只有 ${count} 个，已使用前 ${count} 个`,
    };
  }
  const amounts = raw.slice();
  const extras = defaultAmounts(count + raw.length);
  for (const value of extras) {
    if (amounts.length >= count) break;
    if (!amounts.includes(value)) amounts.push(value);
  }
  let bump = (amounts[amounts.length - 1] ?? 1) * 2;
  while (amounts.length < count) {
    amounts.push(roundMoney(bump));
    bump *= 2;
  }
  return {
    amounts,
    note: `金额只有 ${raw.length} 个，已自动补到 ${count} 个`,
  };
}

/** 解析失败返回 null，调用方提示玩家改输入。每一轮都是正整数。 */
export function parseRounds(text: string): number[] | null {
  const tokens = text
    .split(TOKEN_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (!tokens.length) return null;
  const rounds: number[] = [];
  for (const token of tokens) {
    const value = Number(token);
    if (!Number.isInteger(value) || value < 1 || value > MAX_BOXES) return null;
    rounds.push(value);
  }
  return rounds;
}

/** 轮次用完后，后面每轮都沿用最后一个 k。 */
export function roundSize(rounds: number[], roundIndex: number): number {
  if (!rounds.length) return 1;
  return rounds[Math.min(roundIndex, rounds.length - 1)];
}

/**
 * 第一轮就要把其他箱子开完时，按规则会直接揭晓自己的箱子，中间不会报价。
 */
export function offersCanHappen(count: number, rounds: number[]): boolean {
  return roundSize(rounds, 0) < count - 1;
}

export function shuffle<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i];
    next[i] = next[j];
    next[j] = current;
  }
  return next;
}

export function makeBoxes(amounts: number[]): Box[] {
  return amounts.map((amount, index) => ({
    id: index + 1,
    amount,
    opened: false,
  }));
}

export function isValidAmountText(text: string): boolean {
  const value = Number(text.trim());
  return text.trim().length > 0 && Number.isFinite(value) && value >= 0;
}

/**
 * 报价只看还没打开的箱子，包括玩家挂起的那一个。
 * 报价 = 平均值 × (1 - 折扣比例)，默认少 10%。
 */
export function quoteOffer(boxes: Box[], discountPercent: number): OfferQuote {
  const left = boxes.filter((box) => !box.opened);
  const count = left.length;
  if (!count) return { average: 0, offer: 0, count: 0 };
  const sum = left.reduce((acc, box) => acc + box.amount, 0);
  const average = roundMoney(sum / count);
  const offer = roundMoney(average * (1 - discountPercent / 100));
  return { average, offer, count };
}

export function othersRemaining(boxes: Box[], ownId: number): number {
  return boxes.filter((box) => box.id !== ownId && !box.opened).length;
}

export function amountMedian(boxes: Box[]): number {
  const sorted = boxes.map((box) => box.amount).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
