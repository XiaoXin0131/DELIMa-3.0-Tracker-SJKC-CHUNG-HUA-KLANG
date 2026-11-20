import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ClassSummary } from '../utils/sheetParser';

interface AnalyticsViewProps {
  classSummaries: ClassSummary[];
  totalPending: number;
  onSelectClass: (className: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  classSummaries,
  totalPending,
  onSelectClass,
}) => {
  const stats = useMemo(() => {
    const classCount = classSummaries.length;
    const maxPending = classSummaries.reduce(
      (max, cur) => (cur.pendingCount > max ? cur.pendingCount : max),
      1
    );
    const avg = classCount > 0 ? (totalPending / classCount).toFixed(1) : '0.0';
    return {
      classCount,
      maxPending,
      avg,
    };
  }, [classSummaries, totalPending]);

  return (
    <div className="space-y-6">
      {/* KPI Bento Strip (3 metrics — Kelas Tertinggi removed per coordinator request) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-5 sm:p-6"
      >
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Ringkasan Belum Log Masuk Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Klik mana-mana kelas di bawah untuk terus membuka senarai murid dan mesej WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/60">
          <div className="py-1">
            <p className="text-xs font-medium text-slate-500">Jumlah Belum Log Masuk</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {totalPending}
            </p>
          </div>
          <div className="py-1">
            <p className="text-xs font-medium text-slate-500">Bilangan Kelas</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {stats.classCount}
            </p>
          </div>
          <div className="py-1">
            <p className="text-xs font-medium text-slate-500">Purata Per Kelas</p>
            <p className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums">
              {stats.avg}
            </p>
          </div>
        </div>
      </motion.section>

      {/* Class Breakdown Bento Grid */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-slate-900">
            Pecahan Mengikut Kelas
          </h2>
          <span className="text-xs text-slate-500 tabular-nums">
            {classSummaries.length} kelas aktif
          </span>
        </div>

        {classSummaries.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Tiada rekod murid belum log masuk dalam sumber data semasa.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {classSummaries.map((cls) => {
              const ratio = Math.max(8, Math.round((cls.pendingCount / stats.maxPending) * 100));
              return (
                <button
                  key={cls.className}
                  type="button"
                  onClick={() => onSelectClass(cls.className)}
                  className="group text-left p-4 rounded-2xl glass-panel-subtle hover:bg-white/85 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base font-bold text-slate-900">
                      Kelas {cls.className}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 tabular-nums">
                      <span>{cls.pendingCount} orang</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-300"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
};
