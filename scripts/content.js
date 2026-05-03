/**
 * highlightText(query, options?) -> number of matches highlighted
 * clearHighlights()              -> removes all highlights added by this module
 *
 * Finds every occurrence of `query` in the current document and wraps each match
 * in a <span> styled with a yellow background. Whitespace is collapsed and the
 * comparison is case-insensitive, so matches can span across inline elements
 * (e.g. "foo bar" still matches `foo <em>bar</em>`).
 *
 * Note on PDFs: Chrome's built-in PDF viewer (PDFium) does not expose its DOM
 * to extensions, so this DOM-based function cannot reach into it. To highlight
 * inside the native viewer, navigate the tab to `<pdfUrl>#search=<text>`
 * instead — that triggers the viewer's own find/highlight.
 */

const HIGHLIGHT_CLASS = 'rr-highlight-mark';
const STYLE_ID = 'rr-highlight-style';
const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT',
  'IFRAME', 'SVG', 'CANVAS', 'OBJECT', 'EMBED'
]);

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent =
    `.${HIGHLIGHT_CLASS}{background-color:#fff176;color:inherit;` +
    `border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,0.08);padding:0 1px;}`;
  document.documentElement.appendChild(style);
}

function clearHighlights() {
  const marks = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}

function collectTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      let p = node.parentNode;
      while (p && p !== root) {
        if (SKIP_TAGS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
        if (p.classList && p.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

// Build a normalized (whitespace-collapsed, lowercase) haystack string spanning
// every text node, with a parallel map from haystack-index -> {node, offset}.
// This is what lets a query match across inline element boundaries.
function buildIndex(nodes) {
  let haystack = '';
  const map = [];
  let prevWasSpace = true;
  for (const node of nodes) {
    const text = node.nodeValue;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) {
        if (prevWasSpace) continue;
        haystack += ' ';
        map.push({ node, offset: i });
        prevWasSpace = true;
      } else {
        haystack += ch.toLowerCase();
        map.push({ node, offset: i });
        prevWasSpace = false;
      }
    }
  }
  return { haystack, map };
}

function wrapRange(range) {
  if (range.collapsed) return false;

  if (range.startContainer === range.endContainer &&
      range.startContainer.nodeType === Node.TEXT_NODE) {
    try {
      const span = document.createElement('span');
      span.className = HIGHLIGHT_CLASS;
      range.surroundContents(span);
      return true;
    } catch { return false; }
  }

  // Range spans multiple text nodes (e.g. "foo <em>bar</em>") — wrap each slice.
  const ancestor = range.commonAncestorContainer;
  const walker = document.createTreeWalker(
    ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor,
    NodeFilter.SHOW_TEXT
  );
  const touched = [];
  let cur;
  while ((cur = walker.nextNode())) {
    if (range.intersectsNode(cur)) touched.push(cur);
  }
  let any = false;
  for (const node of touched) {
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.nodeValue.length;
    if (end <= start) continue;
    const before = node.nodeValue.slice(0, start);
    const middle = node.nodeValue.slice(start, end);
    const after = node.nodeValue.slice(end);
    if (!middle.trim()) continue;
    const span = document.createElement('span');
    span.className = HIGHLIGHT_CLASS;
    span.textContent = middle;
    const parent = node.parentNode;
    if (!parent) continue;
    if (before) parent.insertBefore(document.createTextNode(before), node);
    parent.insertBefore(span, node);
    if (after) parent.insertBefore(document.createTextNode(after), node);
    parent.removeChild(node);
    any = true;
  }
  return any;
}

function highlightText(query, options = {}) {
  if (!query || !document.body) return 0;
  const { scrollToFirst = true } = options;

  ensureStyle();
  clearHighlights();

  const needle = String(query).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!needle) return 0;

  const nodes = collectTextNodes(document.body);
  const { haystack, map } = buildIndex(nodes);
  if (!haystack) return 0;

  // Collect every match first, then wrap in reverse so earlier ranges stay
  // valid as the DOM mutates from the bottom up.
  const ranges = [];
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    const startMap = map[idx];
    const endMap = map[idx + needle.length - 1];
    if (startMap && endMap) {
      const range = document.createRange();
      try {
        range.setStart(startMap.node, startMap.offset);
        range.setEnd(endMap.node, endMap.offset + 1);
        ranges.push(range);
      } catch {}
    }
    from = idx + needle.length;
  }

  let count = 0;
  for (let i = ranges.length - 1; i >= 0; i--) {
    if (wrapRange(ranges[i])) count++;
  }

  if (count > 0 && scrollToFirst) {
    const first = document.querySelector(`.${HIGHLIGHT_CLASS}`);
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return count;
}

// Used by the popup to extract page text for the backend ranking request.
function getResearchRabbitVisibleText() {
  return document.body?.innerText || '';
}

// Expose on window so the popup or other scripts can call these directly.
if (typeof window !== 'undefined') {
  window.highlightText = highlightText;
  window.clearHighlights = clearHighlights;
  window.getResearchRabbitVisibleText = getResearchRabbitVisibleText;
}
