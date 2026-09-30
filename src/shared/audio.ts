// CC0 recordings: "Small Rock and Stone Hits" (lolamadeus) and "impact-stone" (kasparsj) via Freesound.
import stoneHitsUrl from "./sfx/stone-hits.mp3";
import stoneThrowUrl from "./sfx/stone-throw.mp3";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let audioCtx: AudioContext | null = null;

function unlockContext(ctx: AudioContext) {
  if (ctx.state === "suspended") void ctx.resume();
  try {
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore browsers that reject the silent buffer
  }
}

export function ensureAudio(): AudioContext | null {
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as AudioWindow).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  unlockContext(audioCtx);
  return audioCtx;
}

export function unlockAudio() {
  ensureAudio();
  void decodeStoneAudio();
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.18, when = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playClick() {
  tone(880, 0.07, "triangle", 0.16);
  tone(1320, 0.08, "triangle", 0.1, 0.04);
}

type StoneBank = {
  buffer: AudioBuffer;
  hits: number[];
};

let stoneHits: StoneBank | null = null;
let stoneThrow: AudioBuffer | null = null;
let stoneHitsRaw: ArrayBuffer | null = null;
let stoneThrowRaw: ArrayBuffer | null = null;
let stoneFetch: Promise<void> | null = null;
let stoneDecode: Promise<void> | null = null;

function findHitOffsets(buffer: AudioBuffer) {
  const data = buffer.getChannelData(0);
  const sr = buffer.sampleRate;
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const thresh = peak * 0.3;
  const minGap = Math.floor(sr * 0.08);
  const hits: number[] = [];
  let last = -minGap;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) >= thresh && i - last >= minGap) {
      hits.push(Math.max(0, i / sr - 0.006));
      last = i;
    }
  }
  return hits.length ? hits : [0];
}

async function loadMp3(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.arrayBuffer();
}

export function preloadDiceAudio() {
  if (!stoneFetch) {
    stoneFetch = Promise.all([loadMp3(stoneHitsUrl), loadMp3(stoneThrowUrl)])
      .then(([hitsRaw, throwRaw]) => {
        stoneHitsRaw = hitsRaw.slice(0);
        stoneThrowRaw = throwRaw.slice(0);
      })
      .catch(() => {
        stoneFetch = null;
      });
  }
  return stoneFetch;
}

function decodeStoneAudio() {
  if (stoneHits && stoneThrow) return Promise.resolve();
  const ctx = ensureAudio();
  if (!ctx) return Promise.resolve();
  if (!stoneDecode) {
    stoneDecode = preloadDiceAudio()
      .then(async () => {
        if (stoneHits && stoneThrow) return;
        if (!stoneHitsRaw || !stoneThrowRaw) throw new Error("missing dice audio");
        const [hitsBuf, throwBuf] = await Promise.all([
          ctx.decodeAudioData(stoneHitsRaw.slice(0)),
          ctx.decodeAudioData(stoneThrowRaw.slice(0)),
        ]);
        stoneHits = { buffer: hitsBuf, hits: findHitOffsets(hitsBuf) };
        stoneThrow = throwBuf;
      })
      .catch(() => {
        stoneDecode = null;
      });
  }
  return stoneDecode;
}

function playStoneSlice(when: number, gain: number, heavy: boolean) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const source = ctx.createBufferSource();
  let offset = 0;
  let dur = 0.13 + Math.random() * 0.05;
  if (heavy && stoneThrow) {
    source.buffer = stoneThrow;
    dur = Math.min(0.2, stoneThrow.duration);
  } else if (stoneHits) {
    source.buffer = stoneHits.buffer;
    offset = stoneHits.hits[Math.floor(Math.random() * stoneHits.hits.length)] ?? 0;
  } else {
    return;
  }

  source.playbackRate.value = 0.9 + Math.random() * 0.22;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 220;
  const g = ctx.createGain();
  const t0 = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(hp);
  hp.connect(g);
  g.connect(ctx.destination);
  source.start(t0, offset, dur);
}

export function playDice() {
  void decodeStoneAudio().then(() => {
    const hits = [0, 0.04, 0.076, 0.122, 0.168, 0.226, 0.284, 0.348, 0.416, 0.49, 0.562];
    hits.forEach((offset, i) => {
      const settle = i > 7 ? 0.62 : 1;
      playStoneSlice(
        offset + Math.random() * 0.01,
        (0.34 + Math.random() * 0.16) * settle,
        i === 1 || i === 5
      );
    });
  });
}

export function playLock() {
  tone(520, 0.08, "triangle", 0.12);
  tone(780, 0.1, "sine", 0.08, 0.05);
}

export function playExplosion() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const duration = 1.15;
  const sampleRate = ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const p = i / data.length;
    const crack = (Math.random() * 2 - 1) * (1 - p);
    const rumble = Math.sin(i * 0.012) * (1 - p) * 0.45;
    data[i] = crack * 0.85 + rumble;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.setValueAtTime(1800, t0);
  noiseFilter.frequency.exponentialRampToValueAtTime(90, t0 + duration);
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.85, t0 + 0.018);
  noiseGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.18);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + duration);

  const boom = ctx.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(140, t0);
  boom.frequency.exponentialRampToValueAtTime(28, t0 + 0.7);
  const boomGain = ctx.createGain();
  boomGain.gain.setValueAtTime(0.0001, t0);
  boomGain.gain.exponentialRampToValueAtTime(0.7, t0 + 0.02);
  boomGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);
  boom.connect(boomGain);
  boomGain.connect(ctx.destination);
  boom.start(t0);
  boom.stop(t0 + 0.9);

  const crack = ctx.createOscillator();
  crack.type = "square";
  crack.frequency.setValueAtTime(420, t0);
  crack.frequency.exponentialRampToValueAtTime(60, t0 + 0.16);
  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0.0001, t0);
  crackGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.01);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  crack.connect(crackGain);
  crackGain.connect(ctx.destination);
  crack.start(t0);
  crack.stop(t0 + 0.2);
}

export const DEFAULT_VOICE_TEXT = "周天喝酒，真菜";
const VOICE_STORAGE_KEY = "jiuzhuo-voice";
const VOICE_MAX_LEN = 40;

export type VoiceSettings = {
  enabled: boolean;
  text: string;
};

let speechPrimed = false;
let voicesWatched = false;
let keepAliveId = 0;
let speakToken = 0;

function getSynth() {
  return typeof window !== "undefined" ? window.speechSynthesis : null;
}

function watchVoices(synth: SpeechSynthesis) {
  if (voicesWatched) return;
  voicesWatched = true;
  synth.getVoices();
  const refresh = () => synth.getVoices();
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", refresh);
  } else {
    synth.onvoiceschanged = refresh;
  }
}

function pickZhVoice() {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices().filter((v) => /^zh/i.test(v.lang));
  return (
    voices.find((v) => v.localService !== false && /^zh-CN/i.test(v.lang)) ||
    voices.find((v) => v.localService !== false) ||
    voices.find((v) => /^zh-CN/i.test(v.lang)) ||
    voices[0] ||
    null
  );
}

function resumeSynth(synth: SpeechSynthesis) {
  try {
    // iOS often reports paused=false while the engine is still suspended.
    synth.resume();
  } catch {
    // ignore
  }
}

function startSpeechKeepAlive() {
  if (keepAliveId) return;
  // iOS suspends speechSynthesis while a countdown is running and then drops the ending line.
  keepAliveId = window.setInterval(() => {
    const synth = getSynth();
    if (!synth) return;
    resumeSynth(synth);
  }, 4000);
}

function isMobileBrowser() {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function makeUtterance(phrase: string) {
  const utter = new SpeechSynthesisUtterance(phrase);
  utter.lang = "zh-CN";
  utter.rate = 1.05;
  utter.pitch = 1;
  utter.volume = 1;
  // A remote or not-yet-loaded voice makes mobile browsers drop the line.
  if (!isMobileBrowser()) {
    const voice = pickZhVoice();
    if (voice) utter.voice = voice;
  }
  utter.onstart = () => {
    speechPrimed = true;
  };
  return utter;
}

function playUtterance(synth: SpeechSynthesis, utter: SpeechSynthesisUtterance) {
  // iOS leaves the queue paused. resume() must follow speak() in this same
  // turn; a timeout is no longer the tap, so the line never starts.
  synth.speak(utter);
  synth.resume();
}

export function unlockSpeech() {
  const synth = getSynth();
  if (!synth) return;
  watchVoices(synth);
  startSpeechKeepAlive();
  resumeSynth(synth);
  if (speechPrimed || synth.speaking || synth.pending) return;
  try {
    // Do not cancel this utterance. iOS only unlocks speechSynthesis after a
    // speak() from a user gesture actually starts; cancel-before-start leaves
    // later timer callbacks mute. Volume 0 and blank text are ignored, so this
    // is a very short, quiet syllable instead of a spoken word.
    const warm = makeUtterance("嗯");
    warm.volume = 0.08;
    warm.rate = 4;
    playUtterance(synth, warm);
  } catch {
    // ignore
  }
}

export function speak(text: string, delay = 50) {
  const synth = getSynth();
  if (!synth) return;
  const phrase = String(text || "").trim();
  if (!phrase) return;

  watchVoices(synth);
  startSpeechKeepAlive();
  const token = ++speakToken;

  const run = () => {
    if (token !== speakToken) return;
    const utter = makeUtterance(phrase);
    const android = /Android/i.test(navigator.userAgent);
    const busy = synth.speaking || synth.pending;
    try {
      // A line started by the countdown is already outside the tap. Android
      // drops that second speak() unless cancel() happens in an earlier turn.
      // The preview button must speak inside the tap itself, so delay 0 never
      // takes this branch.
      if (delay > 0 && android && (busy || speechPrimed)) {
        synth.cancel();
        window.setTimeout(() => {
          if (token !== speakToken) return;
          try {
            playUtterance(synth, utter);
          } catch {
            // ignore unsupported / interrupted speech
          }
        }, 60);
        return;
      }
      // Preview stays in the tap: cancel() here would discard this speak()
      // on the same turn, which is why 试听 was silent.
      if (delay > 0 && busy) synth.cancel();
      playUtterance(synth, utter);
    } catch {
      // ignore unsupported / interrupted speech
    }
  };

  if (delay > 0) window.setTimeout(run, delay);
  else run();
}

export function readVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY);
    if (!raw) return { enabled: true, text: DEFAULT_VOICE_TEXT };
    const parsed = JSON.parse(raw) as { enabled?: unknown; text?: unknown };
    const text =
      typeof parsed.text === "string" && parsed.text.trim()
        ? parsed.text.trim().slice(0, VOICE_MAX_LEN)
        : DEFAULT_VOICE_TEXT;
    return { enabled: parsed.enabled !== false, text };
  } catch {
    return { enabled: true, text: DEFAULT_VOICE_TEXT };
  }
}

export function persistVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem(
      VOICE_STORAGE_KEY,
      JSON.stringify({
        enabled: Boolean(settings.enabled),
        text: String(settings.text || "").trim().slice(0, VOICE_MAX_LEN) || DEFAULT_VOICE_TEXT,
      })
    );
  } catch {
    // ignore quota / private mode
  }
}
