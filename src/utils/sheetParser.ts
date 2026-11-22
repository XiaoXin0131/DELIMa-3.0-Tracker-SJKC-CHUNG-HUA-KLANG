export interface StudentRecord {
  id: string;
  className: string;
  studentName: string;
  studentId: string;
  status?: string;
}

export interface ClassSummary {
  className: string;
  pendingCount: number;
  students: StudentRecord[];
}

export interface SheetParseResult {
  students: StudentRecord[];
  totalRowsRead: number;
  loggedInFilteredCount: number;
  hasHeader: boolean;
  sheetUpdatedAt: string | null;
  detectedColumns: {
    classCol: number;
    nameCol: number;
    idCol: number;
    statusCol: number;
  };
}

export interface GoogleSheetSourceInfo {
  type: 'spreadsheet_id' | 'published_csv';
  spreadsheetId?: string;
  gid?: string;
  csvUrl: string;
}

export function normalizeClassName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function verifyAdminPassword(input: string): boolean {
  return input === 'Xiaoxin0131';
}

export function extractGoogleSheetInfo(rawInput: string): GoogleSheetSourceInfo | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Handle "Publish to the web" /d/e/2PACX-... URLs
  if (/^https?:\/\/docs\.google\.com\/spreadsheets\/d\/e\/[a-zA-Z0-9_-]+/i.test(trimmed)) {
    const url = new URL(trimmed);
    if (url.pathname.includes('/pubhtml')) {
      url.pathname = url.pathname.replace(/\/pubhtml$/, '/pub');
    }
    if (!url.pathname.endsWith('/pub')) {
      const match = url.pathname.match(/(\/spreadsheets\/d\/e\/[a-zA-Z0-9_-]+)/);
      if (match) {
        url.pathname = `${match[1]}/pub`;
      }
    }
    url.searchParams.set('output', 'csv');
    return {
      type: 'published_csv',
      csvUrl: url.toString(),
    };
  }

  // Handle standard Google Sheets URL: https://docs.google.com/spreadsheets/d/<ID>/edit#gid=0
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (idMatch) {
    const spreadsheetId = idMatch[1];
    const gidMatch = trimmed.match(/[?&#]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : undefined;
    return {
      type: 'spreadsheet_id',
      spreadsheetId,
      gid,
      csvUrl: buildGoogleSheetCsvUrl(spreadsheetId, gid),
    };
  }

  // Handle bare Google Sheet ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
    return {
      type: 'spreadsheet_id',
      spreadsheetId: trimmed,
      csvUrl: buildGoogleSheetCsvUrl(trimmed),
    };
  }

  return null;
}

export function buildGoogleSheetCsvUrl(spreadsheetId: string, gid?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv`;
  return gid ? `${base}&gid=${encodeURIComponent(gid)}` : base;
}

export function parseDelimitedRows(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  // Auto-detect delimiter from first non-empty line (supports pasted TSV from Google Sheets/Excel)
  const firstLine = text.split(/\r?\n/)[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\r' && nextChar === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

const LOGGED_IN_STATUS_VALUES = new Set([
  'sudah',
  'sudah log masuk',
  'sudah login',
  'ya',
  'yes',
  'aktif',
  'active',
  'logged in',
  'selesai',
  'done',
  'true',
  '1',
  'telah log masuk',
]);

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesWholeKeyword(header: string, keywords: string[]): boolean {
  const normalized = normalizeHeader(header);
  if (!normalized) return false;
  return keywords.some((kw) => {
    if (normalized === kw) return true;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i').test(normalized);
  });
}

const UPDATED_AT_KEYWORDS = [
  'tarikh kemas kini',
  'masa kemas kini',
  'kemas kini terakhir',
  'dikemas kini',
  'kemas kini',
  'kemaskini',
  'tarikh update',
  'masa update',
  'last updated',
  'last update',
  'updated at',
  'updated',
];

const INLINE_UPDATED_PATTERN =
  /^(?:tarikh\s+kemas\s*kini|masa\s+kemas\s*kini|kemas\s*kini(?:\s+terakhir)?|dikemas\s*kini(?:\s+pada)?|tarikh\s+update|masa\s+update|last\s+updated?|updated(?:\s+at)?)\s*[:=\-–]\s*(.+)$/i;

function rowHasTableHeaderKeywords(row: string[]): boolean {
  const hasClass = row.some((h) =>
    matchesWholeKeyword(h, ['nama kelas', 'kelas', 'class', 'darjah', 'tingkatan', 'tahun'])
  );
  const hasName = row.some((h) =>
    matchesWholeKeyword(h, ['nama murid', 'nama penuh', 'student name', 'murid', 'nama'])
  );
  return hasClass && hasName;
}

function inspectRowForUpdatedMetadata(row: string[]): {
  isStandaloneMetadataRow: boolean;
  updatedValue: string | null;
} {
  let updatedValue: string | null = null;
  const nonEmptyCells = row.map((c) => c.trim()).filter(Boolean);
  if (nonEmptyCells.length === 0) {
    return { isStandaloneMetadataRow: false, updatedValue: null };
  }

  for (const cell of nonEmptyCells) {
    const match = cell.match(INLINE_UPDATED_PATTERN);
    if (match && match[1]?.trim()) {
      updatedValue = match[1].trim();
      break;
    }
  }

  const isTableHeader = rowHasTableHeaderKeywords(row);
  if (!isTableHeader) {
    if (nonEmptyCells.length === 1 && updatedValue) {
      return { isStandaloneMetadataRow: true, updatedValue };
    }

    const firstCell = nonEmptyCells[0];
    if (
      nonEmptyCells.length <= 2 &&
      (INLINE_UPDATED_PATTERN.test(firstCell) ||
        matchesWholeKeyword(firstCell, UPDATED_AT_KEYWORDS))
    ) {
      const valueFromSecond =
        updatedValue ?? (nonEmptyCells.length === 2 ? nonEmptyCells[1] : null);
      return {
        isStandaloneMetadataRow: true,
        updatedValue: valueFromSecond || null,
      };
    }
  }

  return { isStandaloneMetadataRow: false, updatedValue };
}

export function mapRowsToStudents(rows: string[][]): SheetParseResult {
  if (rows.length === 0) {
    return {
      students: [],
      totalRowsRead: 0,
      loggedInFilteredCount: 0,
      hasHeader: false,
      sheetUpdatedAt: null,
      detectedColumns: { classCol: 0, nameCol: 1, idCol: 2, statusCol: -1 },
    };
  }

  let sheetUpdatedAt: string | null = null;
  const contentRows: string[][] = [];

  for (const row of rows) {
    const meta = inspectRowForUpdatedMetadata(row);
    if (!sheetUpdatedAt && meta.updatedValue) {
      sheetUpdatedAt = meta.updatedValue;
    }
    if (meta.isStandaloneMetadataRow) {
      continue;
    }
    contentRows.push(row);
  }

  if (contentRows.length === 0) {
    return {
      students: [],
      totalRowsRead: 0,
      loggedInFilteredCount: 0,
      hasHeader: false,
      sheetUpdatedAt,
      detectedColumns: { classCol: 0, nameCol: 1, idCol: 2, statusCol: -1 },
    };
  }

  const firstRow = contentRows[0].map((cell) => cell.trim());

  const updatedCol = firstRow.findIndex(
    (h) => !INLINE_UPDATED_PATTERN.test(h) && matchesWholeKeyword(h, UPDATED_AT_KEYWORDS)
  );

  let classCol = firstRow.findIndex(
    (h, idx) =>
      idx !== updatedCol &&
      matchesWholeKeyword(h, ['nama kelas', 'kelas', 'class', 'darjah', 'tingkatan', 'tahun'])
  );

  // Match explicit ID / DELIMa / Email headers first using whole-word boundaries
  // so "Nama Murid" (containing "mur-id") never steals idCol from Column C.
  let idCol = firstRow.findIndex(
    (h, idx) =>
      idx !== classCol &&
      idx !== updatedCol &&
      matchesWholeKeyword(h, [
        'id delima',
        'delima id',
        'id murid',
        'emel delima',
        'email delima',
        'id pengguna',
        'user id',
        'delima',
        'emel',
        'email',
        'id',
      ])
  );

  let nameCol = firstRow.findIndex(
    (h, idx) =>
      idx !== classCol &&
      idx !== idCol &&
      idx !== updatedCol &&
      matchesWholeKeyword(h, ['nama murid', 'nama penuh', 'student name', 'murid', 'nama'])
  );

  const statusCol = firstRow.findIndex(
    (h, idx) =>
      idx !== classCol &&
      idx !== nameCol &&
      idx !== idCol &&
      idx !== updatedCol &&
      matchesWholeKeyword(h, ['status', 'status log masuk', 'log masuk', 'login', 'catatan'])
  );

  const hasHeader = classCol !== -1 || nameCol !== -1 || idCol !== -1 || statusCol !== -1;

  if (!hasHeader) {
    classCol = 0;
    nameCol = 1;
    idCol = contentRows[0].length >= 3 ? 2 : -1;
  } else {
    if (classCol === -1) classCol = 0;
    if (nameCol === -1) {
      nameCol =
        [0, 1, 2, 3].find(
          (idx) => idx < firstRow.length && idx !== classCol && idx !== idCol && idx !== updatedCol
        ) ?? 1;
    }
    if (idCol === -1 && firstRow.length >= 3) {
      const candidate = [0, 1, 2, 3].find(
        (idx) =>
          idx < firstRow.length &&
          idx !== classCol &&
          idx !== nameCol &&
          idx !== statusCol &&
          idx !== updatedCol
      );
      idCol = candidate ?? -1;
    }
  }

  const dataRows = hasHeader ? contentRows.slice(1) : contentRows;
  const students: StudentRecord[] = [];
  let loggedInFilteredCount = 0;

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    if (!sheetUpdatedAt && updatedCol >= 0) {
      const rawUpdated = (row[updatedCol] ?? '').trim();
      if (rawUpdated) {
        const inlineMatch = rawUpdated.match(INLINE_UPDATED_PATTERN);
        sheetUpdatedAt = inlineMatch?.[1]?.trim() || rawUpdated;
      }
    }

    const rawClass = row[classCol] ?? '';
    const rawName = row[nameCol] ?? '';
    const rawId = idCol >= 0 ? (row[idCol] ?? '') : '';
    const rawStatus = statusCol >= 0 ? (row[statusCol] ?? '') : '';

    const className = normalizeClassName(rawClass);
    const studentName = rawName.trim().replace(/\s+/g, ' ');
    const studentId = rawId.trim();

    if (!className || !studentName) continue;

    if (rawStatus && LOGGED_IN_STATUS_VALUES.has(rawStatus.trim().toLowerCase())) {
      loggedInFilteredCount += 1;
      continue;
    }

    students.push({
      id: `${className}-${i + 1}-${studentId || studentName}`,
      className,
      studentName,
      studentId,
      status: rawStatus || undefined,
    });
  }

  return {
    students,
    totalRowsRead: dataRows.length,
    loggedInFilteredCount,
    hasHeader,
    sheetUpdatedAt,
    detectedColumns: { classCol, nameCol, idCol, statusCol },
  };
}

export function compareClassNames(a: string, b: string): number {
  return a.localeCompare(b, 'ms', { numeric: true, sensitivity: 'base' });
}

export function filterStudentsByClass(
  students: StudentRecord[],
  classQuery: string,
  nameOrIdQuery = ''
): { matchedClassName: string; students: StudentRecord[] } {
  const normalizedQuery = normalizeClassName(classQuery);
  if (!normalizedQuery) {
    return { matchedClassName: '', students: [] };
  }

  // Prefer exact normalized class match first (e.g. "1A" matches "1A" only, not "1AB")
  const exactMatches = students.filter((s) => normalizeClassName(s.className) === normalizedQuery);
  let matchedClassName = normalizedQuery;
  let classStudents = exactMatches;

  // Fallback to prefix/substring match only when no exact match exists
  if (exactMatches.length === 0) {
    const availableClasses = Array.from(
      new Set(students.map((s) => normalizeClassName(s.className)))
    ).sort(compareClassNames);

    const prefixClass = availableClasses.find((cls) => cls.startsWith(normalizedQuery));
    const containsClass =
      prefixClass ?? availableClasses.find((cls) => cls.includes(normalizedQuery));

    if (containsClass) {
      matchedClassName = containsClass;
      classStudents = students.filter((s) => normalizeClassName(s.className) === containsClass);
    }
  }

  const trimmedSearch = nameOrIdQuery.trim().toLowerCase();
  if (trimmedSearch) {
    classStudents = classStudents.filter(
      (s) =>
        s.studentName.toLowerCase().includes(trimmedSearch) ||
        s.studentId.toLowerCase().includes(trimmedSearch)
    );
  }

  return {
    matchedClassName,
    students: classStudents,
  };
}

export function computeClassSummaries(students: StudentRecord[]): ClassSummary[] {
  const grouped = new Map<string, StudentRecord[]>();
  for (const student of students) {
    const key = normalizeClassName(student.className);
    const list = grouped.get(key) ?? [];
    list.push(student);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => compareClassNames(a, b))
    .map(([className, list]) => ({
      className,
      pendingCount: list.length,
      students: list,
    }));
}

export function formatWhatsAppList(
  className: string,
  students: StudentRecord[],
  options?: { includeIds?: boolean }
): string {
  const displayClass = normalizeClassName(className) || '-';
  const includeIds = Boolean(options?.includeIds);

  const studentLines = students.map((student, index) => {
    const base = `${index + 1}. ${student.studentName}`;
    return includeIds && student.studentId ? `${base} (${student.studentId})` : base;
  });

  const lines = [
    '*SENARAI MURID BELUM LOG MASUK DELIMa 3.0*',
    `*Kelas: ${displayClass}*`,
    `*Jumlah: ${students.length} orang*`,
    ...studentLines,
    'Mohon kerjasama ibu bapa/murid untuk log masuk ke portal DELIMa 3.0 menggunakan pautan berikut:',
    'https://d3.delima.edu.my/',
    'Sekiranya anda menghadapi masalah atau terlupa ID,',
    '*sila hubungi guru kelas serta-merta.*',
    'Kerjasama anda amat dihargai.',
    'Terima kasih.',
  ];

  return lines.join('\n');
}

export function formatLastUpdatedTimestamp(
  isoTimestamp: string | null | undefined,
  timeZone = 'Asia/Kuala_Lumpur'
): string | null {
  if (!isoTimestamp) return null;
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat('ms-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(parsed);
}

