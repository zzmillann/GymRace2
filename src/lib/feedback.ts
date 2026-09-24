// Utilidades de feedback (háptico + sonido + confeti).
import confetti from 'canvas-confetti';

// Paleta de confeti por tema de color del hábito: tono base, uno claro,
// blanco (da chispa) y un pastel del mismo tono.
const CONFETTI_COLORS: Record<string, string[]> = {
  // 'emerald' es el color "de acento" del hábito: con Locodea, bronce
  emerald: ['#b07a4a', '#c99b70', '#ffffff', '#ebd0ae'],
  indigo:  ['#6366f1', '#818cf8', '#ffffff', '#c7d2fe'],
  rose:    ['#f43f5e', '#fb7185', '#ffffff', '#fecdd3'],
  amber:   ['#f59e0b', '#fbbf24', '#ffffff', '#fde68a'],
  sky:     ['#0ea5e9', '#38bdf8', '#ffffff', '#bae6fd'],
};

/**
 * Pequeño estallido de confeti (al completar un hábito).
 * `theme` es el colorTheme del hábito, para que el confeti salga de su color
 * en vez de verde siempre. Sin tema, cae en emerald.
 */
export function confettiBurst(theme?: string) {
  if (typeof window === 'undefined') return;
  try {
    confetti({
      particleCount: 70, spread: 75, startVelocity: 38,
      origin: { y: 0.75 }, scalar: 0.9, disableForReducedMotion: true,
      colors: CONFETTI_COLORS[theme || 'emerald'] || CONFETTI_COLORS.emerald,
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
