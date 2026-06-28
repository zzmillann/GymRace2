// Utilidades de feedback (háptico + sonido + confeti).
import confetti from 'canvas-confetti';

// Pequeño estallido de confeti (al completar un hábito)
export function confettiBurst() {
  if (typeof window === 'undefined') return;
  try {
    confetti({
      particleCount: 70, spread: 75, startVelocity: 38,
      origin: { y: 0.75 }, scalar: 0.9, disableForReducedMotion: true,
      colors: ['#10b981', '#34d399', '#ffffff', '#a7f3d0'],
    });
  } catch { /* noop */ }
}

// Celebración grande (récord nuevo): cañones laterales durante ~1s
export function confettiBig() {
  if (typeof window === 'undefined') return;
  try {
    const end = Date.now() + 1000;
    const colors = ['#f59e0b', '#10b981', '#ffffff', '#fbbf24'];
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 60, startVelocity: 55, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.7 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  } catch { /* noop */ }
}

export function haptic(pattern: number | number[] = 30) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* no soportado */ }
  }
}

let audioCtx: AudioContext | null = null;

/** Pequeño "ding" sintetizado con Web Audio (sin archivos externos). */
export function playDing(freq = 880) {
  if (typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.26);
  } catch { /* el navegador puede bloquear audio sin interacción previa */ }
}
