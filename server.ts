import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractGoogleSheetInfo, verifyAdminPassword } from './src/utils/sheetParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE_PATH = path.resolve('/tmp/delima-school-sheet-config.json');

interface ServerSheetConfig {
  sheetUrl: string | null;
  spreadsheetId: string | null;
}

function readServerSheetConfig(): ServerSheetConfig {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8')) as ServerSheetConfig;
      return {
        sheetUrl: parsed.sheetUrl ?? null,
        spreadsheetId: parsed.spreadsheetId ?? null,
      };
    }
  } catch {
    // Ignore invalid config file
  }
  return { sheetUrl: null, spreadsheetId: null };
}

function writeServerSheetConfig(config: ServerSheetConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config), 'utf8');
  } catch {
    // Ignore write failure
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/sheet-config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(readServerSheetConfig());
});

app.post('/api/sheet-config', (req, res) => {
  const { sheetUrl, adminPassword } = (req.body ?? {}) as {
    sheetUrl?: string;
    adminPassword?: string;
  };
  if (!adminPassword || !verifyAdminPassword(adminPassword)) {
    res.status(403).json({ error: 'Pengesahan admin tidak sah.' });
    return;
  }
  const trimmed = typeof sheetUrl === 'string' ? sheetUrl.trim() : '';
  const info = extractGoogleSheetInfo(trimmed);
  if (!info) {
    res.status(400).json({ error: 'Pautan Google Sheet tidak sah.' });
    return;
  }
  const next: ServerSheetConfig = {
    sheetUrl: trimmed,
    spreadsheetId: info.spreadsheetId ?? null,
  };
  writeServerSheetConfig(next);
  res.json(next);
});

app.delete('/api/sheet-config', (req, res) => {
  const { adminPassword } = (req.body ?? {}) as { adminPassword?: string };
  if (!adminPassword || !verifyAdminPassword(adminPassword)) {
    res.status(403).json({ error: 'Pengesahan admin tidak sah.' });
    return;
  }
  writeServerSheetConfig({ sheetUrl: null, spreadsheetId: null });
  res.json({ ok: true });
});

app.get('/api/sheet', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
    const info = extractGoogleSheetInfo(rawUrl);

    if (!info) {
      res.status(400).json({
        error:
          'Pautan Google Sheet tidak sah. Sila masukkan pautan Google Sheets penuh atau ID spreadsheet yang betul.',
      });
      return;
    }

    const response = await fetch(info.csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'SJKC-Chung-Hua-DELIMa-Tracker/1.0',
      },
    });

    if (!response.ok) {
      res.status(422).json({
        error:
          'Tidak dapat mengakses Google Sheet tersebut. Pastikan tetapan perkongsian ditetapkan kepada "Anyone with the link can view" (Sesiapa sahaja yang mempunyai pautan boleh melihat).',
      });
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (
      contentType.includes('text/html') ||
      text.trimStart().toLowerCase().startsWith('<!doctype html') ||
      text.trimStart().toLowerCase().startsWith('<html')
    ) {
      res.status(403).json({
        error:
          'Google Sheet ini masih dikunci (memerlukan log masuk). Sila tukar akses Share kepada "Anyone with the link -> Viewer" atau guna fungsi Publish to Web (CSV).',
      });
      return;
    }

    res.json({
      csv: text,
      spreadsheetId: info.spreadsheetId ?? null,
      gid: info.gid ?? null,
      csvUrl: info.csvUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ralat rangkaian tidak diketahui';
    res.status(500).json({
      error: `Gagal memuat turun data Google Sheet: ${message}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DELIMa 3.0 Tracker server listening on port ${PORT}`);
  });
}

startServer();
