import React from 'react';
import { RefreshCw, Lock } from 'lucide-react';

export type ActiveTab = 'lookup' | 'analytics' | 'source';

interface SpatialHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  sourceLabel: string;
  totalPending: number;
  hasRemoteSheet: boolean;
  isSyncing: boolean;
  onSyncSheet: () => void;
}

export const SpatialHeader: React.FC<SpatialHeaderProps> = ({
  activeTab,
  onTabChange,
  sourceLabel,
  totalPending,
  hasRemoteSheet,
  isSyncing,
  onSyncSheet,
}) => {
  return (
    <header className="sticky top-0 z-30 px-2.5 sm:px-6 pt-2.5 sm:pt-3 pb-1.5">
      <div className="mx-auto max-w-[1280px] glass-panel rounded-2xl px-2.5 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: DELIMa 3.0 Logo -> School Logo -> Full Unbroken School Name */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <img
            src="/logos/delima-logo.png"
            alt="Logo DELIMa 3.0"
            referrerPolicy="no-referrer"
            className="h-4 sm:h-5 md:h-6 w-auto object-contain bg-transparent shrink-0"
          />
          <span
            aria-hidden="true"
            className="inline-block h-4 sm:h-5 w-px bg-slate-300/80 shrink-0"
          />
          <img
            src="/logos/school-logo.png"
            alt="Logo SJKC Chung Hua, Klang"
            referrerPolicy="no-referrer"
            className="h-6 w-6 sm:h-8 sm:w-8 md:h-9 md:w-9 object-contain bg-transparent shrink-0"
          />
          <span className="font-display text-[11px] sm:text-sm md:text-[15px] lg:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            SJKC CHUNG HUA, KLANG.
          </span>
        </div>

        {/* Zone 2: Pill-Shaped Navigation Bar (Desktop large screens so school name never shrinks) */}
        <nav
          aria-label="Navigasi utama"
          className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-slate-200/55 border border-white/80 shrink-0"
        >
          <button
            type="button"
            onClick={() => onTabChange('lookup')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'lookup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semakan Kelas
          </button>
          <button
            type="button"
            onClick={() => onTabChange('analytics')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Analitik Sekolah
          </button>
          <button
            type="button"
            onClick={() => onTabChange('source')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'source'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sumber Google Sheet
          </button>
        </nav>

        {/* Zone 3: Unboxed Source Metadata + 1 Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-600 tabular-nums whitespace-nowrap">
            <span>{sourceLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-800">{totalPending} murid</span>
          </div>

          {hasRemoteSheet ? (
            <button
              type="button"
              onClick={onSyncSheet}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-full shadow-sm transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Updating...' : 'Update'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onTabChange('source')}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-full shadow-sm transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Admin Sheet</span>
              <span className="sm:hidden">Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
