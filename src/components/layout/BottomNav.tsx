'use client';

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

export function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();

  const TABS = [
    { id: 'habits', icon: Flash24Regular, activeIcon: Flash24Filled, label: 'Hábitos' },
    { id: 'gym', icon: Dumbbell24Regular, activeIcon: Dumbbell24Filled, label: 'Gimnasio' },
    { id: 'library', icon: Library24Regular, activeIcon: Library24Filled, label: 'Librería' },
    { id: 'social', icon: People24Regular, activeIcon: People24Filled, label: 'Social' },
  ] as const;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-4 bg-neutral-950/80 backdrop-blur-xl border-t border-white/5">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
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
          );
        })}
      </div>
    </div>
  );
}
