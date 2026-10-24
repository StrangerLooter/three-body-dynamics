import React, { useState } from 'react';

/**
 * Clean CodeBlock with language badge and one-click copy button
 */
export function CodeBlock({ code, language = 'text' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 rounded-xs border border-[#29292D] bg-[#0B0B0C] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#18181B] border-b border-[#29292D] text-[#929298] font-mono text-[10px]">
        <span className="uppercase tracking-wider">{language || 'CODE'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-[#F2F2F3] text-[10px] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-xs bg-[#121214] border border-[#29292D]"
          title="Copy code to clipboard"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[#F2F2F3] font-mono text-[11px] leading-relaxed custom-scrollbar">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Formats mathematical notations:
 * Converts LaTeX-like symbols (\Delta, \lambda, \sum, \approx, \sqrt, ^2, etc.)
 * into clean unicode representations for readability.
 */
function cleanMathSymbols(text) {
  if (!text) return '';
  return text
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\sum/g, '∑')
    .replace(/\\nabla/g, '∇')
    .replace(/\\approx/g, '≈')
    .replace(/\\le(q)?/g, '≤')
    .replace(/\\ge(q)?/g, '≥')
    .replace(/\\ne(q)?/g, '≠')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\infty/g, '∞')
    .replace(/\\partial/g, '∂')
    .replace(/\\int/g, '∫')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\vec\{([^}]+)\}/g, 'vec($1)');
}

/**
 * Lightweight, robust markdown and equation renderer
 * Handles code blocks, display math, headers, lists, inline code/math, and bolding
 */
export function FormattedMessage({ content }) {
  if (!content) return null;

  // Split text by code blocks (```lang ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'code',
      value: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  return (
    <div className="space-y-2 text-[#F2F2F3] text-xs leading-relaxed break-words">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeBlock key={idx} code={part.value.trim()} language={part.language} />;
        }
        return <TextSection key={idx} text={part.value} />;
      })}
    </div>
  );
}

function TextSection({ text }) {
  // Check for display math blocks ($$ ... $$)
  const mathBlockRegex = /\$\$([\s\S]*?)\$\$/g;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = mathBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
    }
    segments.push({ type: 'math-block', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'math-block') {
          return (
            <div
              key={i}
              className="my-2 px-3 py-2 bg-[#0B0B0C] border border-[#29292D] rounded-xs font-mono text-[#C7A46A] text-center overflow-x-auto custom-scrollbar"
            >
              {cleanMathSymbols(seg.value)}
            </div>
          );
        }

        // Process standard markdown paragraphs and lines
        const lines = seg.value.split('\n');
        return (
          <div key={i} className="space-y-1.5">
            {lines.map((line, lineIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lineIdx} className="h-1.5" />;
              }

              // Heading 1-3
              if (trimmed.startsWith('### ')) {
                return (
                  <h4 key={lineIdx} className="text-[#F2F2F3] font-semibold text-xs tracking-wider uppercase mt-3 mb-1 text-[#C7A46A]">
                    {renderInline(trimmed.substring(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3 key={lineIdx} className="text-[#F2F2F3] font-bold text-xs tracking-wider uppercase mt-3 mb-1 border-b border-[#29292D] pb-1">
                    {renderInline(trimmed.substring(3))}
                  </h3>
                );
              }
              if (trimmed.startsWith('# ')) {
                return (
                  <h2 key={lineIdx} className="text-[#F2F2F3] font-bold text-sm tracking-wide mt-3 mb-1 border-b border-[#29292D] pb-1">
                    {renderInline(trimmed.substring(2))}
                  </h2>
                );
              }

              // Bullet points
              if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-[#C7A46A] shrink-0 text-[10px] mt-0.5">•</span>
                    <span className="text-[#F2F2F3] flex-1">{renderInline(trimmed.substring(2))}</span>
                  </div>
                );
              }

              // Numbered list
              const numMatch = trimmed.match(/^([0-9]+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lineIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-[#929298] shrink-0 text-[10px] font-mono mt-0.5">{numMatch[1]}.</span>
                    <span className="text-[#F2F2F3] flex-1">{renderInline(numMatch[2])}</span>
                  </div>
                );
              }

              // Normal text line
              return (
                <p key={lineIdx} className="leading-relaxed">
                  {renderInline(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

/**
 * Render inline formatting: inline code `...`, inline math $...$, and bold **...**
 */
function renderInline(text) {
  if (!text) return null;

  // Tokenize by inline code `...` and inline math $...$
  const tokenRegex = /(`[^`]+`|\$[^$]+\$|\*\*[^*]+\*\*)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'plain', text: text.substring(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('`') && raw.endsWith('`')) {
      parts.push({ type: 'code', text: raw.slice(1, -1) });
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      parts.push({ type: 'math', text: raw.slice(1, -1) });
    } else if (raw.startsWith('**') && raw.endsWith('**')) {
      parts.push({ type: 'bold', text: raw.slice(2, -2) });
    }
    lastIndex = match.index + raw.length;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'plain', text: text.substring(lastIndex) });
  }

  return parts.map((part, index) => {
    if (part.type === 'code') {
      return (
        <code
          key={index}
          className="px-1 py-0.5 bg-[#18181B] border border-[#29292D] text-[#C7A46A] rounded-xs font-mono text-[10.5px] mx-0.5"
        >
          {part.text}
        </code>
      );
    }
    if (part.type === 'math') {
      return (
        <span
          key={index}
          className="font-mono text-[#C7A46A] px-1 bg-[#18181B]/60 rounded-xs border border-[#29292D]/60 mx-0.5"
        >
          {cleanMathSymbols(part.text)}
        </span>
      );
    }
    if (part.type === 'bold') {
      return (
        <strong key={index} className="font-semibold text-[#F2F2F3]">
          {part.text}
        </strong>
      );
    }
    return <span key={index}>{part.text}</span>;
  });
}
