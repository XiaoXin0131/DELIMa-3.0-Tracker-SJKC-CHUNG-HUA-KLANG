import fs from 'fs';
import path from 'path';
import { extractGoogleSheetInfo, verifyAdminPassword } from '../../src/utils/sheetParser';

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

  const defaultSheetUrl = process.env.DEFAULT_SHEET_URL?.trim();
  if (defaultSheetUrl) {
    const info = extractGoogleSheetInfo(defaultSheetUrl);
    if (info) {
      return {
        sheetUrl: defaultSheetUrl,
        spreadsheetId: info.spreadsheetId ?? null,
      };
    }
  }

  return { sheetUrl: null, spreadsheetId: null };
}

function writeServerSheetConfig(config: ServerSheetConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config), 'utf8');
  } catch {
    // Ignore write failure on read-only environments
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return jsonResponse(readServerSheetConfig());
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { sheetUrl?: string; adminPassword?: string };
      if (!body.adminPassword || !verifyAdminPassword(body.adminPassword)) {
        return jsonResponse({ error: 'Pengesahan admin tidak sah.' }, 403);
      }

      const trimmed = typeof body.sheetUrl === 'string' ? body.sheetUrl.trim() : '';
      const info = extractGoogleSheetInfo(trimmed);
      if (!info) {
        return jsonResponse({ error: 'Pautan Google Sheet tidak sah.' }, 400);
      }

      const next: ServerSheetConfig = {
        sheetUrl: trimmed,
        spreadsheetId: info.spreadsheetId ?? null,
      };
      writeServerSheetConfig(next);
      return jsonResponse(next);
    } catch {
      return jsonResponse({ error: 'Permintaan tidak sah.' }, 400);
    }
  }

  if (req.method === 'DELETE') {
    try {
      const body = (await req.json()) as { adminPassword?: string };
      if (!body.adminPassword || !verifyAdminPassword(body.adminPassword)) {
        return jsonResponse({ error: 'Pengesahan admin tidak sah.' }, 403);
      }

      writeServerSheetConfig({ sheetUrl: null, spreadsheetId: null });
      return jsonResponse({ ok: true });
    } catch {
      return jsonResponse({ error: 'Permintaan tidak sah.' }, 400);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}
