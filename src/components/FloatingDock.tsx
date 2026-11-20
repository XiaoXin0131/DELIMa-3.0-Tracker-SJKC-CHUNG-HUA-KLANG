import React from 'react';
import { motion } from 'motion/react';
import { Search, BarChart3, FileSpreadsheet } from 'lucide-react';
import { ActiveTab } from './SpatialHeader';

interface FloatingDockProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const DOCK_ITEMS: {
  id: ActiveTab;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'lookup', label: 'Semakan', icon: Search },
  { id: 'analytics', label: 'Analitik', icon: BarChart3 },
  { id: 'source', label: 'Google Sheet', icon: FileSpreadsheet },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 px-3">
      <nav
        aria-label="Dok pantas aplikasi"
        className="glass-dock rounded-full px-2.5 py-1.5 flex items-center gap-1.5 sm:gap-2"
      >
        {DOCK_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className={`group flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full transition-colors duration-200 whitespace-nowrap cursor-pointer ${
                isActive ? 'bg-white/90 shadow-sm' : 'hover:bg-white/60'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? 'spatial-icon-3d-active text-white'
                    : 'spatial-icon-3d text-slate-700 group-hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span
                className={`text-xs font-semibold ${
                  isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
