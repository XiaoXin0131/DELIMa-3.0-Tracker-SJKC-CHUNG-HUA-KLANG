import { useCallback, useEffect, useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { DEMO_STUDENTS } from './data/demoStudents';
import {
  SheetParseResult,
  StudentRecord,
  computeClassSummaries,
  extractGoogleSheetInfo,
  mapRowsToStudents,
  normalizeClassName,
  parseDelimitedRows,
} from './utils/sheetParser';
import { ActiveTab, SpatialHeader } from './components/SpatialHeader';
import { ClassLookupView } from './components/ClassLookupView';
import { AnalyticsView } from './components/AnalyticsView';
import { SheetSourceView } from './components/SheetSourceView';
import { FloatingDock } from './components/FloatingDock';

const STORAGE_KEY = 'delima_chunghua_state_v2';
const LEGACY_STORAGE_KEY = 'delima_chunghua_state_v1';

interface PersistedState {
  students: StudentRecord[];
  sourceName: string;
  sheetUrl: string;
  shareParam: string | null;
  parseMeta: Omit<SheetParseResult, 'students'> | null;
}

function loadInitialState(): { state: PersistedState; pendingResyncUrl: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed.students) && parsed.students.length > 0) {
        return { state: parsed, pendingResyncUrl: null };
      }
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as PersistedState;
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (legacy.sheetUrl || legacy.shareParam) {
        return {
          state: {
            students: DEMO_STUDENTS,
            sourceName: legacy.sourceName || 'Google Sheet',
            sheetUrl: legacy.sheetUrl || '',
            shareParam: legacy.shareParam || null,
            parseMeta: null,
          },
          pendingResyncUrl: legacy.sheetUrl || legacy.shareParam || null,
        };
      }
    }
  } catch {
    // Ignore invalid storage
  }

  return {
    state: {
      students: DEMO_STUDENTS,
      sourceName: 'Data Contoh',
      sheetUrl: '',
      shareParam: null,
      parseMeta: null,
    },
    pendingResyncUrl: null,
  };
}

export default function App() {
  const initialBoot = useMemo(() => loadInitialState(), []);
  const initialState = initialBoot.state;

  const [activeTab, setActiveTab] = useState<ActiveTab>('lookup');
  const [students, setStudents] = useState<StudentRecord[]>(initialState.students);
  const [sourceName, setSourceName] = useState<string>(initialState.sourceName);
  const [sheetUrlInput, setSheetUrlInput] = useState<string>(initialState.sheetUrl);
  const [shareParam, setShareParam] = useState<string | null>(initialState.shareParam);
  const [parseMeta, setParseMeta] = useState<Omit<SheetParseResult, 'students'> | null>(
    initialState.parseMeta
  );
  const [classQuery, setClassQuery] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const paramClass = params.get('kelas');
    return paramClass ? normalizeClassName(paramClass) : '';
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState<string | null>(null);
  const isAdminUnlocked = Boolean(adminSecret);

  const classSummaries = useMemo(() => computeClassSummaries(students), [students]);

  const persistState = useCallback((next: PersistedState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }, []);

  const applyParsedCsv = useCallback(
    (
      rawCsv: string,
      nextSourceName: string,
      nextSheetUrl: string,
      nextShareParam: string | null
    ) => {
      const rows = parseDelimitedRows(rawCsv);
      const result = mapRowsToStudents(rows);

      if (result.students.length === 0) {
        setSyncError(
          'Tiada rekod murid ditemui. Pastikan helaian mempunyai lajur Nama Kelas dan Nama Murid.'
        );
        return false;
      }

      const meta: Omit<SheetParseResult, 'students'> = {
        totalRowsRead: result.totalRowsRead,
        loggedInFilteredCount: result.loggedInFilteredCount,
        hasHeader: result.hasHeader,
        detectedColumns: result.detectedColumns,
      };

      setStudents(result.students);
      setSourceName(nextSourceName);
      setSheetUrlInput(nextSheetUrl);
      setShareParam(nextShareParam);
      setParseMeta(meta);
      setSyncError(null);

      // Clear active class if it was selected previously but no longer exists in the new sheet
      const nextSummaries = computeClassSummaries(result.students);
      const currentNorm = normalizeClassName(classQuery);
      if (currentNorm && !nextSummaries.some((c) => c.className === currentNorm)) {
        setClassQuery('');
      }

      persistState({
        students: result.students,
        sourceName: nextSourceName,
        sheetUrl: nextSheetUrl,
        shareParam: nextShareParam,
        parseMeta: meta,
      });

      return true;
    },
    [classQuery, persistState]
  );

  const connectGoogleSheet = useCallback(
    async (rawUrl: string, persistToServer = false) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) return;
      setIsSyncing(true);
      setSyncError(null);

      try {
        const res = await fetch(`/api/sheet?url=${encodeURIComponent(trimmed)}`, {
          cache: 'no-store',
        });
        const data = (await res.json()) as {
          csv?: string;
          spreadsheetId?: string | null;
          error?: string;
        };

        if (!res.ok || !data.csv) {
          setSyncError(data.error || 'Gagal memuat turun data dari Google Sheet.');
          return;
        }

        const info = extractGoogleSheetInfo(trimmed);
        const shareId = data.spreadsheetId || info?.spreadsheetId || trimmed;

        const applied = applyParsedCsv(data.csv, 'Google Sheet', trimmed, shareId);
        if (applied) {
          if (persistToServer && adminSecret) {
            void fetch('/api/sheet-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sheetUrl: trimmed, adminPassword: adminSecret }),
            });
          }
          setActiveTab('lookup');
        }
      } catch (err) {
        setSyncError(
          err instanceof Error ? err.message : 'Ralat rangkaian semasa menyambung Google Sheet.'
        );
      } finally {
        setIsSyncing(false);
      }
    },
    [applyParsedCsv, adminSecret]
  );

  // Auto-load ?sheet=... parameter, migrated v1 URL, or server-saved school sheet on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sheetParam = params.get('sheet');
    const urlToSync = sheetParam || initialBoot.pendingResyncUrl || initialState.sheetUrl;
    if (urlToSync) {
      setSheetUrlInput(urlToSync);
      void connectGoogleSheet(urlToSync);
      return;
    }

    void (async () => {
      try {
        const res = await fetch('/api/sheet-config');
        if (!res.ok) return;
        const cfg = (await res.json()) as { sheetUrl?: string | null };
        if (cfg.sheetUrl) {
          setSheetUrlInput(cfg.sheetUrl);
          await connectGoogleSheet(cfg.sheetUrl);
        }
      } catch {
        // Keep demo data if server config unavailable
      }
    })();
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportRawText = useCallback(
    (rawText: string, label: string) => {
      const ok = applyParsedCsv(rawText, label, '', null);
      if (ok) {
        setActiveTab('lookup');
      }
    },
    [applyParsedCsv]
  );

  const handleResetDemo = useCallback(() => {
    setStudents(DEMO_STUDENTS);
    setSourceName('Data Contoh');
    setSheetUrlInput('');
    setShareParam(null);
    setParseMeta(null);
    setSyncError(null);
    setClassQuery('');
    persistState({
      students: DEMO_STUDENTS,
      sourceName: 'Data Contoh',
      sheetUrl: '',
      shareParam: null,
      parseMeta: null,
    });
    if (adminSecret) {
      void fetch('/api/sheet-config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: adminSecret }),
      });
    }
    setActiveTab('lookup');
  }, [adminSecret, persistState]);

  const handleSelectClassFromAnalytics = useCallback((selectedClass: string) => {
    setClassQuery(selectedClass);
    setActiveTab('lookup');
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen spatial-aurora-bg flex flex-col">
        <SpatialHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sourceLabel={sourceName}
          totalPending={students.length}
          hasRemoteSheet={Boolean(shareParam || sheetUrlInput.trim())}
          isSyncing={isSyncing}
          onSyncSheet={() => void connectGoogleSheet(sheetUrlInput || shareParam || '')}
        />

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-8">
          {activeTab === 'lookup' && (
            <ClassLookupView
              students={students}
              classSummaries={classSummaries}
              classQuery={classQuery}
              onClassQueryChange={setClassQuery}
              onOpenAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              classSummaries={classSummaries}
              totalPending={students.length}
              onSelectClass={handleSelectClassFromAnalytics}
            />
          )}

          {activeTab === 'source' && (
            <SheetSourceView
              isAdminUnlocked={isAdminUnlocked}
              onUnlockAdmin={(pw) => setAdminSecret(pw)}
              onLockAdmin={() => setAdminSecret(null)}
              sheetUrlInput={sheetUrlInput}
              onSheetUrlInputChange={setSheetUrlInput}
              onConnectGoogleSheet={(url) => connectGoogleSheet(url, true)}
              onImportRawText={handleImportRawText}
              onResetDemo={handleResetDemo}
              isSyncing={isSyncing}
              syncError={syncError}
              parseMeta={parseMeta}
              activeSourceName={sourceName}
              activeShareParam={shareParam}
            />
          )}
        </main>

        {/* Footer with generous clearance for the bottom floating dock */}
        <footer className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 pt-2 pb-24 text-center">
          <p className="text-xs font-medium text-slate-600">
            Inovasi Cikgu XX Lee. SJKC CHUNG HUA KLANG
          </p>
        </footer>

        <FloatingDock activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </MotionConfig>
  );
}
