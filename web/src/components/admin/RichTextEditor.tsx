'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Pilcrow,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Type,
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

// Microsoft Word-style font sizes in points
const SIZE_OPTIONS = [
  { label: '8', value: '8pt' },
  { label: '9', value: '9pt' },
  { label: '10', value: '10pt' },
  { label: '11', value: '11pt' },
  { label: '12', value: '12pt' },
  { label: '14', value: '14pt' },
  { label: '16', value: '16pt' },
  { label: '18', value: '18pt' },
  { label: '20', value: '20pt' },
  { label: '24', value: '24pt' },
  { label: '28', value: '28pt' },
  { label: '32', value: '32pt' },
  { label: '36', value: '36pt' },
  { label: '48', value: '48pt' },
  { label: '72', value: '72pt' },
] as const;

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

  // Push state to history stack
  const pushHistory = useCallback((html: string) => {
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    // Remove any future states if we're not at the end
    if (idx < stack.length - 1) {
      historyRef.current = stack.slice(0, idx + 1);
    }
    // Push new state
    historyRef.current.push(html);
    // Trim if too long
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
      // Reset history when value changes externally
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

      // Detect block format
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
    // Re-check formats after command
    setTimeout(checkActiveFormats, 0);
  }, [onChange, pushHistory, checkActiveFormats]);

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

  const onInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    pushHistory(html);
    onChange(html);
  }, [onChange, pushHistory]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd+Z → undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
      return;
    }
    // Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y → redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      handleRedo();
      return;
    }
  }, [handleUndo, handleRedo]);

  const btnBase = 'p-2 rounded-md transition-colors flex-shrink-0';
  const btnInactive = 'text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50';
  const btnActive = 'text-[#C5A059] bg-[#C5A059]/15 ring-1 ring-[#C5A059]/30';

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">{label}</label>

      <div className="border border-[#2F2A26] rounded-xl overflow-hidden bg-[#0F0E0D]">
        {/* Toolbar — horizontally scrollable on mobile */}
        <div className="flex flex-nowrap items-center gap-0.5 p-2 sm:p-3 border-b border-[#2F2A26] bg-[#171311] overflow-x-auto scrollbar-hide">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className={`${btnBase} ${canUndo ? btnInactive : 'text-gray-600 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className={`${btnBase} ${canRedo ? btnInactive : 'text-gray-600 cursor-not-allowed'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1 flex-shrink-0" />

          {/* Text formatting */}
          <button
            type="button"
            onClick={() => runCommand('bold')}
            className={`${btnBase} ${activeFormats.bold ? btnActive : btnInactive}`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('italic')}
            className={`${btnBase} ${activeFormats.italic ? btnActive : btnInactive}`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('underline')}
            className={`${btnBase} ${activeFormats.underline ? btnActive : btnInactive}`}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1 flex-shrink-0" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'H1')}
            className={`${btnBase} ${activeBlock === 'H1' ? btnActive : btnInactive}`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'H2')}
            className={`${btnBase} ${activeBlock === 'H2' ? btnActive : btnInactive}`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'P')}
            className={`${btnBase} ${activeBlock === 'P' ? btnActive : btnInactive}`}
            title="Paragraph"
          >
            <Pilcrow size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'BLOCKQUOTE')}
            className={`${btnBase} ${activeBlock === 'BLOCKQUOTE' ? btnActive : btnInactive}`}
            title="Blockquote"
          >
            <Quote size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1 flex-shrink-0" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => runCommand('insertUnorderedList')}
            className={`${btnBase} btnInactive`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('insertOrderedList')}
            className={`${btnBase} btnInactive`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1 flex-shrink-0" />

          {/* Insert */}
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) runCommand('createLink', url);
            }}
            className={`${btnBase} btnInactive`}
            title="Insert Link"
          >
            <LinkIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter image URL:');
              if (url) runCommand('insertImage', url);
            }}
            className={`${btnBase} btnInactive`}
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('insertHorizontalRule')}
            className={`${btnBase} btnInactive`}
            title="Horizontal Rule"
          >
            <Minus size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1 flex-shrink-0" />

          {/* Font options */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Type size={12} className="text-gray-500" />
            <select
              className="bg-[#0F0E0D] border border-[#2F2A26] text-gray-300 text-xs rounded-md px-1.5 py-1.5 max-w-[110px]"
              onChange={(e) => {
                if (e.target.value) runCommand('fontName', e.target.value);
                e.target.value = '';
              }}
              defaultValue=""
              aria-label="Font style"
            >
              <option value="" disabled>Font</option>
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {/* Font size — Word-style point sizes */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <select
              className="bg-[#0F0E0D] border border-[#2F2A26] text-gray-300 text-xs rounded-md px-1.5 py-1.5 max-w-[70px]"
              onChange={(e) => {
                if (e.target.value) {
                  // Use fontSize with a custom mapping via execCommand + span styling
                  const size = e.target.value;
                  runCommand('fontSize', '7'); // Use size 7 as placeholder
                  // Then replace font[size=7] with a styled span
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
                }
                e.target.value = '';
              }}
              defaultValue=""
              aria-label="Font size"
            >
              <option value="" disabled>Size</option>
              {SIZE_OPTIONS.map((size) => (
                <option key={size.value} value={size.value}>{size.label} pt</option>
              ))}
            </select>
          </div>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={handleKeyDown}
          className={`rich-editor-content ${minHeightClassName} p-4 sm:p-6 text-white focus:outline-none text-base leading-relaxed`}
        />
      </div>

      <p className="text-xs text-gray-500">
        Use the toolbar for formatting. Select text and click bold, italic, or use headings and lists for structure. Ctrl+Z to undo.
      </p>
    </div>
  );
}
