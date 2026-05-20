'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Pilcrow,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  ChevronDown,
} from 'lucide-react';

interface RichTextEditorProps {
  label?: string;
  value: string;
  onChange: (html: string) => void;
  minHeightClassName?: string;
}

const FONT_OPTIONS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Verdana',
  'Courier New',
  'Trebuchet MS',
  'Palatino Linotype',
] as const;

// Microsoft Word-style font sizes in points — most common ones for quick pick
const QUICK_SIZES = [8, 10, 12, 14, 18, 24, 36] as const;

const MAX_HISTORY = 80;

export default function RichTextEditor({
  label = 'Content',
  value,
  onChange,
  minHeightClassName = 'min-h-[320px]',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const historyRef = useRef<string[]>(['']);
  const historyIndexRef = useRef(0);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  const [activeBlock, setActiveBlock] = useState<string>('P');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showFontPanel, setShowFontPanel] = useState(false);

  // Push state to history stack
  const pushHistory = useCallback((html: string) => {
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    if (idx < stack.length - 1) {
      historyRef.current = stack.slice(0, idx + 1);
    }
    historyRef.current.push(html);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(-MAX_HISTORY);
    }
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Sync external value to editor
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml !== value && !isInternalChange.current) {
      editorRef.current.innerHTML = value || '';
      historyRef.current = [value || ''];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
    isInternalChange.current = false;
  }, [value]);

  // Detect active formatting on selection change
  const checkActiveFormats = useCallback(() => {
    try {
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      setActiveFormats({ bold, italic, underline });
      const block = document.queryCommandValue('formatBlock') || 'P';
      setActiveBlock(block.toUpperCase());
    } catch {
      // queryCommandState can throw in some browsers
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', checkActiveFormats);
    return () => document.removeEventListener('selectionchange', checkActiveFormats);
  }, [checkActiveFormats]);

  const runCommand = useCallback((command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    pushHistory(html);
    onChange(html);
    setTimeout(checkActiveFormats, 0);
  }, [onChange, pushHistory, checkActiveFormats]);

  const applyFontSize = useCallback((size: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    runCommand('fontSize', '7');
    if (editorRef.current) {
      const fonts = editorRef.current.querySelectorAll('font[size="7"]');
      fonts.forEach((el) => {
        const span = document.createElement('span');
        span.style.fontSize = size;
        span.innerHTML = el.innerHTML;
        el.parentNode?.replaceChild(span, el);
      });
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      pushHistory(html);
      onChange(html);
    }
    setShowFontPanel(false);
  }, [runCommand, pushHistory, onChange]);

  const handleUndo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevHtml = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = prevHtml;
      isInternalChange.current = true;
      onChange(prevHtml);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
      setTimeout(checkActiveFormats, 0);
    }
  }, [onChange, checkActiveFormats]);

  const handleRedo = useCallback(() => {
    if (!editorRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextHtml = historyRef.current[historyIndexRef.current];
      editorRef.current.innerHTML = nextHtml;
      isInternalChange.current = true;
      onChange(nextHtml);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setCanUndo(true);
      setTimeout(checkActiveFormats, 0);
    }
  }, [onChange, checkActiveFormats]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (!text || !editorRef.current) return;

    // Insert plain text styled with the editor's default font so it matches
    // the article's existing content regardless of source formatting
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const span = document.createElement('span');
    span.style.fontFamily = 'var(--font-sans), system-ui, -apple-system, sans-serif';
    span.style.fontSize = '1rem';
    span.textContent = text;

    range.insertNode(span);

    // Move cursor past the inserted content
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);

    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    pushHistory(html);
    onChange(html);
  }, [onChange, pushHistory]);

  const onInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    pushHistory(html);
    onChange(html);
  }, [onChange, pushHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }
  }, [handleUndo, handleRedo]);

  // Close font panel on outside click
  useEffect(() => {
    if (!showFontPanel) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-font-panel]')) {
        setShowFontPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFontPanel]);

  const btnBase = 'p-2 rounded-md transition-colors flex-shrink-0';
  const btnInactive = 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50';
  const btnActive = 'text-[#C5A059] bg-[#C5A059]/15 ring-1 ring-[#C5A059]/30';

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">{label}</label>

      <div className="border border-[#2F2A26] rounded-xl overflow-hidden bg-[#0F0E0D]">
        {/* ===== TOOLBAR ===== */}
        {/* 
          Mobile: 2-row wrapped layout — Row 1 = formatting icons, Row 2 = font/size dropdowns
          All visible without scrolling.
          Desktop (sm+): single row, horizontally scrollable if needed.
        */}
        <div className="border-b border-[#2F2A26] bg-[#171311]">
          {/* Row 1 — Always visible: Undo, Redo, Bold, Italic, Underline, H1, P, Quote, Lists, Link, Image, HR */}
          <div className="flex flex-wrap items-center gap-0.5 p-2 pb-1 sm:p-3 sm:pb-2">
            {/* Undo / Redo */}
            <button type="button" onClick={handleUndo} disabled={!canUndo}
              className={`${btnBase} ${canUndo ? btnInactive : 'text-gray-600 cursor-not-allowed'}`}
              title="Undo (Ctrl+Z)">
              <Undo2 size={16} />
            </button>
            <button type="button" onClick={handleRedo} disabled={!canRedo}
              className={`${btnBase} ${canRedo ? btnInactive : 'text-gray-600 cursor-not-allowed'}`}
              title="Redo (Ctrl+Shift+Z)">
              <Redo2 size={16} />
            </button>

            <span className="w-px h-6 bg-[#2F2A26] mx-0.5 flex-shrink-0" />

            {/* Text formatting */}
            <button type="button" onClick={() => runCommand('bold')}
              className={`${btnBase} ${activeFormats.bold ? btnActive : btnInactive}`}
              title="Bold (Ctrl+B)">
              <Bold size={16} />
            </button>
            <button type="button" onClick={() => runCommand('italic')}
              className={`${btnBase} ${activeFormats.italic ? btnActive : btnInactive}`}
              title="Italic (Ctrl+I)">
              <Italic size={16} />
            </button>
            <button type="button" onClick={() => runCommand('underline')}
              className={`${btnBase} ${activeFormats.underline ? btnActive : btnInactive}`}
              title="Underline (Ctrl+U)">
              <Underline size={16} />
            </button>

            <span className="w-px h-6 bg-[#2F2A26] mx-0.5 flex-shrink-0" />

            {/* Block formats — H1, P, Quote (no H2) */}
            <button type="button" onClick={() => runCommand('formatBlock', 'H1')}
              className={`${btnBase} ${activeBlock === 'H1' ? btnActive : btnInactive}`}
              title="Heading 1">
              <Heading1 size={16} />
            </button>
            <button type="button" onClick={() => runCommand('formatBlock', 'P')}
              className={`${btnBase} ${activeBlock === 'P' ? btnActive : btnInactive}`}
              title="Paragraph">
              <Pilcrow size={16} />
            </button>
            <button type="button" onClick={() => runCommand('formatBlock', 'BLOCKQUOTE')}
              className={`${btnBase} ${activeBlock === 'BLOCKQUOTE' ? btnActive : btnInactive}`}
              title="Blockquote">
              <Quote size={16} />
            </button>

            <span className="w-px h-6 bg-[#2F2A26] mx-0.5 flex-shrink-0" />

            {/* Lists */}
            <button type="button" onClick={() => runCommand('insertUnorderedList')}
              className={`${btnBase} btnInactive`} title="Bullet List">
              <List size={16} />
            </button>
            <button type="button" onClick={() => runCommand('insertOrderedList')}
              className={`${btnBase} btnInactive`} title="Numbered List">
              <ListOrdered size={16} />
            </button>

            <span className="w-px h-6 bg-[#2F2A26] mx-0.5 flex-shrink-0 hidden sm:block" />

            {/* Insert — hidden on very small screens to save space, visible sm+ */}
            <button type="button" onClick={() => { const url = prompt('Enter link URL:'); if (url) runCommand('createLink', url); }}
              className={`${btnBase} btnInactive hidden sm:flex`} title="Insert Link">
              <LinkIcon size={16} />
            </button>
            <button type="button" onClick={() => { const url = prompt('Enter image URL:'); if (url) runCommand('insertImage', url); }}
              className={`${btnBase} btnInactive hidden sm:flex`} title="Insert Image">
              <ImageIcon size={16} />
            </button>
            <button type="button" onClick={() => runCommand('insertHorizontalRule')}
              className={`${btnBase} btnInactive hidden sm:flex`} title="Horizontal Rule">
              <Minus size={16} />
            </button>
          </div>

          {/* Row 2 — Font family + Font size (always visible, no scrolling needed) */}
          <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2 sm:px-3 sm:pb-3">
            {/* Font family dropdown */}
            <select
              className="bg-[#0F0E0D] border border-[#2F2A26] text-gray-300 text-xs rounded-md px-2 py-1.5 flex-1 min-w-[120px] max-w-[200px]"
              onChange={(e) => {
                if (e.target.value) runCommand('fontName', e.target.value);
                e.target.value = '';
              }}
              defaultValue=""
              aria-label="Font style"
            >
              <option value="" disabled>Font Family</option>
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>

            {/* Font size — quick-pick buttons for common sizes + dropdown for more */}
            <div className="flex items-center gap-1" data-font-panel>
              {/* Quick-pick: most common sizes as tappable buttons */}
              <div className="flex items-center gap-0.5">
                {QUICK_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => applyFontSize(`${sz}pt`)}
                    className="px-1.5 py-1 text-[10px] sm:text-xs rounded text-gray-400 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors min-w-[28px] text-center"
                    title={`${sz}pt`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              {/* More sizes dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFontPanel(!showFontPanel)}
                  className="flex items-center gap-0.5 px-2 py-1 text-xs rounded-md border border-[#2F2A26] text-gray-400 hover:text-[#C5A059] hover:border-[#C5A059]/40 transition-colors"
                  title="More font sizes"
                >
                  <ChevronDown size={12} />
                </button>
                {showFontPanel && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[#171311] border border-[#2F2A26] rounded-lg shadow-xl py-1 max-h-48 overflow-y-auto min-w-[80px]">
                    {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => applyFontSize(`${sz}pt`)}
                        className="block w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
                      >
                        {sz} pt
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile-only: Insert buttons (Link, Image, HR) visible in row 2 on small screens */}
            <div className="flex items-center gap-0.5 sm:hidden ml-auto">
              <button type="button" onClick={() => { const url = prompt('Enter link URL:'); if (url) runCommand('createLink', url); }}
                className={`${btnBase} btnInactive`} title="Insert Link">
                <LinkIcon size={16} />
              </button>
              <button type="button" onClick={() => { const url = prompt('Enter image URL:'); if (url) runCommand('insertImage', url); }}
                className={`${btnBase} btnInactive`} title="Insert Image">
                <ImageIcon size={16} />
              </button>
              <button type="button" onClick={() => runCommand('insertHorizontalRule')}
                className={`${btnBase} btnInactive`} title="Horizontal Rule">
                <Minus size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          className={`rich-editor-content ${minHeightClassName} p-4 sm:p-6 text-white focus:outline-none text-base leading-relaxed`}
        />
      </div>

      <p className="text-xs text-gray-500">
        Select text and use the toolbar to format. Ctrl+Z to undo.
      </p>
    </div>
  );
}
