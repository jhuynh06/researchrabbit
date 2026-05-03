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
    func: () => {
      const textParts = new Set();

      function addText(value) {
        const text = (value || "").trim();
        if (text) {
          textParts.add(text);
        }
      }

      function collectFromRoot(root) {
        addText(root.body?.innerText);
        addText(root.documentElement?.innerText);

        for (const selector of ["article", "main", "[role='main']", ".abstract", "#abstract"]) {
          for (const element of root.querySelectorAll?.(selector) || []) {
            addText(element.innerText);
          }
        }

        for (const element of root.querySelectorAll?.("p, h1, h2, h3, h4, li, blockquote") || []) {
          addText(element.innerText);
        }

        for (const element of root.querySelectorAll?.("*") || []) {
          if (element.shadowRoot) {
            collectFromRoot(element.shadowRoot);
          }
        }
      }

      collectFromRoot(document);

      for (const iframe of document.querySelectorAll("iframe")) {
        try {
          if (iframe.contentDocument) {
            collectFromRoot(iframe.contentDocument);
          }
        } catch {
          // Cross-origin iframes are intentionally inaccessible.
        }
      }

      return Array.from(textParts).join("\n\n");
    },
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
    resultsElement.appendChild(wrapper);
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Working..." : "Find Relevant Chunks";
}

function setStatus(message) {
  statusElement.textContent = message;
}
