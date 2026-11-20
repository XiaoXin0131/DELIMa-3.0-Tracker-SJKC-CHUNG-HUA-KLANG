import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Copy,
  Check,
  Send,
  X,
  Eye,
  EyeOff,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  ClassSummary,
  StudentRecord,
  filterStudentsByClass,
  formatWhatsAppList,
  normalizeClassName,
} from '../utils/sheetParser';

interface ClassLookupViewProps {
  students: StudentRecord[];
  classSummaries: ClassSummary[];
  classQuery: string;
  onClassQueryChange: (val: string) => void;
  onOpenAnalytics: () => void;
}

async function copyTextSafely(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to textarea copy
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const ClassLookupView: React.FC<ClassLookupViewProps> = ({
  students,
  classSummaries,
  classQuery,
  onClassQueryChange,
  onOpenAnalytics,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentIds, setShowStudentIds] = useState(true);
  const [includeIdsInWa, setIncludeIdsInWa] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  const { matchedClassName, students: filteredStudents } = useMemo(
    () => filterStudentsByClass(students, classQuery, studentSearch),
    [students, classQuery, studentSearch]
  );

  // Full unsearched list for the matched class (so WhatsApp always exports the complete class list unless filtered? Wait: if teacher searched a student, WhatsApp should reflect visible list or full class? Reflecting visible filteredStudents makes search useful, and when studentSearch is empty it's the full class!)
  const whatsappMessage = useMemo(
    () =>
      formatWhatsAppList(matchedClassName || classQuery, filteredStudents, {
        includeIds: includeIdsInWa,
      }),
    [matchedClassName, classQuery, filteredStudents, includeIdsInWa]
  );

  const whatsappShareUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
    [whatsappMessage]
  );

  const handleCopyWhatsApp = async () => {
    if (filteredStudents.length === 0) return;
    const ok = await copyTextSafely(whatsappMessage);
    if (ok) {
      setCopiedWa(true);
      window.setTimeout(() => setCopiedWa(false), 2200);
    }
  };

  const handleCopySingleId = async (student: StudentRecord) => {
    if (!student.studentId) return;
    const ok = await copyTextSafely(student.studentId);
    if (ok) {
      setCopiedStudentId(student.id);
      window.setTimeout(() => setCopiedStudentId(null), 1800);
    }
  };

  const activeNormalized = normalizeClassName(matchedClassName || classQuery);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Spatial Console: Class Input + Quick Class Selector */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-4 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h1 className="font-display text-xl sm:text-[26px] font-bold tracking-tight text-slate-900 text-balance">
              Semakan Murid Belum Log Masuk DELIMa 3.0
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Masukkan nama kelas untuk memaparkan senarai murid yang masih belum log masuk serta
              jana mesej WhatsApp sedia hantar kepada ibu bapa.
            </p>
          </div>

          <div className="w-full lg:w-[340px] shrink-0">
            <label
              htmlFor="class-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Masukkan Nama Kelas
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="class-input"
                type="text"
                value={classQuery}
                onChange={(e) => {
                  onClassQueryChange(e.target.value);
                  setStudentSearch('');
                }}
                placeholder="Contoh: 1A, 2B, 3A..."
                autoComplete="off"
                className="w-full pl-10 pr-9 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-400 bg-white/85 border border-slate-200/90 rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              {classQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onClassQueryChange('');
                    setStudentSearch('');
                  }}
                  aria-label="Kosongkan carian kelas"
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Class Quick-Filter Strip */}
        {classSummaries.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Pilih pantas:</span>
            {classSummaries.map((cls) => {
              const isSelected = activeNormalized === cls.className;
              return (
                <button
                  key={cls.className}
                  type="button"
                  onClick={() => {
                    onClassQueryChange(cls.className);
                    setStudentSearch('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white/75 text-slate-700 border border-slate-200/80 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <span>{cls.className}</span>
                  <span
                    className={`tabular-nums ${
                      isSelected ? 'text-sky-300' : 'text-slate-400'
                    }`}
                  >
                    {cls.pendingCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Main Bento Split Grid: Student List (7 cols) + WhatsApp Generator (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Student Roster Panel */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 glass-panel rounded-3xl overflow-hidden"
        >
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {matchedClassName ? `Senarai Murid Kelas ${matchedClassName}` : 'Senarai Murid'}
              </h2>
              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                {classQuery.trim()
                  ? `${filteredStudents.length} orang belum log masuk`
                  : 'Masukkan nama kelas untuk melihat senarai'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tapis nama murid..."
                  aria-label="Tapis nama murid dalam kelas"
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 bg-white/80 border border-slate-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowStudentIds((v) => !v)}
                aria-pressed={showStudentIds}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showStudentIds ? (
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>{showStudentIds ? 'ID Dipapar' : 'ID Disembunyi'}</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!classQuery.trim() ? (
              <motion.div
                key="empty-query"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-14 text-center"
              >
                <div className="mx-auto w-11 h-11 rounded-2xl spatial-icon-3d flex items-center justify-center mb-3 text-slate-700">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Sila masukkan atau pilih nama kelas
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Taip nama kelas seperti 1A di ruangan atas atau klik salah satu kelas pada bar
                  pilihan pantas.
                </p>
              </motion.div>
            ) : filteredStudents.length === 0 ? (
              <motion.div
                key="empty-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-14 text-center"
              >
                <p className="text-sm font-semibold text-slate-800">
                  Tiada murid belum log masuk ditemui untuk &ldquo;{classQuery.trim()}&rdquo;
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Semua murid kelas ini mungkin telah selesai log masuk ke DELIMa 3.0, atau ejaan
                  nama kelas berbeza dengan rekod Google Sheet.
                </p>
                <button
                  type="button"
                  onClick={onOpenAnalytics}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white/85 hover:bg-white border border-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <span>Lihat Semua Kelas</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={`list-${matchedClassName}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Mobile Stacked Student List (zero horizontal overflow) */}
                <div className="sm:hidden divide-y divide-slate-200/60" data-testid="student-list-mobile">
                  {filteredStudents.map((student, idx) => {
                    const isIdCopied = copiedStudentId === student.id;
                    return (
                      <div key={student.id} className="px-4 py-3 space-y-1.5">
                        <div className="flex items-start gap-2.5">
                          <span className="text-xs font-semibold text-slate-400 tabular-nums pt-0.5 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 leading-snug">
                            {student.studentName}
                          </span>
                        </div>
                        {showStudentIds && (
                          <div className="pl-6 flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-slate-600 truncate">
                              {student.studentId || '—'}
                            </span>
                            {student.studentId ? (
                              <button
                                type="button"
                                onClick={() => handleCopySingleId(student)}
                                aria-label={`Salin ID DELIMa untuk ${student.studentName}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  isIdCopied
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-white/85 text-slate-600 hover:text-slate-900 border border-slate-200/80'
                                }`}
                              >
                                {isIdCopied ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Disalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Salin ID</span>
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desktop & Tablet Data Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left border-collapse" data-testid="student-table">
                    <thead>
                      <tr className="border-b border-slate-200/60 text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5 pl-6 pr-3 w-12">Bil</th>
                        <th className="py-2.5 px-3">Nama Murid</th>
                        {showStudentIds && <th className="py-2.5 px-3">ID DELIMa</th>}
                        {showStudentIds && (
                          <th className="py-2.5 pl-2 pr-6 text-right w-24">Tindakan</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/50">
                      {filteredStudents.map((student, idx) => {
                        const isIdCopied = copiedStudentId === student.id;
                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-white/60 transition-colors duration-150"
                          >
                            <td className="py-2.5 pl-6 pr-3 text-xs font-medium text-slate-500 tabular-nums align-middle">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 text-sm font-medium text-slate-900 align-middle">
                              {student.studentName}
                            </td>
                            {showStudentIds && (
                              <td className="py-2.5 px-3 text-xs font-mono text-slate-600 align-middle whitespace-nowrap">
                                {student.studentId || '—'}
                              </td>
                            )}
                            {showStudentIds && (
                              <td className="py-2.5 pl-2 pr-6 text-right align-middle">
                                {student.studentId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopySingleId(student)}
                                    aria-label={`Salin ID DELIMa untuk ${student.studentName}`}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors whitespace-nowrap cursor-pointer ${
                                      isIdCopied
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80'
                                    }`}
                                  >
                                    {isIdCopied ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Disalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Salin ID</span>
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Right: WhatsApp Message Builder & Copy Widget */}
        <motion.aside
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 glass-panel rounded-3xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Salinan Senarai WhatsApp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Info penting diboldkan secara automatik untuk paparan WhatsApp.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-white/60 border border-white/80 cursor-pointer">
            <span className="text-xs font-medium text-slate-700">
              Sertakan ID DELIMa dalam mesej WhatsApp
            </span>
            <input
              type="checkbox"
              checked={includeIdsInWa}
              onChange={(e) => setIncludeIdsInWa(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>

          {/* WhatsApp Preview Surface */}
          <div
            data-testid="whatsapp-preview"
            className="rounded-2xl bg-white/80 border border-slate-200/80 p-3.5 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap break-words max-h-[245px] overflow-y-auto"
          >
            {filteredStudents.length > 0 ? (
              whatsappMessage
            ) : (
              <span className="text-slate-400">
                Pratonton mesej WhatsApp akan dipaparkan apabila senarai murid tersedia.
              </span>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              disabled={filteredStudents.length === 0}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                copiedWa
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
              }`}
            >
              {copiedWa ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Disalin ke Papan Klip!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Senarai WhatsApp</span>
                </>
              )}
            </button>

            {filteredStudents.length > 0 && (
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-slate-800 bg-white/85 hover:bg-white border border-slate-200/90 transition-all duration-200 whitespace-nowrap"
              >
                <Send className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  );
};
