import React, { useState, useEffect, useRef } from 'react';
import { VoiceInputButton } from '@/src/components/ai/VoiceInputButton';
import { YamlDiffModal } from '@/src/components/editor/YamlDiffModal';
import { PlaywrightExportModal } from '@/src/components/editor/PlaywrightExportModal';
import {
  Copy,
  Check,
  FileCode,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Globe,
  Server,
  Flame,
  Eye,
  Box,
  Tag,
  Zap,
  GitCompare
} from 'lucide-react';
import { FlowCategory, FlowFile } from '@/src/types/autoflow';
import { PLAYWRIGHT_CATEGORIES } from '@/src/utils/flowUtils';
import { useTranslation } from '@/src/hooks/useTranslation';

interface YamlEditorProps {
  yamlContent: string;
  onChange: (newContent: string) => void;
  onRunFlow?: () => void;
  isExecuting?: boolean;
  flowCategory?: FlowCategory;
  onCategoryChange?: (category: FlowCategory) => void;
  savedBaselineYaml?: string;
  flow?: FlowFile;
  targetUrl?: string;
}

// Helper to escape HTML characters
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Format values after key-colon
const formatYamlValue = (val: string): string => {
  if (!val) return '';

  const trimmed = val.trim();
  const leadingSpaces = val.match(/^\s*/)?.[0] || '';

  // Quoted string "..." or '...'
  if (/^".*"$/.test(trimmed) || /^'.*'$/.test(trimmed)) {
    return `${leadingSpaces}<span class="text-emerald-300 font-medium">${escapeHtml(trimmed)}</span>`;
  }

  // Boolean or null
  if (/^(true|false|null|TRUE|FALSE|NULL)$/.test(trimmed)) {
    return `${leadingSpaces}<span class="text-rose-400 font-bold">${escapeHtml(trimmed)}</span>`;
  }

  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${leadingSpaces}<span class="text-orange-300 font-mono font-semibold">${escapeHtml(trimmed)}</span>`;
  }

  // Variables ${VAR}
  if (trimmed.includes('${')) {
    const escaped = escapeHtml(trimmed).replace(/(\$\{[^}]+\})/g, '<span class="text-purple-300 font-bold">$1</span>');
    return `${leadingSpaces}${escaped}`;
  }

  // URLs
  if (/^https?:\/\//.test(trimmed)) {
    return `${leadingSpaces}<span class="text-sky-200 underline decoration-sky-500/40">${escapeHtml(trimmed)}</span>`;
  }

  // Fallback string / value
  return `${leadingSpaces}<span class="text-stone-200">${escapeHtml(trimmed)}</span>`;
};

// Format YAML key based on action/root domain
const formatYamlKey = (key: string): string => {
  const lower = key.toLowerCase();
  const escapedKey = escapeHtml(key);

  // Root level flow keys
  if (['id', 'name', 'url', 'env', 'tags', 'metadata', 'version', 'steps'].includes(lower)) {
    return `<span class="text-amber-300 font-bold">${escapedKey}</span>`;
  }

  // Tracy Action Commands
  if ([
    'navigate', 'click', 'inputtext', 'assertvisible', 'asserttext', 'asserttitle',
    'selectoption', 'takescreenshot', 'scroll', 'wait', 'hover', 'presskey',
    'mockapi', 'setviewport'
  ].includes(lower)) {
    return `<span class="text-cyan-300 font-bold">${escapedKey}</span>`;
  }

  // Sub-properties & Selectors
  if ([
    'selector', 'value', 'text', 'label', 'placeholder', 'role', 'testid',
    'timeout', 'targeturl', 'width', 'height'
  ].includes(lower)) {
    return `<span class="text-sky-300 font-semibold">${escapedKey}</span>`;
  }

  return `<span class="text-amber-100 font-medium">${escapedKey}</span>`;
};

// Advanced Single-Pass Line Tokenizer for YAML
const highlightYamlCode = (code: string): string => {
  if (!code) return '';

  const lines = code.split('\n');
  return lines
    .map(line => {
      if (!line) return '';

      // Preserve leading indentation
      const indentMatch = line.match(/^\s*/);
      const indent = indentMatch ? escapeHtml(indentMatch[0]) : '';
      let rest = line.slice(indent.length);

      // Extract inline or full-line comments (# ...)
      let commentPart = '';
      const commentIdx = rest.indexOf('#');
      if (commentIdx !== -1) {
        if (commentIdx === 0 || /\s/.test(rest[commentIdx - 1])) {
          commentPart = `<span class="text-stone-500 italic font-normal">${escapeHtml(rest.slice(commentIdx))}</span>`;
          rest = rest.slice(0, commentIdx);
        }
      }

      // If line is empty or purely a comment
      if (!rest.trim()) {
        return `${indent}${commentPart}`;
      }

      // Check for Document Separators (--- or ...)
      if (rest.trim() === '---' || rest.trim() === '...') {
        return `${indent}<span class="text-amber-500 font-bold">${escapeHtml(rest.trim())}</span>${commentPart ? ' ' + commentPart : ''}`;
      }

      let lineHtml = '';

      // Check for bullet items (- step)
      if (rest.startsWith('- ')) {
        lineHtml += '<span class="text-amber-400 font-bold">- </span>';
        rest = rest.slice(2);
      } else if (rest === '-') {
        lineHtml += '<span class="text-amber-400 font-bold">-</span>';
        rest = '';
      }

      // Match key: value
      const keyColonMatch = rest.match(/^([a-zA-Z0-9_$-]+)\s*:/);
      if (keyColonMatch) {
        const key = keyColonMatch[1];
        const afterColon = rest.slice(keyColonMatch[0].length);
        lineHtml += formatYamlKey(key) + '<span class="text-amber-500/80 font-bold">:</span>' + formatYamlValue(afterColon);
      } else if (rest.length > 0) {
        lineHtml += formatYamlValue(rest);
      }

      return `${indent}${lineHtml}${commentPart ? ' ' + commentPart : ''}`;
    })
    .join('\n');
};

const AUTOCOMPLETE_OPTIONS = [
  'navigate', 'leftClick', 'rightClick', 'doubleClick', 'hover', 'tap', 
  'twoFingersTap', 'fill', 'press', 'eraseText', 'scroll', 'waitFor',
  'assertVisible', 'assertNotVisible', 'selectOption', 'interceptNetwork', 
  'copyTextFrom'
];

const AUTOCOMPLETE_ATTRIBUTES = [
  'selector', 'text', 'value', 'role', 'name', 'testId', 'placeholder', 
  'label', 'method', 'response', 'status', 'body', 'url', 'args', 'output', 'state'
];

export const YamlEditor: React.FC<YamlEditorProps> = ({
  yamlContent,
  onChange,
  onRunFlow: _onRunFlow,
  isExecuting: _isExecuting,
  flowCategory = 'E2E',
  onCategoryChange: _onCategoryChange,
  savedBaselineYaml,
  flow,
  targetUrl,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const baseline = savedBaselineYaml ?? yamlContent;
  const hasDiff = baseline !== yamlContent;

  const [autocomplete, setAutocomplete] = useState<{
    show: boolean;
    x: number;
    y: number;
    filter: string;
    options: string[];
    selectedIndex: number;
  }>({ show: false, x: 0, y: 0, filter: '', options: [], selectedIndex: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codePreRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const autocompleteListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (autocomplete.show && autocompleteListRef.current) {
      const list = autocompleteListRef.current;
      const selected = list.children[autocomplete.selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [autocomplete.selectedIndex, autocomplete.show]);

  useEffect(() => {
    const lines = yamlContent.split('\n');
    setLineCount(lines.length);

    // Basic YAML syntax validation check
    const errors: string[] = [];
    lines.forEach((line, idx) => {
      if (line.includes('\t')) {
        errors.push(t('editor.tabCharWarning', { line: idx + 1 }));
      }
    });
    setSyntaxErrors(errors);
  }, [yamlContent, t]);

  const triggerAutocomplete = (textarea: HTMLTextAreaElement, manualFilter?: string) => {
    const { selectionStart } = textarea;
    const textBeforeCursor = textarea.value.slice(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const row = lines.length - 1;
    const currentLine = lines[row];
    const col = currentLine.length;
    
    let filterStr = manualFilter;
    if (filterStr === undefined) {
      const match = currentLine.match(/([a-zA-Z0-9_-]+)$/);
      filterStr = match ? match[1] : '';
    }
    
    // Approximate coordinates: padding 12px. xs font = 12px, char ~7.2px width, line ~19.5px
    const x = 12 + col * 7.2 - textarea.scrollLeft;
    const y = 12 + (row + 1) * 19.5 - textarea.scrollTop;
    
    let optionsToUse = AUTOCOMPLETE_OPTIONS;
    if (/^\s+/.test(currentLine) && !/^\s*-\s/.test(currentLine)) {
      optionsToUse = AUTOCOMPLETE_ATTRIBUTES;
    }
    
    let filtered = optionsToUse;
    if (filterStr) {
      filtered = optionsToUse.filter(o => o.toLowerCase().startsWith(filterStr.toLowerCase()));
    }
    
    if (filtered.length > 0) {
      setAutocomplete({ show: true, x, y, filter: filterStr, options: filtered, selectedIndex: 0 });
    } else {
      setAutocomplete(p => ({ ...p, show: false }));
    }
  };

  const applyAutocomplete = (selected: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const { selectionStart, value } = textarea;
    
    const textAfterCursor = value.slice(selectionStart);
    // filter length is the typed prefix we need to replace
    const replaceStart = selectionStart - autocomplete.filter.length;
    
    const newValue = value.slice(0, replaceStart) + selected + ':' + textAfterCursor;
    onChange(newValue);
    setAutocomplete(p => ({ ...p, show: false }));
    
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = replaceStart + selected.length + 1;
      textarea.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      triggerAutocomplete(e.currentTarget);
      return;
    }
    
    if (autocomplete.show) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(p => ({ ...p, selectedIndex: (p.selectedIndex + 1) % p.options.length }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(p => ({ ...p, selectedIndex: (p.selectedIndex - 1 + p.options.length) % p.options.length }));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyAutocomplete(autocomplete.options[autocomplete.selectedIndex]);
      } else if (e.key === 'Escape') {
        setAutocomplete(p => ({ ...p, show: false }));
      }
    } else {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;
        const newValue = value.slice(0, selectionStart) + '  ' + value.slice(selectionEnd);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
        }, 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const { selectionStart, selectionEnd, value } = textarea;
        const textBefore = value.slice(0, selectionStart);
        const textAfter = value.slice(selectionEnd);
        const lines = textBefore.split('\n');
        const currentLine = lines[lines.length - 1];

        // If current line is just "- " (empty step) and user hits Enter, cancel the step and go to new line
        if (currentLine === '- ') {
          const newBefore = textBefore.slice(0, -2);
          onChange(newBefore + '\n' + textAfter);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
          }, 0);
          return;
        }
        
        let insertText = '\n';
        if (currentLine.trim().endsWith(':')) {
          const indentMatch = currentLine.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          if (currentLine.trim().startsWith('-')) {
              insertText = '\n' + indent + '    ';
          } else {
              insertText = '\n' + indent + '  ';
          }
        } else if (currentLine.match(/^\s*- /)) {
          const indentMatch = currentLine.match(/^(\s*)- /);
          const indent = indentMatch ? indentMatch[1] : '';
          insertText = '\n' + indent + '- ';
        } else {
          const indentMatch = currentLine.match(/^(\s+)/);
          if (indentMatch) {
              insertText = '\n' + indentMatch[1];
          }
        }
        
        const newValue = textBefore + insertText + textAfter;
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
        }, 0);
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    
    const textBeforeCursor = val.slice(0, e.target.selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    if (autocomplete.show) {
      const match = currentLine.match(/([a-zA-Z0-9_-]+)$/);
      if (match || currentLine.match(/-\s*$/)) {
        triggerAutocomplete(e.target, match ? match[1] : '');
      } else {
        setAutocomplete(p => ({ ...p, show: false }));
      }
    } else {
      if (currentLine.match(/-\s+[a-zA-Z]*$/) || currentLine.match(/^\s+[a-zA-Z]+$/)) {
        triggerAutocomplete(e.target);
      }
    }
  };

  // Synchronize scrolling between textarea, highlighted code pre, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (codePreRef.current) {
        codePreRef.current.scrollTop = scrollTop;
        codePreRef.current.scrollLeft = scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(yamlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    onChange(yamlContent + '\n' + snippet);
  };

  const renderCategoryIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case 'Globe': return <Globe className={className} />;
      case 'Server': return <Server className={className} />;
      case 'Flame': return <Flame className={className} />;
      case 'Eye': return <Eye className={className} />;
      case 'Box': return <Box className={className} />;
      default: return <Tag className={className} />;
    }
  };

  const currentCatInfo = PLAYWRIGHT_CATEGORIES.find(c => c.id === flowCategory) || PLAYWRIGHT_CATEGORIES[0];
  const highlightedHtml = highlightYamlCode(yamlContent);

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 font-mono text-xs rounded-[6px] border border-stone-800 overflow-hidden shadow-inner">
      {/* Editor Main Header Toolbar */}
      <div className="bg-stone-900 px-3.5 py-2 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 text-amber-400 font-bold font-sans text-xs">
            <FileCode className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('editor.yamlFlowDef')}</span>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-stone-400">
            {/* Active Category Status Pill */}
            <div className={`px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase flex items-center space-x-1.5 border ${currentCatInfo.bgColor} ${currentCatInfo.textColor} ${currentCatInfo.borderColor}`}>
              {renderCategoryIcon(currentCatInfo.iconName, `w-3 h-3 ${currentCatInfo.textColor}`)}
              <span>{currentCatInfo.badgeLabel} {t('editor.suiteSuffix')}</span>
            </div>

            <span className="px-2 py-0.5 rounded-[4px] bg-stone-950 border border-stone-800 font-mono">
              {t('editor.linesCount', { count: lineCount })}
            </span>
            {syntaxErrors.length === 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('editor.validYaml')}</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {syntaxErrors.length === 1
                    ? t('editor.warningCount', { count: syntaxErrors.length })
                    : t('editor.warningsCount', { count: syntaxErrors.length })}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowExportModal(true)}
            title={t('editor.exportPlaywright')}
            aria-label={t('editor.exportPlaywright')}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 rounded-[6px] font-sans text-[11px] font-semibold flex items-center space-x-1.5 transition-all border border-stone-700 shadow-xs cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('editor.exportPlaywright')}</span>
          </button>
          {hasDiff && (
            <button
              onClick={() => setShowDiffModal(true)}
              title={t('diff.viewDiff')}
              aria-label={t('diff.viewDiff')}
              className="px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 rounded-[6px] font-sans text-[11px] font-semibold flex items-center space-x-1.5 transition-all border border-amber-700/60 shadow-xs cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('diff.viewDiff')}</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[6px] font-sans text-[11px] font-semibold flex items-center space-x-1.5 transition-all border border-stone-700 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
            <span>{copied ? t('editor.copied') : t('editor.copyYaml')}</span>
          </button>
        </div>
      </div>

      {/* Quick Snippet Insert Toolbar */}
      <div className="bg-stone-900/60 px-3 py-1.5 border-b border-stone-800/80 flex items-center space-x-2 overflow-x-auto text-[10px] font-sans text-stone-400 shrink-0">
        <span className="font-bold text-stone-300 flex items-center space-x-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{t('editor.quickSnippets')}</span>
        </span>
        <button
          onClick={() => handleInsertSnippet('- leftClick: "Button Text"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0 cursor-pointer"
        >
          + leftClick
        </button>
        <button
          onClick={() => handleInsertSnippet('- fill:\n    selector:\n      placeholder: "Search..."\n    text: "Sample Text"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0 cursor-pointer"
        >
          + fill
        </button>
        <button
          onClick={() => handleInsertSnippet('- assertVisible: "Success Message"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0 cursor-pointer"
        >
          + assertVisible
        </button>
        <button
          onClick={() => handleInsertSnippet('- selectOption:\n    selector: "#select-id"\n    value: "US"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0 cursor-pointer"
        >
          + selectOption
        </button>
        <VoiceInputButton
          onTranscript={(transcript) => {
            const text = transcript.trim();
            if (!text) return;
            let snippet = `- leftClick: "${text}"`;
            if (/^(navigate|go to)\s+/i.test(text)) {
              snippet = `- navigate: "${text.replace(/^(navigate|go to)\s+/i, '')}"`;
            } else if (/^(type|fill|input)\s+/i.test(text)) {
              const parts = text.replace(/^(type|fill|input)\s+/i, '').split(/into|in/i);
              snippet = parts.length > 1
                ? `- fill:\n    selector: "${parts[1].trim()}"\n    text: "${parts[0].trim()}"`
                : `- fill: "${text}"`;
            } else if (/^(assert|verify|check)\s+/i.test(text)) {
              snippet = `- assertVisible: "${text.replace(/^(assert|verify|check)\s+/i, '')}"`;
            }
            handleInsertSnippet(snippet);
          }}
          size="sm"
          title={t('editor.dictateSnippetTitle')}
        />
      </div>

      {/* Syntax Error Warning Banner */}
      {syntaxErrors.length > 0 && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 text-amber-300 px-3 py-1.5 text-[11px] font-sans">
          {syntaxErrors.map((err, idx) => (
            <p key={idx}>{err}</p>
          ))}
        </div>
      )}

      {/* Synchronized Syntax Highlighting Editor Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-10 bg-stone-950 py-3 text-right pr-2 select-none text-stone-600 font-mono text-xs border-r border-stone-900 leading-relaxed overflow-hidden shrink-0"
        >
          {Array.from({ length: Math.max(lineCount, 1) }).map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Dual Layer Editor Container */}
        <div className="flex-1 relative overflow-hidden bg-stone-950">
          {/* Layer 1: Syntax Highlighted Preview Layer */}
          <pre
            ref={codePreRef}
            aria-hidden="true"
            className="absolute inset-0 p-3 m-0 font-mono text-xs leading-relaxed whitespace-pre overflow-auto pointer-events-none text-stone-200 select-none border-0"
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
          />

          {/* Layer 2: Editable Transparent Textarea */}
          <textarea
            ref={textareaRef}
            value={yamlContent}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-amber-400 font-mono text-xs leading-relaxed resize-none focus:outline-hidden selection:bg-amber-700/50 border-0 overflow-auto whitespace-pre"
            placeholder={t('editor.editorPlaceholder')}
          />
          {/* Autocomplete Menu */}
          {autocomplete.show && (
              <ul
                ref={autocompleteListRef}
                role="listbox"
                aria-label={t('editor.autocompleteAria')}
                className="absolute z-50 bg-stone-900 border border-stone-700 rounded-lg shadow-2xl py-1.5 text-[11px] font-mono w-64 max-h-56 overflow-y-auto"
                style={{ top: autocomplete.y, left: autocomplete.x }}
              >
                {autocomplete.options.map((option, idx) => {
                  const isAction = !AUTOCOMPLETE_ATTRIBUTES.includes(option);
                  const isSelected = idx === autocomplete.selectedIndex;
                  return (
                    <li
                      key={option}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyAutocomplete(option);
                      }}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between group transition-colors ${
                        isSelected 
                          ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-100' 
                          : 'border-l-2 border-transparent text-stone-400 hover:bg-stone-800/80 hover:text-stone-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {isAction ? (
                          <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-stone-500 group-hover:text-amber-500/70'}`} />
                        ) : (
                          <Tag className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-stone-500 group-hover:text-cyan-500/70'}`} />
                        )}
                        <span className={`font-semibold ${isSelected ? (isAction ? 'text-amber-300' : 'text-cyan-300') : ''}`}>
                          {option}
                        </span>
                      </div>
                      <span className={`text-[10px] truncate ml-2 ${isSelected ? 'text-stone-400' : 'text-stone-600'}`}>
                        {t(`editor.autocomplete.${option}` as any) || ''}
                      </span>
                    </li>
                  );
                })}
              </ul>
          )}
        </div>
      </div>

      {/* Footer Bar */}
      <div className="bg-stone-900 border-t border-stone-800 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] text-stone-400 font-mono shrink-0">
        <div className="flex items-center space-x-2 truncate">
          <span className="flex items-center space-x-1.5 text-stone-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>UTF-8</span>
          </span>
          <span className="text-stone-700">•</span>
          <span className="text-stone-400 font-bold">YAML</span>
          <span className="text-stone-700">•</span>
          <span className="text-stone-400">{t('editor.linesCount', { count: lineCount })}</span>
        </div>
      </div>

      {/* Diff Modal */}
      {showDiffModal && (
        <YamlDiffModal
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          originalYaml={baseline}
          modifiedYaml={yamlContent}
          onRevert={() => onChange(baseline)}
        />
      )}

      {/* Playwright Export Modal */}
      {showExportModal && (
        <PlaywrightExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          flow={
            flow || {
              id: 'exported-flow',
              name: 'flow.yaml',
              path: 'flows/flow.yaml',
              tags: [],
              metadata: { url: targetUrl },
              yamlContent,
              steps: [],
            }
          }
          targetUrl={targetUrl}
        />
      )}
    </div>
  );
};

