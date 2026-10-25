(function () {
  'use strict';
  function escapeIdent(value) {
    return Array.from(String(value), (ch, i) => {
      const code = ch.codePointAt(0);
      if (!code) return '\uFFFD';
      if (code < 32 || code === 127 || (/\d/.test(ch) && (i === 0 || (i === 1 && value[0] === '-')))) {
        return `\\${code.toString(16)} `;
      }
      if (i === 0 && ch === '-' && value.length === 1) return '\\-';
      return /[\w-]/.test(ch) || code >= 128 ? ch : `\\${ch}`;
    }).join('');
  }
  function buildSelector(el) {
    const parts = [];
    for (let node = el; node && parts.length < 6; node = node.parentElement) {
      if (node.id) { parts.unshift(`#${escapeIdent(node.id)}`); break; }
      const testId = node.getAttribute('data-testid');
      if (testId) {
        parts.unshift(`[data-testid="${testId.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\a ')}"]`);
        break;
      }
      const tag = node.tagName.toLowerCase();
      const classes = Array.from(node.classList || []).slice(0, 3).map(c => `.${escapeIdent(c)}`).join('');
      const siblings = node.parentElement ? Array.from(node.parentElement.children).filter(s => s.tagName === node.tagName) : [node];
      parts.unshift(`${tag}${classes}:nth-of-type(${siblings.indexOf(node) + 1})`);
    }
    return parts.join(' > ');
  }
  function textSnippet(el) {
    const excluded = /^(INPUT|TEXTAREA|SELECT|SCRIPT|STYLE|NOSCRIPT)$/i;
    function read(node) {
      if (excluded.test(node.tagName || '')) return '';
      if (!node.childNodes) return node.innerText || '';
      if (node.nodeType === 3) return node.textContent;
      const view = node.ownerDocument?.defaultView;
      if (node.nodeType === 1 && view) {
        const css = view.getComputedStyle(node);
        if (css.display === 'none' || css.visibility === 'hidden' || node.hidden) return '';
      }
      return Array.from(node.childNodes, read).join(' ');
    }
    return read(el).replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function formatMarkdown(items, meta = {}) {
    const line = value => String(value ?? '').replace(/[\r\n]+/g, ' ');
    const blocks = [...items].sort((a, b) => a.n - b.n).map(item => {
      const selector = line(item.selector);
      const fence = '`'.repeat(Math.max(1, ...Array.from(selector.matchAll(/`+/g), m => m[0].length + 1)));
      return `## ${item.n}. ${line(item.title || meta.title)}\n- URL: ${line(item.url || meta.url)}\n- Element: ${fence}${selector}${fence} (${line(item.tag)}) "${line(item.text)}"\n- Comment: ${String(item.comment).replace(/\r\n?/g, '\n').replace(/\n/g, '\n  ')}`;
    });
    return [`# Page annotations (${items.length})`, ...blocks].join('\n\n');
  }
  const api = { buildSelector, textSnippet, formatMarkdown };
  if (typeof globalThis !== 'undefined') globalThis.AnnotatorLib = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
