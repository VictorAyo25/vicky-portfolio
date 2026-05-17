/**
 * Convert raw text into structured HTML.
 * Detects headings, paragraphs, lists, and preserves basic formatting.
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

export function textToStructuredHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  const htmlParts: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const isHeading = (line: string, nextLine: string): { level: number } | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) return null;

    // ALL CAPS line → heading level 2
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length > 2) {
      return { level: 2 };
    }
    // Line followed by === or --- underline → heading
    if (nextLine && /^[-=]{3,}$/.test(nextLine.trim())) {
      return { level: nextLine.trim().startsWith('=') ? 1 : 2 };
    }
    // Short line that doesn't end with sentence punctuation → heading
    if (
      trimmed.length < 80 &&
      !trimmed.endsWith('.') &&
      !trimmed.endsWith(',') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith(':') &&
      !trimmed.endsWith('!') &&
      !trimmed.endsWith('?') &&
      !/^\d+[.\)]/.test(trimmed) &&
      !/^[-•*–]/.test(trimmed)
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
      htmlParts.push(`<li>${escapeHtml(listItem.content)}</li>`);
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
      htmlParts.push(`<${tag}>${escapeHtml(trimmed)}</${tag}>`);
      if (nextLine && /^[-=]{3,}$/.test(nextLine.trim())) i++; // skip underline
      continue;
    }

    // Short line without sentence ending → h3
    if (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.endsWith('!') && !trimmed.endsWith('?')) {
      htmlParts.push(`<h3>${escapeHtml(trimmed)}</h3>`);
    } else {
      // Regular paragraph
      htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`);
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
