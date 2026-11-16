# ChatGPT Help Hider

A small, standalone browser extension that hides the **"Help is available"** block that ChatGPT sometimes shows in its web interface.

> **Status: M1, first working version (in review).** You can load the extension unpacked for testing. Automated tests pass, and it has been checked manually on live ChatGPT in Firefox and Chrome. See [Project status](#project-status).

## Purpose

The extension removes one specific block from view in ChatGPT, and nothing else. It works automatically after installation, with no settings, popup or user interaction.

## Intended behaviour

- Hide **only** the "Help is available" block on `chatgpt.com`.
- Hide it whenever it appears, including after in-app navigation, a new response or a re-render.
- Leave everything else alone: conversations, other safety messages, moderation notices, generic alerts and the rest of the interface.
- Hide the block visually (CSS `display: none`). Don't delete it from the page or change how ChatGPT works.
- Work entirely locally: no network requests, no data collection, no storage, no analytics and no telemetry.

The extension only changes what appears in your own browser. It doesn't change anything on OpenAI's side.

## How it works

The extension is a single stylesheet (`src/content.css`) that the browser injects into `chatgpt.com`. There's no JavaScript. The rule matches the notice's outer wrapper only when its exact child structure ends in the notice's circle-info icon. Because it's plain CSS, it also applies to notices that appear later, after navigating between chats, and after re-renders.

## Supported browsers

| Browser         | Platform                       | Status |
| --------------- | ------------------------------ | ------ |
| Mozilla Firefox | Manifest V3 (WebExtensions)    | Manually tested (loaded unpacked): notice hidden; stays hidden after reload and switching chats; rest of UI intact |
| Google Chrome   | Manifest V3                    | Manually tested (loaded unpacked): notice hidden; rest of UI intact |
| Microsoft Edge  | Manifest V3 (Chromium)         | **Untested.** Expected to behave like Chrome, since it uses the same engine and manifest, but this hasn't been confirmed |

All three browsers share one manifest and one stylesheet.

Firefox signing and the permanent add-on ID are deferred until release preparation. Until then, Firefox can only load the extension as a temporary add-on.

## Installation

There are no store releases yet. For testing, load the extension unpacked (see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#loading-the-extension-locally)):

- **Chrome / Edge:** load the `src/` directory in developer mode.
- **Firefox:** load `src/manifest.json` as a temporary add-on via `about:debugging`.

You won't need a userscript manager or any other extension.

## Permissions

- **Access to `https://chatgpt.com/*` only**, through a content stylesheet declaration.
- No `permissions` or `host_permissions` entries (no `storage`, `tabs`, `scripting`, `webRequest`, etc.).
- No background script, no JavaScript, no network requests.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the development workflow, testing approach and Git conventions.

## Project status

| Milestone | Scope                                         | Status      |
| --------- | --------------------------------------------- | ----------- |
| M0        | Repository foundation and investigation       | Done        |
| M1        | Core extension (manifest, content stylesheet) | In review   |
| M2        | Dynamic UI handling and performance           | Not started |
| M3        | Cross-browser compatibility and packaging     | Not started |
| M4        | Testing and polish                            | Not started |
| M5        | Release preparation                           | Not started |

## License

No license has been chosen yet.
