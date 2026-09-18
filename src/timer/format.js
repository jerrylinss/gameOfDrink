function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

export function formatMs(ms) {
  const clamped = Math.max(0, ms);
  const totalMs = Math.floor(clamped);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  if (minutes > 0) return `${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
  return `${pad(seconds)}.${pad(millis, 3)}`;
}

export function readTargetMs(seconds) {
  const sec = Number(seconds);
  if (!Number.isFinite(sec) || sec <= 0) return 0;
  return Math.round(sec * 1000);
}
