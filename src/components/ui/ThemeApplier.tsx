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
  const palette = useAppStore((s) => s.settings.palette);
  const loadLocalAvatar = useAppStore((s) => s.loadLocalAvatar);

  // La foto de perfil local se lee de IndexedDB al arrancar (en cualquier ruta)
  useEffect(() => { loadLocalAvatar(); }, [loadLocalAvatar]);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const system = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      const mode = theme === 'system' ? system : theme;
      root.classList.toggle('light', mode === 'light');
      root.classList.toggle('midnight', mode === 'midnight');
      // 'dark' es la base de los temas oscuros; midnight solo la reafina
      root.classList.toggle('dark', mode !== 'light');
      root.setAttribute('data-accent', accent || 'bronze');
      root.setAttribute('data-palette', palette || 'locodea');
    };

    apply();

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: light)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme, accent, palette]);

  return null;
}
