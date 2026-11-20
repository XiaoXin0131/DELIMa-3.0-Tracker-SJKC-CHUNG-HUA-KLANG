import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractGoogleSheetInfo,
  parseDelimitedRows,
  mapRowsToStudents,
  filterStudentsByClass,
  computeClassSummaries,
  formatWhatsAppList,
  verifyAdminPassword,
} from './sheetParser';

test('verifyAdminPassword accepts exact admin password only', () => {
  assert.equal(verifyAdminPassword('Xiaoxin0131'), true);
  assert.equal(verifyAdminPassword('xiaoxin0131'), false);
  assert.equal(verifyAdminPassword(''), false);
});

test('extractGoogleSheetInfo parses standard edit URL with gid', () => {
  const info = extractGoogleSheetInfo(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=123456'
  );
  assert.ok(info);
  assert.equal(info.type, 'spreadsheet_id');
  assert.equal(info.spreadsheetId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(info.gid, '123456');
  assert.equal(
    info.csvUrl,
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv&gid=123456'
  );
});

test('extractGoogleSheetInfo parses published /d/e/ URL and forces csv output', () => {
  const info = extractGoogleSheetInfo(
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTestSheetKey123/pubhtml'
  );
  assert.ok(info);
  assert.equal(info.type, 'published_csv');
  assert.match(info.csvUrl, /\/pub\?output=csv$/);
});

test('parseDelimitedRows handles quoted commas and pasted TSV', () => {
  const csv = 'Kelas,Nama Murid,ID Murid\n"1A","ALI, BIN ABU",m-1001@moe-dl.edu.my\n1B,SITI NUR,m-1002@moe-dl.edu.my';
  const csvRows = parseDelimitedRows(csv);
  assert.equal(csvRows.length, 3);
  assert.equal(csvRows[1][1], 'ALI, BIN ABU');

  const tsv = 'Kelas\tNama Murid\tID Murid\n2A\tTAN WEI MING\tm-2001@moe-dl.edu.my';
  const tsvRows = parseDelimitedRows(tsv);
  assert.equal(tsvRows.length, 2);
  assert.equal(tsvRows[1][0], '2A');
  assert.equal(tsvRows[1][2], 'm-2001@moe-dl.edu.my');
});

test('mapRowsToStudents detects Malay headers and excludes Sudah status when present', () => {
  const rows = [
    ['Nama Kelas', 'Nama Murid', 'ID DELIMa', 'Status Log Masuk'],
    ['1a', 'AYEESHA ADREANNA BINTI MOHD AZHAR', 'm-101@moe-dl.edu.my', 'Belum'],
    ['1A', 'TAN JUN JIE', 'm-102@moe-dl.edu.my', 'Sudah'],
    ['2B', 'CHONG MEI LING', 'm-201@moe-dl.edu.my', 'Belum Log Masuk'],
  ];

  const result = mapRowsToStudents(rows);
  assert.equal(result.hasHeader, true);
  assert.equal(result.loggedInFilteredCount, 1);
  assert.equal(result.students.length, 2);
  assert.equal(result.students[0].className, '1A');
  assert.equal(result.students[0].studentId, 'm-101@moe-dl.edu.my');
  assert.equal(result.students[1].className, '2B');
  assert.equal(result.students[1].studentId, 'm-201@moe-dl.edu.my');
});

test('mapRowsToStudents maps Column C ID DELIMa properly when Column B is Nama Murid', () => {
  const rows = [
    ['Kelas', 'Nama Murid', 'ID DELIMa'],
    ['1A', 'CHAN KAI SHENG', 'm-13409284@moe-dl.edu.my'],
  ];

  const result = mapRowsToStudents(rows);
  assert.equal(result.detectedColumns.classCol, 0);
  assert.equal(result.detectedColumns.nameCol, 1);
  assert.equal(result.detectedColumns.idCol, 2);
  assert.equal(result.students[0].studentName, 'CHAN KAI SHENG');
  assert.equal(result.students[0].studentId, 'm-13409284@moe-dl.edu.my');

  const waWithIds = formatWhatsAppList('1A', result.students, { includeIds: true });
  assert.match(waWithIds, /1\. CHAN KAI SHENG \(m-13409284@moe-dl\.edu\.my\)/);
});

test('filterStudentsByClass prefers exact match and supports name search', () => {
  const students = [
    { id: '1', className: '1A', studentName: 'ENYA NG', studentId: 'm-1@moe-dl.edu.my' },
    { id: '2', className: '1AB', studentName: 'LIM WEI', studentId: 'm-2@moe-dl.edu.my' },
    { id: '3', className: '1A', studentName: 'CHAN KAI SHENG', studentId: 'm-3@moe-dl.edu.my' },
  ];

  const exact = filterStudentsByClass(students, ' 1a ');
  assert.equal(exact.matchedClassName, '1A');
  assert.equal(exact.students.length, 2);

  const searched = filterStudentsByClass(students, '1A', 'enya');
  assert.equal(searched.students.length, 1);
  assert.equal(searched.students[0].studentName, 'ENYA NG');
});

test('computeClassSummaries sorts classes naturally', () => {
  const summaries = computeClassSummaries([
    { id: '1', className: '6B', studentName: 'A', studentId: '1' },
    { id: '2', className: '1A', studentName: 'B', studentId: '2' },
    { id: '3', className: '2A', studentName: 'C', studentId: '3' },
    { id: '4', className: '1A', studentName: 'D', studentId: '4' },
  ]);

  assert.deepEqual(
    summaries.map((s) => `${s.className}:${s.pendingCount}`),
    ['1A:2', '2A:1', '6B:1']
  );
});

test('formatWhatsAppList produces exact requested format with WhatsApp bold markers', () => {
  const students = [
    { id: '1', className: '1A', studentName: 'AYEESHA ADREANNA BINTI MOHD AZHAR', studentId: 'm-1' },
    { id: '2', className: '1A', studentName: 'CHAN KAI SHENG', studentId: 'm-2' },
  ];

  const msg = formatWhatsAppList('1a', students);
  const expected = [
    '*SENARAI MURID BELUM LOG MASUK DELIMa 3.0*',
    '*Kelas: 1A*',
    '*Jumlah: 2 orang*',
    '1. AYEESHA ADREANNA BINTI MOHD AZHAR',
    '2. CHAN KAI SHENG',
    'Mohon kerjasama ibu bapa/murid untuk log masuk ke portal DELIMa 3.0 menggunakan pautan berikut:',
    'https://d3.delima.edu.my/',
    'Sekiranya anda menghadapi masalah atau terlupa ID,',
    '*sila hubungi guru kelas serta-merta.*',
    'Kerjasama anda amat dihargai.',
    'Terima kasih.',
  ].join('\n');

  assert.equal(msg, expected);
});
