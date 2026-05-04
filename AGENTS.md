# ResearchRabbit AI Agent Guidance

## Project overview

ResearchRabbit is a small Chrome/Edge extension built with Manifest V3.
It injects a floating action button into web pages via `scripts/content.js`, uses `styles/floating-button.css` for page styling, and exposes a minimal `popup/popup.html` UI.

The backend is hosted externally on DigitalOcean App Platform (separate repo: `researchrabbit-backend`). The extension communicates with it via `scripts/background.js`.

## Key files

- `manifest.json` — extension metadata, permissions, content script registration.
- `scripts/content.js` — main injection logic, shadow DOM isolation, button UI, and page interactions.
- `scripts/background.js` — service worker that proxies requests to the remote backend.
- `styles/floating-button.css` — button styling loaded by the extension.
- `popup/popup.html` — extension popup content.
- `generate-icons.js` — Node.js helper to regenerate extension icons without external dependencies.

## What agents should know

- This repository is not a web app or Node package; it is a browser extension with no dependency management.
- The extension code is plain JavaScript and runs directly in the browser context.
- `content.js` is injected into every matched page and uses a Shadow DOM to avoid style collisions.
- The backend is NOT in this repo. It lives in a separate `researchrabbit-backend` repository deployed on DigitalOcean App Platform.
- `background.js` contains the `BACKEND_URL` constant pointing to the DO-hosted backend.
- Avoid adding build tooling, transpilation, or package-based dependency systems unless explicitly requested.
- Keep code changes small, simple, and self-contained to preserve extension loading behavior.

## Recommended workflow for changes

1. Update `manifest.json` only when changing extension metadata, permissions, or registered assets.
2. Modify `scripts/content.js` for runtime behavior and DOM injection logic.
3. Modify `scripts/background.js` for backend communication changes.
4. Use `styles/floating-button.css` for visual adjustments and layout fixes.
5. Regenerate icon files with `node generate-icons.js` if icon assets change.

## Testing notes

- Load the extension as an unpacked extension in Chrome/Edge using this repository root.
- Inspect the injected floating button behavior on arbitrary web pages.
- Verify the injected UI uses shadow DOM and does not leak page styles.
- The extension requires network access to the DO-hosted backend to function.

## Useful reminders

- `manifest_version: 3` requires `scripting` permission for script injection.
- `web_accessible_resources` is needed for any icon assets exposed to pages.
- The extension currently targets all HTTP and HTTPS pages via `matches` in `manifest.json`.
- `host_permissions` must include the backend domain (`*.ondigitalocean.app`).
