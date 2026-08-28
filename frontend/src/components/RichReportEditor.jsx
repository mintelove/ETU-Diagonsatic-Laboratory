/**
 * ETU Diagnostic Laboratory — Rich Option A Report Editor
 *
 * Professional rich-text document editor for Pathologists and Radiologists.
 * Features:
 * - Word (.docx) file import with full formatting, tables, and embedded images
 * - Direct image paste from clipboard (Ctrl+V)
 * - Image file upload with multi-image support
 * - Image sizing controls (25%, 50%, 75%, 100%, Alignment, Delete)
 * - Custom font size, font family, color, headings, lists, tables, alignment
 * - Multi-page A4 print stylesheet preservation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import mammoth from 'mammoth';

const FONT_FAMILIES = [
  { label: 'Inter (Default)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Calibri', value: 'Calibri, Candara, Segoe, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' }
];

const FONT_SIZES = [
  { label: 'Small (11px)', value: '11px' },
  { label: 'Body (13px)', value: '13px' },
  { label: 'Medium (14px)', value: '14px' },
  { label: 'Large (16px)', value: '16px' },
  { label: 'Subheading (18px)', value: '18px' },
  { label: 'Heading 2 (20px)', value: '20px' },
  { label: 'Heading 1 (24px)', value: '24px' },
  { label: 'Title (28px)', value: '28px' }
];

export default function RichReportEditor({
  value = '',
  onChange,
  placeholder = 'Type report findings, paste from Microsoft Word, or upload a .docx document…'
}) {
  const editorRef = useRef(null);
  const fileInputDocxRef = useRef(null);
  const fileInputImageRef = useRef(null);

  const [selectedImg, setSelectedImg] = useState(null);
  const [imgToolbarPos, setImgToolbarPos] = useState({ top: 0, left: 0 });
  const [convertingDocx, setConvertingDocx] = useState(false);
  const [editorFont, setEditorFont] = useState('Inter, system-ui, sans-serif');
  const [editorSize, setEditorSize] = useState('14px');

  // Initialize editor content once or when value significantly changes from outside
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Execute standard formatting commands
  const execCmd = (command, val = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  // Custom font size injection using span with exact px
  const applyCustomFontSize = (sizePx) => {
    setEditorSize(sizePx);
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (selection.isCollapsed) {
      execCmd('fontSize', '3'); // fallback
      return;
    }

    const span = document.createElement('span');
    span.style.fontSize = sizePx;
    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      selection.selectAllChildren(span);
    } catch {
      execCmd('fontSize', '3');
    }
    handleInput();
  };

  // Custom font family injection
  const applyCustomFontFamily = (fontVal) => {
    setEditorFont(fontVal);
    editorRef.current?.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    if (selection.isCollapsed) {
      execCmd('fontName', fontVal);
      return;
    }

    const span = document.createElement('span');
    span.style.fontFamily = fontVal;
    try {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
      selection.selectAllChildren(span);
    } catch {
      execCmd('fontName', fontVal);
    }
    handleInput();
  };

  // Insert image at selection cursor
  const insertImageAtCursor = (dataUrl, alt = 'Diagnostic Figure') => {
    editorRef.current?.focus();
    const imgHtml = `<p style="margin: 10px 0; text-align: center;"><img src="${dataUrl}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.15); display: inline-block;" /></p><p><br></p>`;
    execCmd('insertHTML', imgHtml);
  };

  // Handle Clipboard Paste (preserves Word formatting and clipboard images)
  const handlePaste = (e) => {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData) return;

    // 1. Check for clipboard image file item (e.g. copied from Snipping Tool, Paint, Explorer, Browser)
    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              insertImageAtCursor(event.target.result, file.name || 'Pasted Image');
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }

    // 2. Check for Rich HTML (e.g. copied from Microsoft Word or Web)
    const html = clipboardData.getData('text/html');
    if (html && html.trim()) {
      // Let browser paste native HTML into contentEditable so font sizes, colors, and tables are preserved naturally
      setTimeout(() => {
        handleInput();
      }, 50);
      return;
    }

    // 3. Fallback: plain text
    const text = clipboardData.getData('text/plain');
    if (text) {
      e.preventDefault();
      const formatted = text.split('\n').map(p => `<p>${p ? p : '<br>'}</p>`).join('');
      execCmd('insertHTML', formatted);
    }
  };

  // Handle Image File Upload Button
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        insertImageAtCursor(event.target.result, file.name);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Handle .docx Document Upload via Mammoth
  const handleDocxUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConvertingDocx(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const options = {
        convertImage: mammoth.images.inline((element) => {
          return element.read('base64').then((imageBuffer) => {
            return {
              src: `data:${element.contentType};base64,${imageBuffer}`
            };
          });
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, options);
      const convertedHtml = result.value;

      if (editorRef.current) {
        // Append or replace
        editorRef.current.innerHTML = convertedHtml;
        handleInput();
      }
    } catch (err) {
      console.error('Failed to parse .docx document:', err);
      alert('Could not convert this Word document. Please ensure it is a valid .docx file.');
    } finally {
      setConvertingDocx(false);
      e.target.value = '';
    }
  };

  // Insert Table
  const handleInsertTable = (rows = 3, cols = 3) => {
    editorRef.current?.focus();
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px;" border="1">';
    tableHtml += '<thead><tr style="background: #f1f5f9;">';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left;">Header ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r <= rows; r++) {
      tableHtml += '<tr>';
      for (let c = 1; c <= cols; c++) {
        tableHtml += '<td style="padding: 8px 10px; border: 1px solid #cbd5e1;">&nbsp;</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';
    execCmd('insertHTML', tableHtml);
  };

  // Click on image inside editor to select and show size toolbar
  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      setSelectedImg(e.target);
      const rect = e.target.getBoundingClientRect();
      const editorRect = editorRef.current.getBoundingClientRect();
      setImgToolbarPos({
        top: rect.top - editorRect.top + editorRef.current.scrollTop - 42,
        left: Math.max(10, rect.left - editorRect.left + rect.width / 2 - 140)
      });
    } else {
      setSelectedImg(null);
    }
  };

  const handleResizeSelectedImg = (widthPercent) => {
    if (!selectedImg) return;
    selectedImg.style.width = widthPercent;
    selectedImg.style.maxWidth = '100%';
    selectedImg.style.height = 'auto';
    handleInput();
  };

  const handleAlignSelectedImg = (align) => {
    if (!selectedImg) return;
    const parent = selectedImg.parentElement;
    if (parent && (parent.tagName === 'P' || parent.tagName === 'DIV')) {
      parent.style.textAlign = align;
    }
    handleInput();
  };

  const handleDeleteSelectedImg = () => {
    if (!selectedImg) return;
    const parent = selectedImg.parentElement;
    selectedImg.remove();
    if (parent && parent.children.length === 0 && !parent.textContent.trim()) {
      parent.remove();
    }
    setSelectedImg(null);
    handleInput();
  };

  return (
    <div className="rich-report-editor-container" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#f8fafc', overflow: 'hidden' }}>
      {/* ── Toolbar Header ────────────────────────────────────────── */}
      <div className="rich-editor-toolbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        {/* Document & Image Actions */}
        <div style={{ display: 'flex', gap: '6px', marginRight: '6px' }}>
          <button
            type="button"
            className="filter-chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#0284c7', color: '#fff', fontWeight: 600, padding: '5px 12px', fontSize: '12px' }}
            onClick={() => fileInputDocxRef.current?.click()}
            title="Import Word .docx Document"
            disabled={convertingDocx}
          >
            <span>📄</span> {convertingDocx ? 'Importing…' : 'Upload Word (.docx)'}
          </button>
          <button
            type="button"
            className="filter-chip"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#0f766e', color: '#fff', fontWeight: 600, padding: '5px 12px', fontSize: '12px' }}
            onClick={() => fileInputImageRef.current?.click()}
            title="Insert JPG / PNG / WEBP Image"
          >
            <span>🖼️</span> Insert Image
          </button>

          <input
            ref={fileInputDocxRef}
            type="file"
            accept=".docx"
            style={{ display: 'none' }}
            onChange={handleDocxUpload}
          />
          <input
            ref={fileInputImageRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Font Family Selector */}
        <select
          value={editorFont}
          onChange={(e) => applyCustomFontFamily(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#334155' }}
        >
          {FONT_FAMILIES.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Font Size Selector */}
        <select
          value={editorSize}
          onChange={(e) => applyCustomFontSize(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#334155' }}
        >
          {FONT_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Basic Text Formatting */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            type="button"
            onClick={() => execCmd('bold')}
            style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontWeight: 800, cursor: 'pointer' }}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontStyle: 'italic', fontWeight: 600, cursor: 'pointer' }}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
            title="Underline (Ctrl+U)"
          >
            U
          </button>
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Headings */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h1>')}
            style={{ padding: '2px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h2>')}
            style={{ padding: '2px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<p>')}
            style={{ padding: '2px 7px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '11px', cursor: 'pointer' }}
            title="Normal Paragraph"
          >
            P
          </button>
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Text Alignment */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button type="button" onClick={() => execCmd('justifyLeft')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Align Left">⫷</button>
          <button type="button" onClick={() => execCmd('justifyCenter')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Align Center">≡</button>
          <button type="button" onClick={() => execCmd('justifyRight')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Align Right">⫸</button>
          <button type="button" onClick={() => execCmd('justifyFull')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Justify">☵</button>
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Lists & Table */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button type="button" onClick={() => execCmd('insertUnorderedList')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Bullet List">• ≡</button>
          <button type="button" onClick={() => execCmd('insertOrderedList')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Numbered List">1. ≡</button>
          <button type="button" onClick={() => handleInsertTable(3, 3)} style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }} title="Insert 3x3 Table">
            ▦ Table
          </button>
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1', margin: '0 4px' }} />

        {/* Clear formatting & Undo */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button type="button" onClick={() => execCmd('undo')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Undo">↶</button>
          <button type="button" onClick={() => execCmd('redo')} style={{ width: '28px', height: '28px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: 'pointer' }} title="Redo">↷</button>
          <button type="button" onClick={() => execCmd('removeFormat')} style={{ padding: '2px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', fontSize: '11px', color: '#64748b', cursor: 'pointer' }} title="Clear Formatting">
            🧹 Clear
          </button>
        </div>
      </div>

      {/* ── Document Page Container (A4 Page Canvas) ────────────────── */}
      <div style={{ padding: '16px', overflowY: 'auto', maxHeight: '520px', position: 'relative', background: '#e2e8f0', display: 'flex', justifyContent: 'center' }}>
        {/* Floating Image Mini-Toolbar */}
        {selectedImg && (
          <div
            style={{
              position: 'absolute',
              top: `${imgToolbarPos.top}px`,
              left: `${imgToolbarPos.left}px`,
              zIndex: 50,
              background: '#1e293b',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
              fontSize: '11px'
            }}
          >
            <span style={{ fontWeight: 600, color: '#94a3b8' }}>Size:</span>
            <button type="button" onClick={() => handleResizeSelectedImg('25%')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>25%</button>
            <button type="button" onClick={() => handleResizeSelectedImg('50%')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>50%</button>
            <button type="button" onClick={() => handleResizeSelectedImg('75%')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>75%</button>
            <button type="button" onClick={() => handleResizeSelectedImg('100%')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>100%</button>
            <span style={{ color: '#475569' }}>|</span>
            <button type="button" onClick={() => handleAlignSelectedImg('left')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Left</button>
            <button type="button" onClick={() => handleAlignSelectedImg('center')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Center</button>
            <button type="button" onClick={() => handleAlignSelectedImg('right')} style={{ padding: '2px 6px', background: '#334155', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Right</button>
            <span style={{ color: '#475569' }}>|</span>
            <button type="button" onClick={handleDeleteSelectedImg} style={{ padding: '2px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>🗑️ Delete</button>
          </div>
        )}

        {/* Editable A4 Sheet */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onClick={handleEditorClick}
          style={{
            width: '100%',
            maxWidth: '794px', // A4 printable width representation
            minHeight: '440px',
            background: '#ffffff',
            padding: '24px 28px',
            borderRadius: '6px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            fontFamily: editorFont,
            fontSize: editorSize,
            lineHeight: '1.6',
            color: '#0f172a',
            outline: 'none',
            wordBreak: 'break-word'
          }}
          data-placeholder={placeholder}
        />
      </div>

      {/* Helper Footer Bar */}
      <div style={{ padding: '6px 14px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b' }}>
        <span>💡 <strong>Ctrl+V</strong> pastes formatted Word text and full-resolution images. Click any image to resize.</span>
        <span>A4 Multi-Page Compatible</span>
      </div>
    </div>
  );
}
