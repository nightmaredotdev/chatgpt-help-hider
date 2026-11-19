# Development

## Principles

- Use vanilla JavaScript and CSS with standard WebExtensions APIs. Avoid frameworks and runtime dependencies.
- Avoid a build step unless browser compatibility forces one. The `src/` directory *is* the extension.
- The extension must make no network requests and use no storage, analytics or telemetry.
- Use the narrowest possible selectors. If the extension can't be sure an element is the target, it does nothing.

## Repository layout

```
.
├── README.md
├── package.json            # dev tooling only (test script, jsdom); the extension has no dependencies
├── docs/
│   ├── DEVELOPMENT.md      # this file
│   └── INVESTIGATION.md    # how the approach was chosen (M0 investigation + final outcome)
├── src/                    # the extension itself; load this directory unpacked
│   ├── manifest.json       # shared manifest (Chrome, Edge, Firefox)
│   └── content.css         # the single hiding rule
└── tests/
    ├── fixtures/           # notice.html (target) and negatives.html (look-alikes)
    ├── helpers.js          # loads fixtures into jsdom with src/content.css applied
    ├── selector.test.js    # target matched, look-alikes not, dynamic insertion
    ├── manifest.test.js    # MV3, chatgpt.com only, no permissions/background
    └── static.test.js      # no network APIs or external references in src/
```

There's no `content.js`. CSS alone identifies the target, so no JavaScript is needed.

## Loading the extension locally

**Chrome / Edge**
1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select `src/`.
4. After editing files, click the reload icon on the extension card, then reload the ChatGPT tab.

Edge uses the same steps.

**Firefox**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `src/manifest.json`.
3. Temporary add-ons are removed when Firefox restarts. Standard Firefox only installs signed add-ons permanently, and no signed build exists yet. v1.0.2 adds the add-on ID that signing requires (see [Firefox add-on ID](#firefox-add-on-id)).

If nothing is hidden in Firefox, check the extension's permissions in `about:addons` and make sure access to `chatgpt.com` is allowed. In MV3, Firefox lets users revoke site access per extension.

## Testing

### Automated (offline)

Requires Node `^22.22.2 || ^24.15.0 || >=26` (the jsdom requirement).

```sh
npm install   # installs jsdom, the only dev dependency
npm test      # node --test
```

As of v1.0.2 the suite has 33 tests, all passing.

- **`selector.test.js`** reads the selector straight from `src/content.css`, applies the stylesheet in jsdom, and checks the following:
  - Both notices in `notice.html` are matched and get computed `display: none`.
  - Only the notice wrapper is hidden. The assistant message, turn and reply text stay visible.
  - Nothing in `negatives.html` is matched or hidden. That covers a user message and an assistant reply containing the phrase, a notice with the same structure but a different icon, a `role="alert"` notice, an info icon in a button, the info icon at the wrong depth, a different icon size, a wrapper missing a class, a wrapper with no icon, a fragment that's only a prefix match, and the phrase inside a `<script>`.
  - Notices inserted after load, rendered incrementally, re-rendered, or arriving after the whole page body is replaced are hidden.
- **`manifest.test.js`** checks the following:
  - It's MV3.
  - There's exactly one content stylesheet, matching only `https://chatgpt.com/*`, at `document_start`.
  - There's no JavaScript, no permissions of any kind, no background script and no exposed resources.
  - The Firefox add-on ID (`browser_specific_settings.gecko.id`) is exactly the permanent ID.
- **`static.test.js`** checks the following:
  - `src/` contains only `manifest.json` and `content.css`.
  - Neither file contains network APIs, extension APIs, CSS `url()`/`@import`, absolute URLs (other than the match pattern) or analytics references.

The fixtures' surrounding page markup and all negative cases are synthetic. Only the notice wrapper's structure comes from real captured markup. See the comments in each fixture.

### Firefox manifest lint

```sh
npx --yes web-ext lint --source-dir src --no-config-discovery
```

This is run on demand and isn't a project dependency. As of v1.0.2 it reports no errors and two warnings:

- **No errors.** v1.0.0 and v1.0.1 reported **`ADDON_ID_REQUIRED` (error)** because they had no add-on ID. Mozilla requires one for Manifest V3 extensions before signing or AMO submission, though not for loading as a temporary add-on. v1.0.2 sets the permanent ID (see [Firefox add-on ID](#firefox-add-on-id)), which resolves the error.
- **Two warnings (expected, non-blocking).** `data_collection_permissions` is recognised from Firefox 140 (Firefox for Android 142), while `strict_min_version` is 128. **Decision: keep 128.** The key is metadata declaring that no data is collected, not a runtime dependency. Firefox 128–139 doesn't recognise it but still loads the extension. It may show a manifest warning about the unrecognised property. The hiding behaviour doesn't depend on the key. These warnings are expected and don't block AMO submission.

### Firefox add-on ID

`src/manifest.json` sets `browser_specific_settings.gecko.id` to the permanent ID `{5a921c4b-e146-45b7-b5f2-2632c0b29fc1}`. v1.0.2 is the first release that includes it.

- **Never change or remove it.** Firefox and AMO identify the add-on by this ID. A different ID would be treated as a separate add-on, and existing installs wouldn't receive updates.
- Don't generate a new ID or replace it with an email-style ID.

### Manual checklist (live ChatGPT)

Run this in **each** of Chrome, Edge and Firefox with the extension loaded locally (unpacked in Chrome/Edge, as a temporary add-on in Firefox). Use a conversation where the "Help is available" notice appears.

1. **No extension errors.** The extension card in `chrome://extensions` / `edge://extensions` shows no errors. In Firefox, `about:debugging` shows no errors for the extension. Chrome/Edge may show a warning about the unrecognised `browser_specific_settings` key. That's expected and harmless.
2. **The notice is hidden.** Open the conversation. The "Help is available" box isn't visible, and it doesn't flash briefly during page load.
3. **The rest of the assistant message is still visible.** The reply text above the (hidden) notice, and the message's action buttons, are still shown.
4. **Nothing else disappears.** Compare against the page with the extension disabled. Only the notice box is missing. If anything else disappears (another notice, buttons, links), the selector is too broad. Record the element's outerHTML.
5. **Normal messages containing the phrase stay visible.** In a test chat, send a message containing "Help is available" or ask for a reply that uses the phrase. Both stay visible.
6. **Switching conversations.** Switch to another chat and back, using the sidebar without reloading. The notice stays hidden.
7. **Reloading ChatGPT.** Reload the page. The notice stays hidden.
8. **A newly inserted notice.** If a new reply arrives that includes the notice, it's hidden as it appears.
9. **Disable test.** Disable the extension and reload. The notice reappears, which confirms the extension is what hides it.
10. **No network activity.** In DevTools → Network, nothing is attributed to the extension. With no script, there's nothing that could make a request.

Record the browser name and version, the date and the result of each step.

### Manual verification record

| Browser | Result |
| --- | --- |
| Firefox | Notice hidden. Stays hidden after reload and after switching chats. Rest of the interface intact. Version not recorded. |
| Chrome | Notice hidden. Surrounding interface intact. Shared manifest loaded. Version not recorded; reload, chat-switch and error-panel checks not reported. |
| Edge | Works (confirmed by the maintainer after the v1.0.0 release). Version and individual checklist steps not recorded. |

### Fixture hygiene

Fixtures are snapshots of ChatGPT's markup. Before committing one, remove conversation text, names, emails, account identifiers and any other personal data. Keep only the structure and the fixed UI text needed to identify the element.

## Git workflow

- `main` is for releases only. All development happens on `dev`.
- The maintainer handles all commits, pushes, merges, tags and releases.
- Releases are published as GitHub Releases, tagged `vX.Y.Z` on `main`. Before a release, set the same version in `src/manifest.json`, `package.json` and `package-lock.json`.
- `browser_specific_settings.gecko.id` in `src/manifest.json` is permanent. Never change, remove or replace it in any release.
- Never commit build output, packaged `.zip`/`.xpi`/`.crx` files or signing keys (`*.pem`). `.gitignore` covers these.
