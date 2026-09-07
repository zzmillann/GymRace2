'use client';

import { motion } from 'framer-motion';
import { Fire24Regular } from '@fluentui/react-icons';

/**
 * Llama de racha/calorías.
 *
 * Usa el icono de la misma librería que el resto de la app (Fluent), solo que
 * animado: la llama respira y el halo late. Antes era un SVG dibujado a mano
 * que desentonaba con los demás iconos.
 *
 * - `size`   alto en px (por defecto 16)
 * - `still`  sin animación (listas largas, capturas, reduced-motion)
 * - `glow`   halo cálido detrás, para cuando la llama es protagonista
 * - el color se hereda con currentColor, así se adapta al tema del hábito
 */
export function Flame({
  size = 16,
  still = false,
  glow = false,
  className = '',
}: {
  size?: number;
  still?: boolean;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center align-middle ${className}`}
      style={{ width: size, height: size }}
    >
      {glow && (
        <motion.span
          aria-hidden
          className="absolute rounded-full bg-orange-500/40 blur-md"
          style={{ width: size * 1.4, height: size * 1.4 }}
          animate={still ? undefined : { opacity: [0.5, 0.9, 0.5], scale: [0.92, 1.1, 0.92] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
        />
      )}

      <motion.span
        className="relative inline-flex text-orange-400"
        style={{ transformOrigin: '50% 100%' }}
        animate={still ? undefined : { scaleY: [1, 1.08, 1], scaleX: [1, 0.97, 1] }}
        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
      >
        <Fire24Regular style={{ fontSize: size }} />
      </motion.span>
    </span>
  );
}
