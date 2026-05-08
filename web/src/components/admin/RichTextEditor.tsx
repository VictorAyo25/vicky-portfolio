'use client';

import { useEffect, useRef, useCallback } from 'react';
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
] as const;

const SIZE_OPTIONS = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Medium', value: '4' },
  { label: 'Large', value: '5' },
  { label: 'XL', value: '6' },
] as const;

export default function RichTextEditor({
  label = 'Content',
  value,
  onChange,
  minHeightClassName = 'min-h-[320px]',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value to editor
  useEffect(() => {
    if (!editorRef.current) return;
    // Only update if the value actually changed externally
    const currentHtml = editorRef.current.innerHTML;
    if (currentHtml !== value && !isInternalChange.current) {
      editorRef.current.innerHTML = value || '';
    }
    isInternalChange.current = false;
  }, [value]);

  const runCommand = useCallback((command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const onInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Enter key: ensure we create a <p> not a <div> or <br>
    if (e.key === 'Enter') {
      // Let the browser handle it naturally — contentEditable with proper CSS handles paragraphs
    }
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">{label}</label>

      <div className="border border-[#2F2A26] rounded-xl overflow-hidden bg-[#0F0E0D]">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-3 border-b border-[#2F2A26] bg-[#171311]">
          {/* Text formatting */}
          <button
            type="button"
            onClick={() => runCommand('bold')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('italic')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('underline')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'H1')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'H2')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'P')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Paragraph"
          >
            <Pilcrow size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('formatBlock', 'BLOCKQUOTE')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Blockquote"
          >
            <Quote size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => runCommand('insertUnorderedList')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('insertOrderedList')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1" />

          {/* Insert */}
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter link URL:');
              if (url) runCommand('createLink', url);
            }}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
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
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand('insertHorizontalRule')}
            className="p-2 rounded-md text-gray-300 hover:text-[#C5A059] hover:bg-[#2F2A26]/50 transition-colors"
            title="Horizontal Rule"
          >
            <Minus size={16} />
          </button>

          <span className="w-px h-6 bg-[#2F2A26] mx-1" />

          {/* Font options */}
          <select
            className="bg-[#0F0E0D] border border-[#2F2A26] text-gray-300 text-xs rounded-md px-2 py-1.5"
            onChange={(e) => runCommand('fontName', e.target.value)}
            defaultValue=""
            aria-label="Font style"
          >
            <option value="" disabled>
              Font
            </option>
            {FONT_OPTIONS.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          <select
            className="bg-[#0F0E0D] border border-[#2F2A26] text-gray-300 text-xs rounded-md px-2 py-1.5"
            onChange={(e) => runCommand('fontSize', e.target.value)}
            defaultValue=""
            aria-label="Font size"
          >
            <option value="" disabled>
              Size
            </option>
            {SIZE_OPTIONS.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Editor area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={handleKeyDown}
          className={`rich-editor-content ${minHeightClassName} p-6 text-white focus:outline-none`}
        />
      </div>

      <p className="text-xs text-gray-500">
        Use the toolbar for formatting. Select text and click bold, italic, or use headings and lists for structure.
      </p>
    </div>
  );
}
