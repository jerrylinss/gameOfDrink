let audioCtx = null;

export function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = "sine", gain = 0.18, when = 0) {
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

let speechUnlocked = false;
let voicesWatched = false;

function getSynth() {
  return typeof window !== "undefined" ? window.speechSynthesis : null;
}

function pickZhVoice() {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  return (
    voices.find((v) => v.lang === "zh-CN") ||
    voices.find((v) => v.lang?.startsWith("zh")) ||
    null
  );
}

export function unlockSpeech() {
  const synth = getSynth();
  if (!synth) return;
  if (!voicesWatched) {
    voicesWatched = true;
    synth.getVoices();
    const refresh = () => synth.getVoices();
    if (typeof synth.addEventListener === "function") {
      synth.addEventListener("voiceschanged", refresh);
    } else {
      synth.onvoiceschanged = refresh;
    }
  }
  if (speechUnlocked) return;
  speechUnlocked = true;
  try {
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    synth.speak(warm);
    synth.cancel();
  } catch {
    // ignore
  }
}

export function speak(text, delay = 50) {
  const synth = getSynth();
  if (!synth) return;
  const phrase = String(text || "").trim();
  if (!phrase) return;

  const run = () => {
    try {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.lang = "zh-CN";
      utter.rate = 1.05;
      utter.pitch = 1;
      utter.volume = 1;
      const voice = pickZhVoice();
      if (voice) utter.voice = voice;
      synth.speak(utter);
    } catch {
      // ignore unsupported / interrupted speech
    }
  };

  window.setTimeout(run, Math.max(0, delay));
}

export function readVoiceSettings() {
  try {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY);
    if (!raw) return { enabled: true, text: DEFAULT_VOICE_TEXT };
    const parsed = JSON.parse(raw);
    const text =
      typeof parsed.text === "string" && parsed.text.trim()
        ? parsed.text.trim().slice(0, VOICE_MAX_LEN)
        : DEFAULT_VOICE_TEXT;
    return { enabled: parsed.enabled !== false, text };
  } catch {
    return { enabled: true, text: DEFAULT_VOICE_TEXT };
  }
}

export function persistVoiceSettings(settings) {
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
