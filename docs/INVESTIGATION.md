# Technical investigation

This document has two parts:
- **Final outcome:** what v1.0.0 actually implements (unchanged in v1.0.1), and how each open question from the investigation was resolved.
- **Original M0 investigation:** preserved as written before the target markup was known. Its proposals, and its "will be verified" statements, are historical. Where they differ from the outcome, the outcome applies.

## Final outcome (v1.0.0)

The maintainer supplied DevTools output from live ChatGPT. It showed two notice instances in separate assistant messages, with the same structure and icon fragment. A third text match was inside a `<script>`. On that evidence, the extension uses the **CSS-only** approach:

```css
.mt-3.flex.flex-col.gap-2:has(> div > div > svg use[href$="#codex-icon-circle-info-light-28"]) { display: none !important; }
```

The selector is tested against fixtures (33 automated tests; see [DEVELOPMENT.md](DEVELOPMENT.md#testing)). It has been manually confirmed on live ChatGPT in Firefox and Chrome. After the v1.0.0 release, the maintainer also confirmed it works in Edge.

### How the M0 open questions were resolved

| M0 question | Outcome |
| --- | --- |
| CSS-only or hybrid (JavaScript + CSS)? | **CSS-only.** A stable structural hook exists, so there is no `content.js`, no text matching and no `MutationObserver`. |
| Dynamic insertion, navigation, re-render | Handled by CSS itself: the rule applies to matching elements whenever they appear. Covered by automated tests. Live: the notice stayed hidden after reload and after switching chats (Firefox). A notice arriving in a brand-new reply wasn't specifically reported in manual testing. |
| Flash of the notice during page load | `run_at: document_start` is set so the stylesheet applies before the page renders. The absence of a flash wasn't specifically reported in manual testing. |
| Shadow DOM / iframes | Content-script CSS doesn't reach into shadow roots or other frames. The rule works on live ChatGPT, so the notice is in the main document. |
| `chat.openai.com` | Not included. Only `https://chatgpt.com/*` is matched. The redirect wasn't specifically tested. |
| Firefox minimum version | `strict_min_version` stays at 128. `web-ext lint` warns that `data_collection_permissions` needs 140 (Android 142). Firefox 128–139 doesn't recognise the key, which only declares that no data is collected, but still loads the extension. It may show a manifest warning about the unrecognised property. **Decided in v1.0.1: keep 128.** The Firefox version used in manual testing wasn't recorded. |
| Firefox add-on ID | Not set. It's required for AMO signing, not for temporary loading. Deferred with marketplace distribution. |
| Chrome warning for `browser_specific_settings` | Chrome loaded the shared manifest. Whether it showed the expected non-blocking warning wasn't reported. |
| Per-browser build step | Not needed. One manifest is shared by all browsers. |
| Interface languages | The rule doesn't match text, so it's expected to work in any ChatGPT interface language. Only English was tested. |

### Known residual risk

The rule identifies the notice by structure and icon, not by text. If ChatGPT used this exact component and icon for a *different* notice, that notice would be hidden too. No such notice has been observed, but the negative fixtures are synthetic and can't rule it out. Manual checklist step 4 covers this.

---

# Original M0 investigation (historical)

*Written before any live DOM evidence was available. Kept for context; see [Final outcome](#final-outcome-v100) for what was actually built.*

## Verification status (at M0)

**Nobody has inspected the live ChatGPT DOM for this project yet.** The development environment has no browser and no ChatGPT session. This document deliberately proposes **no selector** for the target block. The detection rule will be written in M1 from real DevTools output (see [Information needed](#information-needed-from-devtools)).

The statements below about WebExtensions behaviour come from platform documentation. They will be re-checked in real browsers during M1 and M3.

## How the block can be hidden

### Options considered

| Approach | Pros | Cons |
| --- | --- | --- |
| **CSS-only content style** (`content_scripts[].css`) | No JavaScript, no flash of content, automatically covers dynamic insertion, SPA navigation and re-renders, near-zero CPU cost | Needs a stable structural hook (e.g. a `data-testid`, a unique `role`/`aria-*` combination, or an `:has()` pattern). CSS can't match on text. |
| **Content script + `MutationObserver`** | Can confirm text and structure before hiding, so it's very precise | Has to run on every DOM mutation, including heavy mutation during response streaming. Must be written carefully to stay cheap. |
| **Hybrid**: JavaScript identifies the element and marks it, and CSS hides the marked element | Precise and safe. Doesn't remove nodes, so React reconciliation isn't disturbed. Hiding is reversible. | Slightly more code than CSS alone |
| Removing nodes from the DOM | — | **Rejected.** Fights React's virtual DOM and can break re-renders or cause errors. |
| Intercepting network responses | — | **Rejected.** Needs broad permissions and changes app behaviour. |

### Recommendation

1. **If the DevTools output shows a stable, unique structural hook**, use **CSS only**. One `content.css` file, injected at document start. It's the simplest and most robust option.
2. **Otherwise use the hybrid.** `content.js` finds candidates with a narrow structural selector, confirms them with an exact text check, and sets an attribute (e.g. `data-chh-hidden`). `content.css` contains `[data-chh-hidden] { display: none !important; }`.

The extension won't use a text match alone. A user message or an assistant reply that contains the words "Help is available" must **never** be hidden. Detection needs a structural anchor that excludes message content as well as the text.

### Dynamic insertion, navigation and re-rendering

- ChatGPT is a single-page app. Moving between conversations doesn't reload the document, so a content script injected once per page load stays active for the whole session. **No `history` patching or navigation listener is needed.**
- **CSS approach:** stylesheet rules apply to any matching element whenever it's inserted. No observer is needed.
- **Hybrid approach:** one `MutationObserver` on `document.documentElement` with `{ childList: true, subtree: true }`. To keep it cheap:
  - Look only at `addedNodes` that are elements. Skip text nodes and attribute changes.
  - Run one `querySelectorAll` with the narrow candidate selector per added subtree, then check text only on those candidates.
  - Don't scan the whole document after the initial pass.
  - `MutationObserver` callbacks run as microtasks before the next paint, so a hidden block shouldn't flash on screen. This will be verified in M1/M2.
  - Response streaming generates many mutations. M2 will measure the callback cost and add batching (e.g. one pass per animation frame) only if measurements justify it.
- **Shadow DOM / iframes:** not expected in ChatGPT's React UI, but unverified. The DevTools output will confirm this. Content scripts will run in the top frame only (`all_frames: false`).

## Architecture

```
src/
├── manifest.json   shared by Chrome, Edge and Firefox
├── content.css     hiding rule
└── content.js      only if the hybrid approach is needed
```

- **One shared manifest, no build step.** No background script is needed, so the main MV3 difference between Chromium and Firefox (`service_worker` vs `scripts`) doesn't apply. Firefox-specific settings go in `browser_specific_settings.gecko` (add-on ID, minimum version, and the `data_collection_permissions` declaration that AMO requires of new extensions, set to `none`). Chrome ignores that key and shows a non-blocking "unrecognized manifest key" warning when the extension is loaded unpacked. If that warning becomes a problem for store submission, M3 can add a tiny script that writes per-browser manifests into `dist/`. Until then, a build step isn't worth it.
- **Every file is shared.** No browser-specific code is expected. The content script will use only standard DOM APIs, not `chrome.*` or `browser.*`.
- **Script timing:** `run_at: "document_start"` for CSS so the block never paints. For JavaScript, `document_start` plus an initial pass once `document.body` exists.

### Permissions

| Item | Value | Why |
| --- | --- | --- |
| `content_scripts[].matches` | `https://chatgpt.com/*` | The only site the extension acts on. `chat.openai.com` redirects to `chatgpt.com`, so it isn't needed. This will be confirmed during M1 testing. |
| `permissions` | *(none)* | No storage, tabs, scripting or network APIs are used |
| `host_permissions` | *(none)* | Declaring a content script is enough to inject into the page |
| Background / service worker | *(none)* | Nothing to coordinate |

Firefox note: in Manifest V3, Firefox treats content script match patterns as host permissions. Since Firefox 127 these are granted at install time. Older versions required the user to grant them manually. Proposed `strict_min_version`: **128** (the current ESR line). This will be verified in M3.

CSS `:has()` (if used) requires Chrome/Edge 105+ and Firefox 121+, which are within the proposed minimums.

## Testing strategy

Keep this lightweight. Use Node's built-in test runner (`node --test`, no framework) and at most one dev dependency (`jsdom`) to provide a DOM.

| Concern | Test |
| --- | --- |
| Identifies and hides the target | Fixture with the real (sanitised) block, which must be hidden |
| Leaves other safety UI visible | Fixtures for other safety and moderation notices, generic alerts, and **user and assistant messages containing the phrase "Help is available"**, none of which may be hidden |
| Dynamic insertion | Insert the target into a jsdom document after the observer starts and check that it's hidden. Insert look-alikes and check that they aren't. |
| Navigation and re-render | Remove and re-insert the container, replace the subtree (simulating a React re-render), and check the result each time |
| Permissions | Test that parses `manifest.json` and checks for no `permissions`, no `host_permissions`, no background, and `matches` limited to `https://chatgpt.com/*` |
| No network activity | Static scan of `src/` for `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `importScripts`, remote URLs and `chrome.`/`browser.` API use. During manual testing, the DevTools Network panel filtered to the extension shows no requests. |
| Chromium compatibility | Manual checklist in Chrome and Edge (load unpacked, verify hide, navigate between chats, reload, start a new chat) |
| Firefox compatibility | `npx web-ext lint --source-dir src` plus the same manual checklist in Firefox |

If the CSS-only approach is chosen, the jsdom tests become selector tests: the fixture must match and every negative fixture must not. Full end-to-end automation of a logged-in ChatGPT session (e.g. Playwright) is **not** recommended. It needs real credentials, is fragile, and costs more than it's worth for an extension this size.

## Information needed from DevTools

Please collect the following in a browser where the block is visible.

1. **A screenshot** showing where the block appears: inside a conversation turn, above or below the composer, or as an overlay or banner.
2. **The block's `outerHTML`.** Right-click the block, choose **Inspect**, select the element that wraps the *whole* block, then right-click it in the Elements panel and choose **Copy → Copy outerHTML**. **Remove conversation text and any personal data before sharing.**
3. **The ancestor chain.** Run the snippet below in the DevTools Console on the page showing the block. It prints only tag names and identifying attributes for each match and its ancestors. It doesn't send anything anywhere. Run it in a conversation where you haven't typed the phrase yourself, and review the output before sharing.
4. **When it appears:** on page load of an existing conversation, only after a new reply arrives, or both? Does it come back after a reload or after switching chats?
5. **Your ChatGPT interface language.** Is English the only language that needs support? Text matching is language-specific.
6. **Optional but valuable:** the `outerHTML` (sanitised) of any *other* safety or moderation notice you've seen, to use as a negative fixture.

```js
(() => {
  const NEEDLE = 'Help is available';
  const keep = (n) => n === 'id' || n === 'role' || n === 'class' || n.startsWith('aria-') || n.startsWith('data-');
  const describe = (el) =>
    `<${el.tagName.toLowerCase()} ${[...el.attributes]
      .filter((a) => keep(a.name))
      .map((a) => `${a.name}="${a.value.slice(0, 120)}"`)
      .join(' ')}>`;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes(NEEDLE)) hits.push(walker.currentNode.parentElement);
  }
  hits.forEach((el, i) => {
    const lines = [];
    for (let node = el, d = 0; node && node !== document.body && d < 15; node = node.parentElement, d++) {
      lines.push('  '.repeat(d) + describe(node));
    }
    console.log(`Match ${i + 1}:\n${lines.join('\n')}`);
  });
  console.log(`${hits.length} match(es); shadow roots on page: ${
    [...document.querySelectorAll('*')].filter((e) => e.shadowRoot).length}`);
})();
```
