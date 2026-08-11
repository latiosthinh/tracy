import React, { useState, useEffect, useRef } from 'react';
import { VoiceInputButton } from '../ai/VoiceInputButton';
import { Code, Copy, Check, Play, FileCode, CheckCircle2, AlertTriangle, Sparkles, Bot, ChevronDown, Terminal, Cpu, Key, Globe, Server, Flame, Eye, Box, Tag } from 'lucide-react';
import { FlowCategory } from '../../types/autoflow';
import { PLAYWRIGHT_CATEGORIES } from '../../utils/flowUtils';

interface YamlEditorProps {
  yamlContent: string;
  onChange: (newContent: string) => void;
  onRunFlow?: () => void;
  isExecuting?: boolean;
  flowCategory?: FlowCategory;
  onCategoryChange?: (category: FlowCategory) => void;
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

export const YamlEditor: React.FC<YamlEditorProps> = ({
  yamlContent,
  onChange,
  onRunFlow,
  isExecuting,
  flowCategory = 'E2E',
  onCategoryChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codePreRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = yamlContent.split('\n');
    setLineCount(lines.length);

    // Basic YAML syntax validation check
    const errors: string[] = [];
    lines.forEach((line, idx) => {
      if (line.includes('\t')) {
        errors.push(`Line ${idx + 1}: Tab character detected (YAML requires spaces)`);
      }
    });
    setSyntaxErrors(errors);
  }, [yamlContent]);

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
            <span className="truncate">YAML Flow Definition</span>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-stone-400">
            {/* Active Category Status Pill */}
            <div className={`px-2 py-0.5 rounded-[4px] font-mono text-[10px] font-bold uppercase flex items-center space-x-1.5 border ${currentCatInfo.bgColor} ${currentCatInfo.textColor} ${currentCatInfo.borderColor}`}>
              {renderCategoryIcon(currentCatInfo.iconName, `w-3 h-3 ${currentCatInfo.textColor}`)}
              <span>{currentCatInfo.badgeLabel} SUITE</span>
            </div>

            <span className="px-2 py-0.5 rounded-[4px] bg-stone-950 border border-stone-800 font-mono">{lineCount} lines</span>
            {syntaxErrors.length === 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Valid Tracy YAML</span>
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{syntaxErrors.length} Warning</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-[6px] font-sans text-[11px] font-semibold flex items-center space-x-1.5 transition-all border border-stone-700 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
            <span>{copied ? 'Copied' : 'Copy YAML'}</span>
          </button>
        </div>
      </div>

      {/* Quick Snippet Insert Toolbar */}
      <div className="bg-stone-900/60 px-3 py-1.5 border-b border-stone-800/80 flex items-center space-x-2 overflow-x-auto text-[10px] font-sans text-stone-400 shrink-0">
        <span className="font-bold text-stone-300 flex items-center space-x-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Quick Snippets:</span>
        </span>
        <button
          onClick={() => handleInsertSnippet('- click: "Button Text"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0"
        >
          + click
        </button>
        <button
          onClick={() => handleInsertSnippet('- inputText:\n    selector:\n      placeholder: "Search..."\n    text: "Sample Text"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0"
        >
          + inputText
        </button>
        <button
          onClick={() => handleInsertSnippet('- assertVisible: "Success Message"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0"
        >
          + assertVisible
        </button>
        <button
          onClick={() => handleInsertSnippet('- selectOption:\n    selector: "#select-id"\n    value: "US"')}
          className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-[4px] border border-stone-700 font-mono shrink-0"
        >
          + selectOption
        </button>
        <VoiceInputButton
          onTranscript={(transcript) => {
            const text = transcript.trim();
            if (!text) return;
            let snippet = `- click: "${text}"`;
            if (/^(navigate|go to)\s+/i.test(text)) {
              snippet = `- navigate: "${text.replace(/^(navigate|go to)\s+/i, '')}"`;
            } else if (/^(type|fill|input)\s+/i.test(text)) {
              const parts = text.replace(/^(type|fill|input)\s+/i, '').split(/into|in/i);
              snippet = parts.length > 1
                ? `- inputText:\n    selector: "${parts[1].trim()}"\n    text: "${parts[0].trim()}"`
                : `- inputText: "${text}"`;
            } else if (/^(assert|verify|check)\s+/i.test(text)) {
              snippet = `- assertVisible: "${text.replace(/^(assert|verify|check)\s+/i, '')}"`;
            }
            handleInsertSnippet(snippet);
          }}
          size="sm"
          title="Dictate YAML test step e.g. 'click Submit', 'navigate to /checkout'"
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
            onChange={e => onChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent text-transparent caret-amber-400 font-mono text-xs leading-relaxed resize-none focus:outline-hidden selection:bg-amber-700/50 border-0 overflow-auto whitespace-pre"
            placeholder="# Write Tracy E2E Flow YAML here..."
          />
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
          <span className="text-stone-400">{lineCount} lines</span>
        </div>
      </div>
    </div>
  );
};

