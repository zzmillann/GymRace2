'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useHabitStore';

/**
 * Aplica el tema (claro/oscuro/sistema) y el color de acento elegidos en Ajustes
 * poniendo la clase y el data-attribute en <html>. Los componentes usan los
 * tokens semánticos (bg-app, bg-surface, text-content, text-accent, ...).
 */
export function ThemeApplier() {
  const theme = useAppStore((s) => s.settings.theme);
  const accent = useAppStore((s) => s.settings.accentColor);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      const mode = theme === 'system' ? system : theme;
      root.classList.toggle('light', mode === 'light');
      root.classList.toggle('dark', mode !== 'light');
      root.setAttribute('data-accent', accent || 'emerald');
    };

    apply();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme, accent]);

  return null;
}
