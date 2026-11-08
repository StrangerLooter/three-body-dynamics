import React, { useState, memo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Clean CodeBlock with language badge and one-click copy button (Memoized)
 */
export const CodeBlock = memo(function CodeBlock({ code, language = 'text' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 rounded-xs border border-[#2E2E38] bg-[#0A0A0D] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#16161C] border-b border-[#2E2E38] text-[#9A9AA2] font-mono text-[10px]">
        <span className="uppercase tracking-wider font-semibold text-[#C7A46A]">{language || 'CODE'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-[#FFFFFF] text-[10px] flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded-xs bg-[#101014] border border-[#2E2E38] hover:border-[#C7A46A]/60"
          title="Copy code to clipboard"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[#EDEDF2] font-mono text-[11px] leading-relaxed custom-scrollbar selection:bg-[#C7A46A]/30">
        <code>{code}</code>
      </pre>
    </div>
  );
});

/**
 * Clean Unicode fallback for malformed LaTeX expressions
 */
function cleanLatexFallback(text) {
  if (!text) return '';
  return text
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\sum/g, '∑')
    .replace(/\\approx/g, '≈')
    .replace(/\\le(q)?/g, '≤')
    .replace(/\\ge(q)?/g, '≥')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\infty/g, '∞')
    .replace(/\\partial/g, '∂')
    .replace(/\\int/g, '∫')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)');
}

/**
 * High-performance, error-bounded KaTeX Math Renderer (Memoized)
 */
export const MathSpan = memo(function MathSpan({ math, display = false }) {
  if (!math) return null;

  let html = '';
  try {
    html = katex.renderToString(math, {
      displayMode: display,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
      trust: false,
    });
  } catch (err) {
    return (
      <span className="font-mono text-[#D4AF37] px-1 bg-[#16161C] rounded-xs border border-[#2E2E38]">
        {cleanLatexFallback(math)}
      </span>
    );
  }

  if (display) {
    return (
      <div
        className="my-2.5 px-3 py-2.5 bg-[#0C0C10] border border-[#2E2E38] rounded-xs overflow-x-auto custom-scrollbar text-center text-[#F5F5FA] shadow-inner"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className="inline-block px-0.5 text-[#F5F5FA] align-baseline font-medium"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

/**
 * Responsive Markdown Table with Sticky Header & Auto Numeric Alignment (Memoized)
 */
export const MarkdownTable = memo(function MarkdownTable({ lines }) {
  if (!lines || lines.length === 0) return null;

  const parseRow = (line) => {
    const raw = line.trim();
    const withoutEdges = raw.replace(/^\|/, '').replace(/\|$/, '');
    return withoutEdges.split('|').map((c) => c.trim());
  };

  const headerCells = parseRow(lines[0]);
  const hasDelimiter = lines.length > 1 && lines[1].includes('-');
  const alignments = [];

  if (hasDelimiter) {
    const delimCells = parseRow(lines[1]);
    delimCells.forEach((d) => {
      const left = d.startsWith(':');
      const right = d.endsWith(':');
      if (left && right) alignments.push('center');
      else if (right) alignments.push('right');
      else alignments.push('left');
    });
  }

  const dataRows = (hasDelimiter ? lines.slice(2) : lines.slice(1)).map(parseRow);

  return (
    <div className="my-2.5 max-h-72 overflow-y-auto overflow-x-auto rounded-xs border border-[#2E2E38] bg-[#0B0B0E] custom-scrollbar shadow-sm">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead className="sticky top-0 z-10 bg-[#16161C] shadow-sm">
          <tr className="border-b border-[#2E2E38] text-[#C7A46A] text-[10px] uppercase tracking-wider">
            {headerCells.map((header, idx) => (
              <th
                key={idx}
                className="px-3 py-2 font-semibold whitespace-nowrap bg-[#16161C]"
                style={{ textAlign: alignments[idx] || 'left' }}
              >
                {renderInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#24242E]">
          {dataRows.map((row, rIdx) => (
            <tr
              key={rIdx}
              className={`transition-colors ${
                rIdx % 2 === 0 ? 'bg-[#0B0B0E]' : 'bg-[#101015]'
              } hover:bg-[#1A1A24]`}
            >
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="px-3 py-1.5 text-[#EDEDF2] text-[11px] whitespace-nowrap"
                  style={{ textAlign: alignments[cIdx] || 'left' }}
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

/**
 * Formatted Message with Memoization & Interactive Action Chip Feedback
 */
export const FormattedMessage = memo(function FormattedMessage({
  content,
  onApplyPreset,
  onRunSimulation,
  onApplyConfig,
}) {
  const [appliedAction, setAppliedAction] = useState(null);

  if (!content) return null;

  const handleAction = (actionKey, callback) => {
    callback();
    setAppliedAction(actionKey);
    setTimeout(() => setAppliedAction(null), 1800);
  };

  // Split content by code blocks (```lang ... ```)
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    blocks.push({
      type: 'code',
      language: match[1] || 'code',
      value: match[2],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: 'text', value: content.substring(lastIndex) });
  }

  // Detect actionable configurations
  const hasTriangle = /lagrange|equilateral|triangle/i.test(content);
  const hasFigureEight = /figure[- ]?8|figureeight|choreography/i.test(content);
  const hasSolar = /solar system|sun-center/i.test(content);
  const hasHierarchical = /hierarchical triple/i.test(content);

  return (
    <div className="space-y-2 text-[#EDEDF2] text-xs leading-relaxed break-words font-sans selection:bg-[#C7A46A]/30">
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlock key={idx} code={block.value.trim()} language={block.language} />;
        }
        return <FormattedTextSection key={idx} text={block.value} />;
      })}

      {/* Interactive Action Chips with Instant Visual Confirmation */}
      {(hasTriangle || hasFigureEight || hasSolar || hasHierarchical) && (onApplyPreset || onRunSimulation) && (
        <div className="pt-2 pb-1 flex flex-wrap items-center gap-1.5 border-t border-[#292934] mt-2 font-mono">
          <span className="text-[10px] text-[#9A9AA2] uppercase tracking-wider mr-1">
            SIMULATION ACTION:
          </span>

          {hasTriangle && onApplyPreset && (
            <button
              onClick={() => handleAction('triangle', () => onApplyPreset('lagrangeTriangle', true))}
              className="text-[11px] px-2.5 py-1 bg-[#C7A46A]/15 hover:bg-[#C7A46A]/25 text-[#FFFFFF] border border-[#C7A46A]/60 rounded-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Set Lagrange Triangle initial conditions and run simulation"
            >
              <span>{appliedAction === 'triangle' ? '✓' : '🔺'}</span>
              <span className="font-semibold">
                {appliedAction === 'triangle' ? 'Applied & Running!' : 'Set Triangle & Run'}
              </span>
            </button>
          )}

          {hasFigureEight && onApplyPreset && (
            <button
              onClick={() => handleAction('figure8', () => onApplyPreset('figureEight', true))}
              className="text-[11px] px-2.5 py-1 bg-[#C7A46A]/15 hover:bg-[#C7A46A]/25 text-[#FFFFFF] border border-[#C7A46A]/60 rounded-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Set Figure-8 initial conditions and run simulation"
            >
              <span>{appliedAction === 'figure8' ? '✓' : '🌀'}</span>
              <span className="font-semibold">
                {appliedAction === 'figure8' ? 'Applied & Running!' : 'Set Figure-8 & Run'}
              </span>
            </button>
          )}

          {hasSolar && onApplyPreset && (
            <button
              onClick={() => handleAction('solar', () => onApplyPreset('solarSystem', true))}
              className="text-[11px] px-2.5 py-1 bg-[#181820] hover:bg-[#20202A] text-[#EDEDF2] border border-[#2E2E38] rounded-xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Load Solar System preset"
            >
              <span>{appliedAction === 'solar' ? '✓' : '🪐'}</span>
              <span>{appliedAction === 'solar' ? 'Applied!' : 'Set Solar System'}</span>
            </button>
          )}

          {onRunSimulation && (
            <button
              onClick={() => handleAction('run', onRunSimulation)}
              className="text-[11px] px-2.5 py-1 bg-[#181820] hover:bg-[#20202A] text-[#EDEDF2] border border-[#2E2E38] rounded-xs flex items-center gap-1.5 transition-all active:scale-95"
              title="Start / Resume simulation"
            >
              <span>{appliedAction === 'run' ? '✓' : '▶'}</span>
              <span>{appliedAction === 'run' ? 'Running!' : 'Run Simulation'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Processes text sections for display math ($$ ... $$) and markdown tables
 */
function FormattedTextSection({ text }) {
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
      {segments.map((seg, idx) => {
        if (seg.type === 'math-block') {
          return <MathSpan key={idx} math={seg.value} display={true} />;
        }
        return <LinesAndTablesRenderer key={idx} text={seg.value} />;
      })}
    </>
  );
}

/**
 * Identifies table blocks and standard lines
 */
function LinesAndTablesRenderer({ text }) {
  const rawLines = text.split('\n');
  const groups = [];
  let currentTable = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|');

    if (isTableRow) {
      if (!currentTable) {
        currentTable = [];
      }
      currentTable.push(line);
    } else {
      if (currentTable) {
        groups.push({ type: 'table', lines: currentTable });
        currentTable = null;
      }
      groups.push({ type: 'line', text: line });
    }
  }

  if (currentTable) {
    groups.push({ type: 'table', lines: currentTable });
  }

  return (
    <div className="space-y-1.5">
      {groups.map((group, gIdx) => {
        if (group.type === 'table') {
          return <MarkdownTable key={gIdx} lines={group.lines} />;
        }

        const line = group.text;
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={gIdx} className="h-1.5" />;
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={gIdx}
              className="text-[#C7A46A] font-semibold text-xs tracking-wider uppercase mt-3 mb-1 font-mono"
            >
              {renderInline(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={gIdx}
              className="text-[#FFFFFF] font-bold text-xs tracking-wider uppercase mt-3 mb-1 border-b border-[#292934] pb-1 font-mono"
            >
              {renderInline(trimmed.substring(3))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2
              key={gIdx}
              className="text-[#FFFFFF] font-bold text-sm tracking-wide mt-3 mb-1 border-b border-[#292934] pb-1 font-mono"
            >
              {renderInline(trimmed.substring(2))}
            </h2>
          );
        }

        // Bullet point
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={gIdx} className="flex items-start gap-2 pl-1.5">
              <span className="text-[#C7A46A] shrink-0 text-xs mt-0.5">•</span>
              <span className="text-[#EDEDF2] flex-1 leading-relaxed">
                {renderInline(trimmed.substring(2))}
              </span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^([0-9]+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={gIdx} className="flex items-start gap-2 pl-1.5">
              <span className="text-[#C7A46A] shrink-0 text-[11px] font-mono mt-0.5 font-semibold">
                {numMatch[1]}.
              </span>
              <span className="text-[#EDEDF2] flex-1 leading-relaxed">
                {renderInline(numMatch[2])}
              </span>
            </div>
          );
        }

        // Standard line
        return (
          <p key={gIdx} className="leading-relaxed text-[#EDEDF2]">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Render inline formatting: inline math $...$, inline code `...`, and bold **...**
 */
function renderInline(text) {
  if (!text) return null;

  const tokenRegex = /(`[^`]+`|\$[^$\n]+\$|\*\*[^*]+\*\*)/g;
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
          className="px-1.5 py-0.5 bg-[#16161D] border border-[#2E2E38] text-[#D4AF37] rounded-xs font-mono text-[11px] mx-0.5"
        >
          {part.text}
        </code>
      );
    }
    if (part.type === 'math') {
      return <MathSpan key={index} math={part.text} display={false} />;
    }
    if (part.type === 'bold') {
      return (
        <strong key={index} className="font-semibold text-[#FFFFFF]">
          {part.text}
        </strong>
      );
    }
    return <span key={index}>{part.text}</span>;
  });
}
