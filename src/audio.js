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
