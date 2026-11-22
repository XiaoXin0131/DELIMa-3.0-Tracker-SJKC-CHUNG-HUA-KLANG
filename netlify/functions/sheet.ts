import { extractGoogleSheetInfo } from '../../src/utils/sheetParser';

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
  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const requestUrl = new URL(req.url);
    const rawUrl = requestUrl.searchParams.get('url') ?? '';
    const info = extractGoogleSheetInfo(rawUrl);

    if (!info) {
      return jsonResponse(
        {
          error:
            'Pautan Google Sheet tidak sah. Sila masukkan pautan Google Sheets penuh atau ID spreadsheet yang betul.',
        },
        400
      );
    }

    const response = await fetch(info.csvUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'SJKC-Chung-Hua-DELIMa-Tracker/1.0',
      },
    });

    if (!response.ok) {
      return jsonResponse(
        {
          error:
            'Tidak dapat mengakses Google Sheet tersebut. Pastikan tetapan perkongsian ditetapkan kepada "Anyone with the link can view" (Sesiapa sahaja yang mempunyai pautan boleh melihat).',
        },
        422
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (
      contentType.includes('text/html') ||
      text.trimStart().toLowerCase().startsWith('<!doctype html') ||
      text.trimStart().toLowerCase().startsWith('<html')
    ) {
      return jsonResponse(
        {
          error:
            'Google Sheet ini masih dikunci (memerlukan log masuk). Sila tukar akses Share kepada "Anyone with the link -> Viewer" atau guna fungsi Publish to Web (CSV).',
        },
        403
      );
    }

    return jsonResponse({
      csv: text,
      spreadsheetId: info.spreadsheetId ?? null,
      gid: info.gid ?? null,
      csvUrl: info.csvUrl,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ralat rangkaian tidak diketahui';
    return jsonResponse(
      {
        error: `Gagal memuat turun data Google Sheet: ${message}`,
      },
      500
    );
  }
}
