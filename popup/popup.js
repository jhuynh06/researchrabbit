const BACKEND_URL = "http://localhost:8000/rank-chunks";
const MIN_PAGE_TEXT_CHARS = 100;
const DEFAULT_TOP_K = 5;

const promptInput = document.getElementById("prompt");
const submitButton = document.getElementById("submit");
const statusElement = document.getElementById("status");
const resultsElement = document.getElementById("results");

submitButton.addEventListener("click", async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Enter a prompt first.");
    return;
  }

  setLoading(true);
  setStatus("Extracting page text...");
  resultsElement.innerHTML = "";

  try {
    const tab = await getActiveTab();
    const pageText = await extractPageText(tab.id);

    if (pageText.length < MIN_PAGE_TEXT_CHARS) {
      throw new Error(`Extracted only ${pageText.length} characters. Open an HTML article page with selectable body text.`);
    }

    setStatus(`Extracted ${pageText.length} characters. Ranking chunks...`);
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        page_text: pageText,
        top_k: DEFAULT_TOP_K,
        url: tab.url,
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.detail || "Backend request failed.");
    }

    renderChunks(body.chunks || []);
    setStatus(`Found ${body.chunks.length} relevant chunks.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    setLoading(false);
  }
});

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) {
    throw new Error("No active tab found.");
  }
  return tabs[0];
}

async function extractPageText(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.body?.innerText || "",
  });

  return (results[0]?.result || "").trim();
}

function renderChunks(chunks) {
  resultsElement.innerHTML = "";

  if (!chunks.length) {
    resultsElement.textContent = "No relevant chunks found.";
    return;
  }

  for (const chunk of chunks) {
    const wrapper = document.createElement("section");
    wrapper.className = "chunk";

    const header = document.createElement("div");
    header.className = "chunk-header";
    header.textContent = `#${chunk.rank} · score ${Number(chunk.score).toFixed(4)}`;

    const explanation = document.createElement("div");
    explanation.className = "explanation";
    explanation.textContent = chunk.explanation;

    const text = document.createElement("div");
    text.className = "chunk-text";
    text.textContent = chunk.text;

    wrapper.append(header, explanation, text);

    wrapper.addEventListener("click", async () => {
      document.querySelectorAll(".chunk").forEach((c) => c.classList.remove("active"));
      wrapper.classList.add("active");
      try {
        const tab = await getActiveTab();
        const matches = await highlightChunk(tab.id, chunk.text);
        setStatus(matches > 0
          ? `Highlighted ${matches} match${matches === 1 ? "" : "es"} on page.`
          : "No matches found on page for this chunk.");
      } catch (error) {
        setStatus(error.message);
      }
    });

    resultsElement.appendChild(wrapper);
  }
}

async function highlightChunk(tabId, text) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => {
      if (typeof window.highlightText !== "function") {
        return { error: "content_script_missing" };
      }
      const tries = [t];
      const sentences = t.match(/[^.!?\n]+[.!?]?/g) || [];
      if (sentences.length > 1) tries.push(sentences[0].trim());
      const words = t.split(/\s+/);
      if (words.length > 12) tries.push(words.slice(0, 12).join(" "));
      for (const candidate of tries) {
        const count = window.highlightText(candidate);
        if (count > 0) return { count };
      }
      return { count: 0 };
    },
    args: [text],
  });

  const result = results[0]?.result || {};
  if (result.error === "content_script_missing") {
    throw new Error("Content script not loaded — reload the article page.");
  }
  return result.count || 0;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Working..." : "Find Relevant Chunks";
}

function setStatus(message) {
  statusElement.textContent = message;
}
