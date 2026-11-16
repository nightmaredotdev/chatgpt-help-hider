# ChatGPT Help Hider

A small, standalone browser extension that hides the **"Help is available"** support notice that ChatGPT sometimes shows in its web interface.

> **Status: v1.0.1.** CSS-only, with no runtime JavaScript. Manually tested on live ChatGPT in Chrome, Firefox and Edge. All 33 automated tests pass. Distributed through [GitHub Releases](https://github.com/nightmaredotdev/chatgpt-help-hider/releases) only; it isn't on any browser marketplace.

## Purpose

The extension removes one specific notice from view in ChatGPT, and nothing else. It works automatically once loaded, with no settings, popup or user interaction.

## Behaviour

- Hides **only** the "Help is available" notice on `chatgpt.com`.
- Hides it whenever it appears, including after in-app navigation, a new response or a re-render.
- Leaves everything else alone: the rest of the assistant message, conversations, other safety messages, moderation notices, generic alerts and the rest of the interface.
- Hides the notice visually (CSS `display: none`). It doesn't delete it from the page or change how ChatGPT works.
- Works entirely locally: no network requests, no data collection, no storage, no analytics and no telemetry.

The extension only changes what appears in your own browser. It doesn't change anything on OpenAI's side.

## How it works

The extension is a single stylesheet (`src/content.css`) that the browser injects into `chatgpt.com`. There's no JavaScript. It uses one narrow structural selector, written from the notice's markup as observed in the live ChatGPT page:

```css
.mt-3.flex.flex-col.gap-2:has(> div > div > svg use[href$="#codex-icon-circle-info-light-28"])
```

The rule matches the notice's outer wrapper only when its exact child structure ends in the notice's circle-info icon. It doesn't depend on message IDs or other generated values, or on the icon file's changing name. Because it's plain CSS, it also applies to notices that appear later, after navigating between chats, and after re-renders.

### Limitations

- **ChatGPT markup changes.** If ChatGPT changes the notice's structure, classes or icon, the rule stops matching and the notice simply reappears. Nothing else is affected, but the extension would need an update.
- **Same component, different notice.** The rule identifies the notice by structure and icon, not by its text. If ChatGPT showed a *different* notice with this exact structure and icon, it would be hidden too. No such case has been observed.
- **Other interface languages.** Matching doesn't depend on text, so it's expected to work in any ChatGPT interface language, but only English has been tested.

## Supported browsers

| Browser         | Platform                       | Status |
| --------------- | ------------------------------ | ------ |
| Mozilla Firefox | Manifest V3 (WebExtensions)    | Manually tested (loaded locally): notice hidden; stays hidden after reload and switching chats; rest of UI intact |
| Google Chrome   | Manifest V3                    | Manually tested (loaded unpacked): notice hidden; rest of UI intact |
| Microsoft Edge  | Manifest V3 (Chromium)         | Manually tested: confirmed working |

All three browsers share one manifest and one stylesheet.

## Installation

The extension isn't published on the Chrome Web Store, Microsoft Edge Add-ons or Mozilla Add-ons. You install it from a local copy of the source.

**1. Get the source**, in either of these ways:

- Download the **Source code** archive (`.zip` or `.tar.gz`) from the [Releases page](https://github.com/nightmaredotdev/chatgpt-help-hider/releases) and extract it.
- Clone the repository with Git.

Either way, the extension itself is the `src/` directory inside the downloaded folder. That's the folder you give the browser. Keep it somewhere permanent: browsers load the extension from that folder rather than copying it.

You won't need a userscript manager or any other extension.

**2. Load it into your browser.**

*Chrome*
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right corner).
3. Click **Load unpacked** and select the `src/` directory.

The extension stays loaded across browser restarts as long as the `src/` directory stays where it is.

*Firefox*
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `src/manifest.json` file.

A temporary add-on is **removed when Firefox restarts**, and you'll need to repeat these steps after every restart. Standard Firefox only installs signed add-ons permanently, and this release doesn't include a signed add-on.

*Edge*

Follow the Chrome steps at `edge://extensions`: turn on **Developer mode**, click **Load unpacked**, and select the `src/` directory.

**Updating.** Loaded extensions don't update automatically. To install a newer release:

1. Download the new release.
2. Replace the contents of your existing `src/` directory with the new release's `src/` directory.
3. Reload the extension:
   - **Chrome / Edge:** click the reload icon on the extension's card in `chrome://extensions` (or `edge://extensions`). If you put the new version in a different folder instead, remove the old extension and use **Load unpacked** on the new `src/` directory.
   - **Firefox:** click **Reload** next to the extension in `about:debugging#/runtime/this-firefox`. If Firefox has restarted since, load `src/manifest.json` again as a temporary add-on.

Then reload any open ChatGPT tabs.

## Permissions

- **Access to `https://chatgpt.com/*` only**, through a content stylesheet declaration.
- No `permissions` or `host_permissions` entries (no `storage`, `tabs`, `scripting`, `webRequest`, etc.).
- No background script, no JavaScript, no network requests.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the development workflow, tests, manual checklist and Git conventions. [docs/INVESTIGATION.md](docs/INVESTIGATION.md) records how the approach was chosen.

## Project status

| Milestone | Scope                                         | Status |
| --------- | --------------------------------------------- | ------ |
| M0        | Repository foundation and investigation       | Done |
| M1        | Core extension (manifest, content stylesheet) | Done |
| M2        | Dynamic UI handling and performance           | Done — CSS-only implementation; no JavaScript or MutationObserver required |
| M3        | Cross-browser compatibility and packaging     | Partially done — Chrome, Firefox and Edge manually tested; marketplace packaging deferred |
| M4        | Testing and polish                            | Done — 33 automated tests pass, plus manual testing in Chrome, Firefox and Edge |
| M5        | Release preparation                           | Done for GitHub v1.0.0; browser marketplace distribution deferred |

The milestones were planned before the target markup was known, on the assumption that dynamic content might need a JavaScript observer. The notice turned out to be identifiable with CSS alone, so M2's dynamic handling needed no separate work: a stylesheet handles notices that appear later, navigation and re-renders on its own, with nothing to observe or tune. The automated test suite planned for M4 was also built during M1.

Marketplace distribution is deferred. That includes Firefox signing, a permanent Firefox add-on ID and store packages.

## License

Released under the [MIT License](LICENSE).
