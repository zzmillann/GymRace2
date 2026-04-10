'use client';

import { useState, useEffect } from 'react';

import { motion } from 'framer-motion';
import { 
  Flash24Regular, 
  Dumbbell24Regular, 
  Library24Regular, 
  People24Regular,
  Flash24Filled,
  Dumbbell24Filled,
  Library24Filled,
  People24Filled
} from '@fluentui/react-icons';
import { useAppStore } from '@/store/useHabitStore';

export function BottomNav({ onPlusClick }: { onPlusClick?: () => void }) {
  const { activeTab, setActiveTab } = useAppStore();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleFocus = (e: any) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        setIsVisible(false);
      }
    };

    const handleBlur = () => {
      setIsVisible(true);
    };

    const handleResize = () => {
      if (window.visualViewport) {
        // If viewport height is significantly less than window height, hide it
        const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.85;
        if (isKeyboardOpen) setIsVisible(false);
        else if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
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

  if (!isVisible) return null;

  const TABS = [
    { id: 'habits', icon: Flash24Regular, activeIcon: Flash24Filled, label: 'Hábitos' },
    { id: 'gym', icon: Dumbbell24Regular, activeIcon: Dumbbell24Filled, label: 'Gimnasio' },
    { id: 'library', icon: Library24Regular, activeIcon: Library24Filled, label: 'Librería' },
    { id: 'social', icon: People24Regular, activeIcon: People24Filled, label: 'Social' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-neutral-950/90 backdrop-blur-xl border-t border-white/5">
      <div className="max-w-md mx-auto flex justify-between items-end relative h-12">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const isSecond = idx === 1;
          
          return (
            <>
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center gap-1 group outline-none"
              >
                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white text-black scale-110 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-neutral-500 hover:text-neutral-300'}`}>
                  {isActive ? <tab.activeIcon style={{ fontSize: 24 }} /> : <tab.icon style={{ fontSize: 24 }} />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter transition-all ${isActive ? 'text-white opacity-100' : 'text-neutral-600 opacity-0'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="tab-glow"
                    className="absolute -inset-2 bg-white/5 blur-xl rounded-full z-[-1]"
                  />
                )}
              </button>
              
              {isSecond && (
                <button
                  onClick={onPlusClick}
                  className="relative -top-4 bg-white text-black w-16 h-16 rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.3)] flex items-center justify-center transition-all border-[6px] border-neutral-950 active:scale-90 z-[60]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </>
          );
        })}
      </div>
    </div>
  );
}
