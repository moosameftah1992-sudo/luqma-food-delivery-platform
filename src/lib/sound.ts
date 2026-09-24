"use client";

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignore */
  }
}

function tone(
  freq: number,
  start: number,
  duration: number,
  volume = 0.18,
  type: OscillatorType = "sine",
) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(
    volume,
    ctx.currentTime + start + 0.015,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + start + duration,
  );
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

export type AlertKind = "order" | "info" | "success" | "error" | "urgent";

export function playAlert(kind: AlertKind = "order") {
  try {
    unlockAudio();
    if (!ctx) return;
    if (kind === "order" || kind === "urgent") {
      const base = kind === "urgent" ? 1180 : 880;
      tone(base, 0, 0.16, 0.22, "triangle");
      tone(base * 0.75, 0.18, 0.16, 0.22, "triangle");
      tone(base, 0.36, 0.24, 0.24, "triangle");
      if (kind === "urgent") {
        tone(base * 0.75, 0.62, 0.2, 0.22, "triangle");
        tone(base, 0.84, 0.3, 0.24, "triangle");
      }
    } else if (kind === "success") {
      tone(660, 0, 0.12, 0.16, "sine");
      tone(880, 0.12, 0.18, 0.16, "sine");
    } else if (kind === "error") {
      tone(320, 0, 0.16, 0.16, "sawtooth");
      tone(240, 0.18, 0.24, 0.16, "sawtooth");
    } else {
      tone(720, 0, 0.12, 0.12, "sine");
    }
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern: number | number[] = [120, 60, 120]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(
        pattern,
      );
    }
  } catch {
    /* ignore */
  }
}
