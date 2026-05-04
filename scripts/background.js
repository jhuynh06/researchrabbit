const BACKEND_URL = "https://research-rabbit-app-m37s3.ondigitalocean.app/rank-chunks";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RR_RANK_CHUNKS") return false;

  rankChunks(message.payload)
    .then((body) => sendResponse({ ok: true, body }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function rankChunks(payload) {
  const response = await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.detail || "Backend request failed.");
  }
  return body;
}
