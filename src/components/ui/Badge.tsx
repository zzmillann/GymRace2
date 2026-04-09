'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Crown, Flame, Star, Trophy, Target } from 'lucide-react';

interface BadgeProps {
  level: number;
}

const ROLES = [
  { min: 1000, label: 'Leyenda', icon: Crown, color: 'text-yellow-400', bg: 'bg-yellow-400/20', animate: true },
  { min: 500, label: 'Elite', icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-400/20', animate: true },
  { min: 250, label: 'Maestro', icon: Star, color: 'text-blue-400', bg: 'bg-blue-400/20', animate: true },
  { min: 100, label: 'Guerrero', icon: Shield, color: 'text-red-400', bg: 'bg-red-400/20', animate: true },
  { min: 50, label: 'Constante', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/20', animate: true },
  { min: 10, label: 'Iniciado', icon: Flame, color: 'text-emerald-400', bg: 'bg-emerald-400/20', animate: true },
  { min: 0, label: 'Novato', icon: Target, color: 'text-neutral-400', bg: 'bg-neutral-800', animate: false },
];

export function Badge({ level }: BadgeProps) {
  const role = ROLES.find(r => level >= r.min) || ROLES[ROLES.length - 1];

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        y: role.animate ? [0, -6, 0] : 0,
        rotate: role.animate ? [0, -2, 2, 0] : 0
      }}
      transition={{ 
        y: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 300 }
      }}
      className={`flex items-center gap-2 px-3 py-1 rounded-full ${role.bg} ${role.color} border border-white/5 shadow-2xl backdrop-blur-xl`}
    >
      <role.icon size={13} strokeWidth={3} className={role.animate ? "drop-shadow-[0_0_8px_currentColor]" : ""} />
      <span className="text-[10px] font-black uppercase tracking-[0.1em]">{role.label}</span>
    </motion.div>
  );
}
