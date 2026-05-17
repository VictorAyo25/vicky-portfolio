/**
 * Convert raw text into structured HTML.
 * Detects headings, paragraphs, lists, and preserves basic formatting.
 * Handles markdown-style markers: **bold**, *italic*, ***bold+italic***, [text](url)
 * Used by both server-side PDF import and client-side OCR processing.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Convert markdown-style inline formatting to HTML tags.
 * Processes: ***bold+italic*** → <strong><em>...</em></strong>
 *            **bold** → <strong>...</strong>
 *            *italic* → <em>...</em>
 *            [text](url) → <a href="url">text</a>
 */
function convertInlineFormatting(text: string): string {
  // Escape HTML first (but preserve our markdown markers)
  let result = escapeHtml(text);

  // Links: [text](url) → <a href="url">text</a>
  // Must be processed before bold/italic to avoid conflicts
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>',
  );

  // Bold+italic: ***text*** → <strong><em>text</em></strong>
  result = result.replace(
    /\*\*\*(.+?)\*\*\*/g,
    '<strong><em>$1</em></strong>',
  );

  // Bold: **text** → <strong>text</strong>
  result = result.replace(
    /\*\*(.+?)\*\*/g,
    '<strong>$1</strong>',
  );

  // Italic: *text* → <em>text</em>
  result = result.replace(
    /\*(.+?)\*/g,
    '<em>$1</em>',
  );

  return result;
}

export function textToStructuredHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const htmlParts: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const isHeading = (line: string, nextLine: string): { level: number } | null => {
    // Strip markdown markers for heading detection
    const stripped = line.replace(/\*{1,3}|_/g, '').trim();
    if (!stripped || stripped.length > 120) return null;

    // ALL CAPS line → heading level 2
    if (stripped === stripped.toUpperCase() && /[A-Z]/.test(stripped) && stripped.length > 2) {
      return { level: 2 };
    }
    // Line followed by === or --- underline → heading
    if (nextLine && /^[-=]{3,}$/.test(nextLine.trim())) {
      return { level: nextLine.trim().startsWith('=') ? 1 : 2 };
    }
    // Short line that doesn't end with sentence punctuation → heading
    if (
      stripped.length < 80 &&
      !stripped.endsWith('.') &&
      !stripped.endsWith(',') &&
      !stripped.endsWith(';') &&
      !stripped.endsWith(':') &&
      !stripped.endsWith('!') &&
      !stripped.endsWith('?') &&
      !/^\d+[.\)]/.test(stripped) &&
      !/^[-•*–]/.test(stripped)
    ) {
      return { level: 2 };
    }
    return null;
  };

  const isListItem = (line: string): { type: 'ul' | 'ol'; content: string } | null => {
    const trimmed = line.trim();
    const orderedMatch = trimmed.match(/^(\d+)[.\)]\s+(.+)$/);
    if (orderedMatch) return { type: 'ol', content: orderedMatch[2] };
    const unorderedMatch = trimmed.match(/^[-•*–]\s+(.+)$/);
    if (unorderedMatch) return { type: 'ul', content: unorderedMatch[1] };
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';

    // Blank line → close any open list
    if (!trimmed) {
      if (inList) {
        htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      continue;
    }

    // List item
    const listItem = isListItem(trimmed);
    if (listItem) {
      if (!inList || listType !== listItem.type) {
        if (inList) htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
        htmlParts.push(listItem.type === 'ul' ? '<ul>' : '<ol>');
        inList = true;
        listType = listItem.type;
      }
      htmlParts.push(`<li>${convertInlineFormatting(listItem.content)}</li>`);
      continue;
    }

    // Non-list item → close any open list
    if (inList) {
      htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    // Heading
    const heading = isHeading(trimmed, nextLine);
    if (heading) {
      const tag = `h${Math.min(heading.level, 3)}`;
      htmlParts.push(`<${tag}>${convertInlineFormatting(trimmed)}</${tag}>`);
      if (nextLine && /^[-=]{3,}$/.test(nextLine.trim())) i++; // skip underline
      continue;
    }

    // Short line without sentence ending → h3
    const strippedForHeading = trimmed.replace(/\*{1,3}|_/g, '').trim();
    if (strippedForHeading.length < 60 && !strippedForHeading.endsWith('.') && !strippedForHeading.endsWith('!') && !strippedForHeading.endsWith('?')) {
      htmlParts.push(`<h3>${convertInlineFormatting(trimmed)}</h3>`);
    } else {
      // Regular paragraph with inline formatting
      htmlParts.push(`<p>${convertInlineFormatting(trimmed)}</p>`);
    }
  }

  // Close any remaining open list
  if (inList) {
    htmlParts.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  return htmlParts.join('\n');
}

/**
 * Derive a title from extracted text (first meaningful line).
 */
export function deriveTitle(text: string, filename?: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length < 120) return firstLine;
  }
  if (filename) {
    return filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ');
  }
  return 'Imported PDF';
}
