/**
 * ResearchRabbit Floating Action Button
 * Injects persistent page controls and semantic search highlighting.
 */

(function () {
  "use strict";

  const DEFAULT_TOP_K = 5;
  const MIN_PAGE_TEXT_CHARS = 100;
  const HIGHLIGHT_CLASS = "rr-highlight-mark";
  const HIGHLIGHT_STYLE_ID = "rr-highlight-style";
  const SKIP_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "TEXTAREA",
    "INPUT",
    "IFRAME",
    "SVG",
    "CANVAS",
    "OBJECT",
    "EMBED",
  ]);

  if (!window.ResearchRabbitHighlighter) {
    installHighlighter();
  }

  if (document.getElementById("rr-fab-container")) return;

  const container = document.createElement("div");
  container.id = "rr-fab-container";

  const shadow = container.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .rr-fab-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(58, 80, 157, 0.25);
      transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.2s ease;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }

    .rr-fab-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(58, 80, 157, 0.35);
    }

    .rr-fab-btn:active {
      transform: scale(0.95);
    }

    #rr-fab-main {
      background: #ffffff;
      width: 56px;
      height: 56px;
      position: relative;
      z-index: 1;
      box-shadow: 0 4px 16px rgba(58, 80, 157, 0.3);
    }

    #rr-fab-main.rr-open {
      background: #3a509d;
    }

    #rr-fab-main.rr-open svg {
      fill: #ffffff;
    }

    #rr-fab-main svg {
      transition: fill 0.2s ease;
    }

    .rr-fab-sub {
      background: #ffffff;
      opacity: 0;
      transform: translateY(12px) scale(0.85);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }

    .rr-fab-sub.rr-visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    #rr-fab-search.rr-visible {
      transition-delay: 0.04s;
    }

    #rr-fab-chat.rr-visible {
      transition-delay: 0.08s;
    }

    .rr-fab-btn::before {
      content: attr(data-tooltip);
      position: absolute;
      right: 64px;
      background: rgba(30, 40, 80, 0.88);
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .rr-fab-btn:hover::before {
      opacity: 1;
    }
  `;
  shadow.appendChild(style);

  const chatBtn = document.createElement("button");
  chatBtn.id = "rr-fab-chat";
  chatBtn.className = "rr-fab-btn rr-fab-sub";
  chatBtn.setAttribute("data-tooltip", "Q&A");
  chatBtn.setAttribute("aria-label", "Q&A");
  chatBtn.innerHTML = `<img src="${chrome.runtime.getURL("icons/octicon_comment-ai-16.png")}" width="24" height="24" alt="Q&A" style="display:block;" />`;

  const searchBtn = document.createElement("button");
  searchBtn.id = "rr-fab-search";
  searchBtn.className = "rr-fab-btn rr-fab-sub";
  searchBtn.setAttribute("data-tooltip", "Search");
  searchBtn.setAttribute("aria-label", "Search");
  searchBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
         fill="none" stroke="#5b6bbf" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="16.5" y1="16.5" x2="22" y2="22"/>
    </svg>`;

  const mainBtn = document.createElement("button");
  mainBtn.id = "rr-fab-main";
  mainBtn.className = "rr-fab-btn";
  mainBtn.setAttribute("data-tooltip", "ResearchRabbit");
  mainBtn.setAttribute("aria-label", "Toggle ResearchRabbit menu");
  mainBtn.setAttribute("aria-expanded", "false");
  mainBtn.innerHTML = `
    <svg id="rr-fab-main-svg" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 26 26" fill="#3a509d">
      <circle cx="9" cy="9" r="3.2"/>
      <circle cx="9" cy="17" r="3.2"/>
      <circle cx="17" cy="17" r="3.2"/>
      <path d="M17 5l.8 2.2L20 8l-2.2.8L17 11l-.8-2.2L14 8l2.2-.8z"/>
    </svg>`;

  shadow.append(chatBtn, searchBtn, mainBtn);
  document.body.appendChild(container);

  const searchPanel = document.createElement("div");
  searchPanel.id = "rr-search-panel";
  searchPanel.className = "rr-search-panel";
  searchPanel.innerHTML = `
    <div class="rr-search-panel-header">
      <div class="rr-search-panel-header-left">
        <svg class="rr-search-panel-sparkle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 26 26" fill="#3a509d">
          <path d="M17 5l.8 2.2L20 8l-2.2.8L17 11l-.8-2.2L14 8l2.2-.8z"/>
        </svg>
        <div class="rr-search-panel-title-section">
          <h2>Search by meaning</h2>
          <p class="rr-search-panel-subtitle">Paste a paragraph - we highlight what's relevant</p>
        </div>
      </div>
      <div class="rr-search-panel-header-right">
        <button id="rr-search-close" type="button" class="rr-search-panel-close" aria-label="Close">&times;</button>
      </div>
    </div>
    <div class="rr-search-panel-body">
      <textarea id="rr-search-textarea" placeholder="Paste your paragraph here..."></textarea>
    </div>
    <div class="rr-search-panel-footer">
      <div id="rr-search-char-count" class="rr-search-char-count">0 CHARS - semantic</div>
      <div class="rr-search-buttons">
        <button id="rr-search-clear" type="button" class="rr-search-btn">Clear</button>
        <button id="rr-search-search" type="button" class="rr-search-btn rr-search-btn-primary">Search</button>
      </div>
    </div>
    <div id="rr-search-status" class="rr-search-empty">Enter a query above to search page content.</div>
    <div id="rr-search-results" class="rr-search-results"></div>
  `;
  document.body.appendChild(searchPanel);

  const searchTextarea = searchPanel.querySelector("#rr-search-textarea");
  const searchResults = searchPanel.querySelector("#rr-search-results");
  const searchStatus = searchPanel.querySelector("#rr-search-status");
  const searchClose = searchPanel.querySelector("#rr-search-close");
  const clearBtn = searchPanel.querySelector("#rr-search-clear");
  const searchActionBtn = searchPanel.querySelector("#rr-search-search");
  const charCount = searchPanel.querySelector("#rr-search-char-count");
  const searchPanelHeader = searchPanel.querySelector(".rr-search-panel-header");

  let isOpen = false;
  let isSearching = false;

  function openMenu() {
    isOpen = true;
    mainBtn.classList.add("rr-open");
    mainBtn.setAttribute("aria-expanded", "true");
    searchBtn.classList.add("rr-visible");
    chatBtn.classList.add("rr-visible");
  }

  function closeMenu() {
    isOpen = false;
    mainBtn.classList.remove("rr-open");
    mainBtn.setAttribute("aria-expanded", "false");
    searchBtn.classList.remove("rr-visible");
    chatBtn.classList.remove("rr-visible");
  }

  function openSearchPanel() {
    closeMenu();
    searchPanel.classList.add("rr-visible");
    setTimeout(() => searchTextarea.focus(), 100);
  }

  function closeSearchPanel() {
    searchPanel.classList.remove("rr-visible");
  }

  function resetSearchPanel() {
    window.clearHighlights();
    searchTextarea.value = "";
    updateCharCount();
    renderChunks([]);
    setStatus("Enter a query above to search page content.");
    searchTextarea.focus();
  }

  function updateCharCount() {
    charCount.textContent = `${searchTextarea.value.length} CHARS - semantic`;
  }

  function setStatus(message) {
    searchStatus.textContent = message;
  }

  function setSearching(nextIsSearching) {
    isSearching = nextIsSearching;
    searchActionBtn.disabled = isSearching;
    searchActionBtn.textContent = isSearching ? "Searching..." : "Search";
  }

  function renderChunks(chunks) {
    searchResults.replaceChildren();

    for (const chunk of chunks) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "rr-search-result-item";
      item.dataset.chunkText = chunk.text || "";
      item.innerHTML = `
        <p><strong>#${chunk.rank} - score ${Number(chunk.score || 0).toFixed(4)}</strong></p>
        <p>${escapeHtml(chunk.explanation || "Relevant page section")}</p>
        <p>${escapeHtml(truncateText(chunk.text || "", 220))}</p>
      `;
      item.addEventListener("click", () => {
        searchPanel.querySelectorAll(".rr-search-result-item").forEach((node) => {
          node.classList.remove("rr-active");
        });
        item.classList.add("rr-active");
        highlightChunk(chunk.text || "");
      });
      searchResults.appendChild(item);
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function truncateText(value, limit) {
    const normalized = String(value).replace(/\s+/g, " ").trim();
    return normalized.length > limit ? `${normalized.slice(0, limit).trim()}...` : normalized;
  }

  function getVisiblePageText() {
    const parts = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        let parent = node.parentNode;
        while (parent && parent !== document.body) {
          if (SKIP_TAGS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
          if (parent.id === "rr-search-panel" || parent.id === "rr-fab-container") {
            return NodeFilter.FILTER_REJECT;
          }
          if (parent.classList?.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
          parent = parent.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node;
    while ((node = walker.nextNode())) {
      parts.push(node.nodeValue.trim());
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  async function runSemanticSearch() {
    const prompt = searchTextarea.value.trim();
    if (!prompt) {
      setStatus("Enter a query above to search page content.");
      renderChunks([]);
      window.clearHighlights();
      return;
    }

    const pageText = getVisiblePageText();
    if (pageText.length < MIN_PAGE_TEXT_CHARS) {
      setStatus(`Extracted only ${pageText.length} characters. Open an HTML article page with selectable body text.`);
      return;
    }

    setSearching(true);
    setStatus(`Extracted ${pageText.length} characters. Ranking chunks...`);
    renderChunks([]);
    window.clearHighlights();

    try {
      const body = await rankChunks({
        prompt,
        page_text: pageText,
        top_k: DEFAULT_TOP_K,
        url: window.location.href,
      });

      const chunks = body.chunks || [];
      renderChunks(chunks);
      if (!chunks.length) {
        setStatus("No relevant chunks found.");
        return;
      }

      const matchCount = highlightChunk(chunks[0].text || "");
      setStatus(
        matchCount > 0
          ? `Found ${chunks.length} relevant chunks. Highlighted ${matchCount} match${matchCount === 1 ? "" : "es"}.`
          : `Found ${chunks.length} relevant chunks. Select a result to retry highlighting.`,
      );
      searchResults.querySelector(".rr-search-result-item")?.classList.add("rr-active");
    } catch (error) {
      setStatus(error.message || "Semantic search failed.");
    } finally {
      setSearching(false);
    }
  }

  function rankChunks(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "RR_RANK_CHUNKS", payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!response?.ok) {
          reject(new Error(response?.error || "Backend request failed."));
          return;
        }

        resolve(response.body);
      });
    });
  }

  function highlightChunk(text) {
    const candidates = getHighlightCandidates(text);
    for (const candidate of candidates) {
      const count = window.highlightText(candidate);
      if (count > 0) return count;
    }
    return 0;
  }

  function getHighlightCandidates(text) {
    const normalized = String(text).replace(/\s+/g, " ").trim();
    if (!normalized) return [];

    const candidates = [normalized];
    const sentences = normalized.match(/[^.!?]+[.!?]?/g) || [];
    for (const sentence of sentences.slice(0, 3)) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 24) candidates.push(trimmed);
    }

    const words = normalized.split(/\s+/);
    for (const size of [24, 16, 12, 8]) {
      if (words.length >= size) {
        candidates.push(words.slice(0, size).join(" "));
      }
    }

    return [...new Set(candidates)];
  }

  mainBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    isOpen ? closeMenu() : openMenu();
  });

  chatBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    console.log("[ResearchRabbit] Q&A clicked");
  });

  searchBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    searchPanel.classList.contains("rr-visible") ? closeSearchPanel() : openSearchPanel();
  });

  searchTextarea.addEventListener("input", updateCharCount);
  searchClose.addEventListener("click", closeSearchPanel);
  clearBtn.addEventListener("click", resetSearchPanel);
  searchActionBtn.addEventListener("click", runSemanticSearch);

  searchTextarea.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      runSemanticSearch();
    }
  });

  let isDragging = false;
  let initialMouseX = 0;
  let initialMouseY = 0;
  let initialPanelTop = 0;
  let initialPanelLeft = 0;

  searchPanelHeader.addEventListener("mousedown", (event) => {
    if (event.target.closest("button")) return;
    event.preventDefault();
    isDragging = true;
    initialMouseX = event.clientX;
    initialMouseY = event.clientY;

    const rect = searchPanel.getBoundingClientRect();
    initialPanelTop = rect.top;
    initialPanelLeft = rect.left;
    searchPanel.style.top = `${initialPanelTop}px`;
    searchPanel.style.left = `${initialPanelLeft}px`;
    searchPanel.style.transform = "none";
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;

    const panelRect = searchPanel.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - panelRect.width);
    const maxTop = Math.max(0, window.innerHeight - panelRect.height);
    const nextLeft = initialPanelLeft + event.clientX - initialMouseX;
    const nextTop = initialPanelTop + event.clientY - initialMouseY;

    searchPanel.style.top = `${Math.min(Math.max(0, nextTop), maxTop)}px`;
    searchPanel.style.left = `${Math.min(Math.max(0, nextLeft), maxLeft)}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });

  document.addEventListener("click", (event) => {
    const path = event.composedPath();
    const isInsideContainer = path.includes(container);
    const isInsideSearchPanel = path.includes(searchPanel);

    if (isOpen && !isInsideContainer && !isInsideSearchPanel) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (searchPanel.classList.contains("rr-visible")) closeSearchPanel();
    if (isOpen) closeMenu();
  });

  function installHighlighter() {
    function ensureHighlightStyle() {
      if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
      const highlightStyle = document.createElement("style");
      highlightStyle.id = HIGHLIGHT_STYLE_ID;
      highlightStyle.textContent =
        `.${HIGHLIGHT_CLASS}{background-color:#fff176;color:inherit;` +
        "border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,0.08);padding:0 1px;}";
      document.documentElement.appendChild(highlightStyle);
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
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          let parent = node.parentNode;
          while (parent && parent !== root) {
            if (SKIP_TAGS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
            if (parent.id === "rr-search-panel" || parent.id === "rr-fab-container") {
              return NodeFilter.FILTER_REJECT;
            }
            if (parent.classList?.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
            parent = parent.parentNode;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node;
      while ((node = walker.nextNode())) nodes.push(node);
      return nodes;
    }

    function buildIndex(nodes) {
      let haystack = "";
      const map = [];
      let prevWasSpace = true;

      for (const node of nodes) {
        const text = node.nodeValue;
        for (let index = 0; index < text.length; index++) {
          const char = text[index];
          if (/\s/.test(char)) {
            if (prevWasSpace) continue;
            haystack += " ";
            map.push({ node, offset: index });
            prevWasSpace = true;
          } else {
            haystack += char.toLowerCase();
            map.push({ node, offset: index });
            prevWasSpace = false;
          }
        }
      }

      return { haystack, map };
    }

    function wrapRange(range) {
      if (range.collapsed) return false;

      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        try {
          const span = document.createElement("span");
          span.className = HIGHLIGHT_CLASS;
          range.surroundContents(span);
          return true;
        } catch {
          return false;
        }
      }

      const ancestor = range.commonAncestorContainer;
      const walker = document.createTreeWalker(
        ancestor.nodeType === Node.TEXT_NODE ? ancestor.parentNode : ancestor,
        NodeFilter.SHOW_TEXT,
      );
      const touched = [];
      let current;
      while ((current = walker.nextNode())) {
        if (range.intersectsNode(current)) touched.push(current);
      }

      let wrappedAny = false;
      for (const node of touched) {
        const start = node === range.startContainer ? range.startOffset : 0;
        const end = node === range.endContainer ? range.endOffset : node.nodeValue.length;
        if (end <= start) continue;

        const before = node.nodeValue.slice(0, start);
        const middle = node.nodeValue.slice(start, end);
        const after = node.nodeValue.slice(end);
        if (!middle.trim()) continue;

        const span = document.createElement("span");
        span.className = HIGHLIGHT_CLASS;
        span.textContent = middle;

        const parent = node.parentNode;
        if (!parent) continue;
        if (before) parent.insertBefore(document.createTextNode(before), node);
        parent.insertBefore(span, node);
        if (after) parent.insertBefore(document.createTextNode(after), node);
        parent.removeChild(node);
        wrappedAny = true;
      }
      return wrappedAny;
    }

    function highlightText(query, options = {}) {
      if (!query || !document.body) return 0;
      const { scrollToFirst = true } = options;
      const needle = String(query).replace(/\s+/g, " ").trim().toLowerCase();
      if (!needle) return 0;

      ensureHighlightStyle();
      clearHighlights();

      const nodes = collectTextNodes(document.body);
      const { haystack, map } = buildIndex(nodes);
      if (!haystack) return 0;

      const ranges = [];
      let from = 0;
      while (true) {
        const matchIndex = haystack.indexOf(needle, from);
        if (matchIndex === -1) break;

        const startMap = map[matchIndex];
        const endMap = map[matchIndex + needle.length - 1];
        if (startMap && endMap) {
          const range = document.createRange();
          try {
            range.setStart(startMap.node, startMap.offset);
            range.setEnd(endMap.node, endMap.offset + 1);
            ranges.push(range);
          } catch {
            // Ignore ranges that became invalid on dynamic pages.
          }
        }
        from = matchIndex + needle.length;
      }

      let count = 0;
      for (let index = ranges.length - 1; index >= 0; index--) {
        if (wrapRange(ranges[index])) count++;
      }

      if (count > 0 && scrollToFirst) {
        document.querySelector(`.${HIGHLIGHT_CLASS}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return count;
    }

    function getResearchRabbitVisibleText() {
      return document.body?.innerText || "";
    }

    window.highlightText = highlightText;
    window.clearHighlights = clearHighlights;
    window.getResearchRabbitVisibleText = getResearchRabbitVisibleText;
    window.ResearchRabbitHighlighter = true;
  }
})();
