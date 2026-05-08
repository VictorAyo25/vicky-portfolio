import { NextRequest, NextResponse } from 'next/server';

function extractGoogleDocId(input: string): string | null {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  } catch {
    const match = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || null;
  }
}

function deriveTitleFromHtml(html: string): string {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match?.[1]) {
    return h1Match[1].replace(/<[^>]*>/g, '').trim();
  }

  return 'Imported Google Doc';
}

function extractBodyHtml(fullHtml: string): string {
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (bodyMatch?.[1] || fullHtml).trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sourceUrl = String(body?.url || '').trim();

    if (!sourceUrl) {
      return NextResponse.json({ error: 'Google Docs URL is required.' }, { status: 400 });
    }

    const docId = extractGoogleDocId(sourceUrl);
    if (!docId) {
      return NextResponse.json(
        { error: 'Invalid Google Docs URL. Please paste a full Google Docs link.' },
        { status: 400 }
      );
    }

    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

    const response = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            'Could not fetch document. Ensure the doc is shared as "Anyone with the link can view" or you are using a publicly accessible export link.',
        },
        { status: 400 }
      );
    }

    const rawHtml = await response.text();
    const title = deriveTitleFromHtml(rawHtml);
    const content = extractBodyHtml(rawHtml);

    if (!content) {
      return NextResponse.json(
        { error: 'The document appears empty or could not be parsed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ title, content });
  } catch {
    return NextResponse.json(
      { error: 'Unable to import from Google Docs right now. Please try again.' },
      { status: 500 }
    );
  }
}
