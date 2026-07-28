# AutoFill Forms

A browser extension (Manifest V3) that fills web forms using a personal profile you save locally. It detects form fields on the page you're viewing, matches them to your saved info using a fast local matcher, falls back to Google's Gemini API for anything ambiguous, and fills them in — with a visual outline so you can review before submitting. **It never submits a form for you.**

Works in both **Chrome** and **Firefox** from the same codebase.

---

## Features

- **Smart field detection** — finds visible, fillable `input`, `select`, and `textarea` elements, correctly skipping hidden/disabled/submit/checkbox/radio fields
- **Robust label matching** — reads labels via `<label for>`, wrapping `<label>` tags, `aria-label`, `aria-labelledby`, and a fallback that walks nearby text — including a special case for Google Forms, which doesn't use standard label markup
- **Fuzzy matching** — a synonym dictionary + token-overlap scoring matches messy real-world field names (e.g. "Telephone:", "Surname", "E-mail Address") to your profile
- **AI fallback (optional)** — fields the local matcher can't confidently handle get sent to Gemini for a second pass, with per-domain result caching so repeat visits don't burn API calls
- **Safe filling** — uses the native property setter (not `el.value = x`) plus dispatched `input`/`change` events, so the fill actually registers on React/Vue-built forms
- **Clear visual feedback** — filled fields get a temporary yellow outline; the popup shows a summary ("Filled 9 of 10 matched fields") and lets you clear all fills with one click

---

## Project structure

```
manifest.json      Manifest V3 config — works in both Chrome and Firefox
schema.js           Profile schema + synonym dictionary (shared by content.js, options.js)
content.js           Field detection, matching, and filling — injected on demand
background.js       Service worker: Gemini API calls (avoids CORS) + per-domain match cache
popup.html/js       "Fill this form" button, summary, and clear button
options.html/js     Profile editor + Gemini API key input
icons/              Extension icon (16/48/128px)
test-page/          Local HTML form for testing without a live site
```

---

## Setting up your profile

1. Right-click the extension icon → **Options** (or click "Edit my profile" in the popup)
2. Fill in whichever fields you want — everything's optional, unfilled fields are just skipped
3. Optionally paste a **Gemini API key** (get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)) to enable the AI fallback for tricky fields. Without a key, the extension still works fine on its local fuzzy matcher alone
4. Click **Save**

---

## Loading it — Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**, select this folder
4. Pin the icon to your toolbar for easy access

To pick up changes after editing code: click the reload icon on the extension's card. **Icon or manifest changes specifically** sometimes need a full **Remove** + **Load unpacked** again, since Chrome aggressively caches icons.

## Loading it — Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` directly (not the folder — this is the one real difference from Chrome's loader)

Temporary add-ons unload when Firefox restarts, so you'll need to reload it each new session during development. As with Chrome, icon changes sometimes need a full **Remove** + reload rather than just the reload button.

---

## How it works

1. **Detection** (`content.js` → `detectFields()`) — walks all `input`/`select`/`textarea`, filters out ineligible ones, and pulls label/name/id/placeholder/type for each
2. **Fuzzy matching** (`matchFields()`) — scores each field against each profile key using token-overlap against the synonym dictionary in `schema.js`; greedy best-match assignment, one field per key
3. **AI fallback** (`llmMatchFields()` in `content.js`, handled by `background.js`) — whatever's left after fuzzy matching gets batched and sent to `background.js` via `chrome.runtime.sendMessage`, which calls Gemini directly (content scripts can't make cross-origin calls due to CORS) and caches the per-field decision under `llmCache:<domain>` in `chrome.storage.local`
4. **Filling** (`fillField()`) — uses `Object.getOwnPropertyDescriptor` to grab the native, unwrapped property setter before dispatching `input`/`change` events, so framework-controlled inputs (React, Vue, etc.) register the change correctly. Adds a yellow outline. Never calls `.submit()`.

---

## Known limitations (v1)

- **No iframe support** — fields inside `<iframe>` elements (same-origin or cross-origin) aren't detected. Common on payment forms and some embedded widgets.
- **No multi-step/multi-page form handling** — each page is filled independently.
- **No checkbox/radio support** — currently skipped entirely; not part of the profile schema.
- **No PDF form filling.**
- **No auto-submit**, ever, under any circumstances.
- **No cross-device profile sync** — `chrome.storage.local` is per-browser-profile, per-device.

---

## Permissions rationale

- `storage` — save your profile, API key, and per-domain LLM match cache locally
- `activeTab` + `scripting` — inject the detection/filling logic only when you click the button, on the tab you're currently viewing — not persistently on every page load
- `host_permissions: <all_urls>` — required so the extension can run on whatever site you're on when you click "Fill this form"

---

## Security & privacy notes

- Your Gemini API key is stored in `chrome.storage.local`, unencrypted, scoped to this extension — not synced, never sent anywhere except directly to Google's Gemini API from the background service worker
- The AI fallback only ever sends field **metadata** (label, name, id, placeholder, type) — never your actual profile values — to Gemini
- Don't use this on a shared computer with an API key tied to billing you care about; anyone with local file access to the browser profile could theoretically extract it
- Everything else — your profile data, the fill itself — never leaves your browser

---

## License

MIT — see [LICENSE](./LICENSE).
