import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Link2,
  Upload,
  RotateCcw,
  Check,
  Copy,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  SheetParseResult,
  extractGoogleSheetInfo,
  verifyAdminPassword,
} from '../utils/sheetParser';

interface SheetSourceViewProps {
  isAdminUnlocked: boolean;
  onUnlockAdmin: (password: string) => void;
  onLockAdmin: () => void;
  sheetUrlInput: string;
  onSheetUrlInputChange: (val: string) => void;
  onConnectGoogleSheet: (url: string) => Promise<void>;
  onImportRawText: (rawText: string, label: string) => void;
  onResetDemo: () => void;
  isSyncing: boolean;
  syncError: string | null;
  parseMeta: Omit<SheetParseResult, 'students'> | null;
  activeSourceName: string;
  activeShareParam: string | null;
}

export const SheetSourceView: React.FC<SheetSourceViewProps> = ({
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  sheetUrlInput,
  onSheetUrlInputChange,
  onConnectGoogleSheet,
  onImportRawText,
  onResetDemo,
  isSyncing,
  syncError,
  parseMeta,
  activeSourceName,
  activeShareParam,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) {
      setAuthError('Sila masukkan kata laluan admin.');
      return;
    }
    if (verifyAdminPassword(passwordInput)) {
      const verifiedPassword = passwordInput;
      setAuthError(null);
      setPasswordInput('');
      onUnlockAdmin(verifiedPassword);
    } else {
      setAuthError('Kata laluan admin tidak tepat. Akses ditolak.');
    }
  };

  if (!isAdminUnlocked) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-md glass-panel rounded-3xl p-6 sm:p-8 space-y-5 mt-4"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl spatial-icon-3d flex items-center justify-center text-slate-800">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Akses Admin Penyelaras DELIMa
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Bahagian tetapan Sumber Google Sheet ini dikhaskan untuk penyelaras DELIMa sahaja. Sila
            masukkan kata laluan admin untuk meneruskan.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Kata Laluan Admin
            </label>
            <div className="relative flex items-center">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="Masukkan kata laluan..."
                autoComplete="current-password"
                className="w-full pl-4 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white/85 border border-slate-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Sembunyikan kata laluan' : 'Papar kata laluan'}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authError && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3.5 py-2.5 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-full shadow-sm transition-colors cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>Buka Akses Admin</span>
          </button>
        </form>
      </motion.section>
    );
  }

  const shareableUrl = activeShareParam
    ? `${window.location.origin}/?sheet=${encodeURIComponent(activeShareParam)}`
    : null;

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!sheetUrlInput.trim()) {
      setLocalError('Sila masukkan pautan Google Sheet atau ID spreadsheet terlebih dahulu.');
      return;
    }
    const info = extractGoogleSheetInfo(sheetUrlInput);
    if (!info) {
      setLocalError(
        'Format pautan tidak sah. Contoh: https://docs.google.com/spreadsheets/d/.../edit'
      );
      return;
    }
    await onConnectGoogleSheet(sheetUrlInput);
  };

  const handlePasteImport = () => {
    setLocalError(null);
    if (!pasteText.trim()) {
      setLocalError('Sila tampal data jadual (CSV/TSV) dari Google Sheets atau Excel.');
      return;
    }
    onImportRawText(pasteText, 'Data Tampalan Manual');
    setPasteText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onImportRawText(text, `Fail: ${file.name}`);
    e.target.value = '';
  };

  const handleCopyShareLink = async () => {
    if (!shareableUrl) return;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2000);
    } catch {
      setCopiedShareLink(false);
    }
  };

  const combinedError = localError || syncError;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Sumber Data Google Sheet
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Sumber aktif sekarang:{' '}
              <span className="font-semibold text-slate-900">{activeSourceName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetDemo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Guna Data Contoh</span>
            </button>
            <button
              type="button"
              onClick={onLockAdmin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white/80 hover:bg-white border border-slate-200/80 rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Kunci Semula</span>
            </button>
          </div>
        </div>

        {/* Connect via Google Sheet URL */}
        <form onSubmit={handleSubmitUrl} className="space-y-3 pt-2 border-t border-slate-200/60">
          <label htmlFor="google-sheet-url" className="block text-sm font-semibold text-slate-800">
            1. Sambung Pautan Google Sheet Secara Langsung
          </label>
          <p className="text-xs text-slate-600 leading-relaxed">
            Dalam Google Sheet anda, klik <strong>Share</strong> → tukar General Access kepada{' '}
            <strong>Anyone with the link (Viewer)</strong>, kemudian salin dan tampal pautannya di
            bawah. Pastikan lajur mengandungi <strong>Kelas</strong>, <strong>Nama Murid</strong>,
            dan <strong>ID Murid</strong>. Untuk memaparkan masa kemas kini admin kepada semua guru,
            taip <strong>Kemas Kini: 22 Nov 2026, 8:30 PG</strong> pada sel sebelah tajuk (cth. D1)
            atau di baris paling atas Google Sheet anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="google-sheet-url"
                type="text"
                value={sheetUrlInput}
                onChange={(e) => onSheetUrlInputChange(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 bg-white/85 border border-slate-200/90 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
            <button
              type="submit"
              disabled={isSyncing}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSyncing ? 'Menyambung...' : 'Muat Turun Sheet'}
            </button>
          </div>
        </form>

        {combinedError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-rose-50/90 border border-rose-200 text-xs text-rose-800"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{combinedError}</span>
          </div>
        )}

        {/* Shareable Link Box when connected to a Google Sheet */}
        {shareableUrl && (
          <div className="p-4 rounded-2xl glass-panel-subtle space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              Pautan Khas Untuk Dikongsi Kepada Guru
            </p>
            <p className="text-xs text-slate-600">
              Kongsikan pautan ini dalam grup Telegram/WhatsApp guru. Apabila dibuka, data Google
              Sheet anda akan dimuatkan secara automatik:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <code className="flex-1 px-3 py-2 rounded-xl bg-white/85 border border-slate-200 text-xs font-mono text-slate-700 truncate">
                {shareableUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedShareLink ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedShareLink ? 'Pautan Disalin!' : 'Salin Pautan Guru'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Column Detection Summary */}
        {parseMeta && (
          <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 tabular-nums">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              Ringkasan Pemetaan Lajur:
            </span>
            <span>Jumlah baris dibaca: {parseMeta.totalRowsRead}</span>
            {parseMeta.loggedInFilteredCount > 0 && (
              <span>Sudah log masuk (dikecualikan): {parseMeta.loggedInFilteredCount}</span>
            )}
            <span>Lajur Kelas: #{parseMeta.detectedColumns.classCol + 1}</span>
            <span>Lajur Nama: #{parseMeta.detectedColumns.nameCol + 1}</span>
            {parseMeta.detectedColumns.idCol >= 0 && (
              <span>Lajur ID: #{parseMeta.detectedColumns.idCol + 1}</span>
            )}
            {parseMeta.sheetUpdatedAt && (
              <span>Masa Kemas Kini: {parseMeta.sheetUpdatedAt}</span>
            )}
          </div>
        )}
      </motion.section>

      {/* Alternative: Paste CSV/TSV or Upload .CSV */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel rounded-3xl p-5 sm:p-7 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              2. Tampal Terus Dari Google Sheets / Muat Naik CSV
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Pilihan alternatif jika Google Sheet sekolah tidak boleh dibuka kepada umum.
            </p>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white/85 hover:bg-white border border-slate-200 rounded-full transition-colors whitespace-nowrap cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Muat Naik Fail CSV</span>
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          aria-label="Tampal data CSV atau jadual Google Sheets"
          placeholder={`Kelas\tNama Murid\tID Murid\n1A\tAYEESHA ADREANNA BINTI MOHD AZHAR\tm-13409281@moe-dl.edu.my`}
          className="w-full p-3.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 bg-white/80 border border-slate-200/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handlePasteImport}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            Import Data Tampalan
          </button>
        </div>
      </motion.section>
    </div>
  );
};
