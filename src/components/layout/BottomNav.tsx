'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flash24Regular,
  Dumbbell24Regular,
  Library24Regular,
  People24Regular,
  Add24Filled,
  Flash24Filled,
  Dumbbell24Filled,
  Library24Filled,
  People24Filled,
} from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';
import { useT } from '@/lib/i18n';

/**
 * Barra inferior al estilo de las apps de banca modernas: plana, sin botones
 * flotantes, con la etiqueta siempre bajo el icono y un punto que marca la
 * pestaña activa.
 *
 * Al hacer scroll se encoge (las etiquetas desaparecen y solo quedan los
 * iconos) y vuelve a su tamaño cuando el scroll se detiene.
 */
export function BottomNav({ onPlusClick }: { onPlusClick?: () => void }) {
  const { activeTab, setActiveTab } = useAppStore();
  const t = useT();
  const [isVisible, setIsVisible] = useState(true);
  const [compact, setCompact] = useState(false);
  const idleTimer = useRef<any>(null);

  // Ocultar cuando se abre el teclado (si no, tapa el input)
  useEffect(() => {
    const handleFocus = (e: any) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) setIsVisible(false);
    };
    const handleBlur = () => setIsVisible(true);
    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.85;
        if (isKeyboardOpen) setIsVisible(false);
        else if (!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
          setIsVisible(true);
        }
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  // Encoger mientras se hace scroll; volver al soltar (200 ms sin moverse)
  useEffect(() => {
    const onScroll = () => {
      setCompact(true);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setCompact(false), 220);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(idleTimer.current);
    };
  }, []);

  if (!isVisible) return null;

  type Tab = { id: string; icon: any; activeIcon: any; action?: boolean };
  const TABS: Tab[] = [
    { id: 'habits', icon: Flash24Regular, activeIcon: Flash24Filled },
    { id: 'gym', icon: Dumbbell24Regular, activeIcon: Dumbbell24Filled },
    { id: 'new', icon: Add24Filled, activeIcon: Add24Filled, action: true },
    { id: 'library', icon: Library24Regular, activeIcon: Library24Filled },
    { id: 'social', icon: People24Regular, activeIcon: People24Filled },
  ];

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2 pointer-events-none"
      animate={{ opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 320 }}
    >
      {/* Píldora flotante: no ocupa el ancho completo ni tapa la pantalla */}
      <motion.div
        className="pointer-events-auto max-w-[380px] mx-auto flex justify-around items-start
                   bg-app/70 backdrop-blur-2xl border border-line/[0.08] rounded-[28px]
                   shadow-[0_10px_40px_rgba(0,0,0,0.45)] px-2"
        animate={{ paddingTop: compact ? 8 : 10, paddingBottom: compact ? 8 : 10 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
      >
        {TABS.map((tab) => {
          const isActive = !tab.action && activeTab === tab.id;
          const Icon = isActive ? tab.activeIcon : tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => (tab.action ? onPlusClick?.() : setActiveTab(tab.id as any))}
              className="relative flex flex-col items-center justify-start gap-1 flex-1 py-1 outline-none group"
            >
              {tab.action ? (
                <span className="w-9 h-9 rounded-full bg-content text-app flex items-center justify-center active:scale-90 transition-transform">
                  <Icon style={{ fontSize: 20 }} />
                </span>
              ) : (
                <motion.span
                  className={`flex items-center justify-center transition-colors ${
                    isActive ? 'text-content' : 'text-muted'
                  }`}
                  animate={{ y: compact ? 1 : 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                >
                  <Icon style={{ fontSize: 24 }} />
                </motion.span>
              )}

              {/* La etiqueta desaparece al hacer scroll */}
              <AnimatePresence initial={false}>
                {!compact && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className={`text-[11px] leading-none overflow-hidden ${
                      isActive ? 'text-content font-normal' : 'text-muted font-normal'
                    }`}
                  >
                    {tab.action ? 'Nuevo' : t(`nav.${tab.id}`)}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Punto de pestaña activa (solo en modo compacto, hace de guía) */}
              {isActive && compact && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-content"
                />
              )}
            </button>
          );
        })}
      </motion.div>
    </motion.nav>
  );
}
