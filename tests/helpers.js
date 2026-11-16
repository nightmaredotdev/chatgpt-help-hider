'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const FIXTURES = path.join(__dirname, 'fixtures');

const CSS_TEXT = fs.readFileSync(path.join(SRC, 'content.css'), 'utf8');

/** Parse src/content.css through jsdom's CSSOM and return its style rules. */
function cssRules() {
  const dom = new JSDOM(`<!doctype html><style>${CSS_TEXT}</style>`);
  return [...dom.window.document.querySelector('style').sheet.cssRules];
}

/** The single hiding selector, read from the real stylesheet so tests never drift from it. */
function hidingSelector() {
  const rules = cssRules();
  if (rules.length !== 1) throw new Error(`expected exactly 1 CSS rule, found ${rules.length}`);
  return rules[0].selectorText;
}

/**
 * Load HTML into jsdom with the extension stylesheet appended to <head>,
 * mirroring how the browser injects the content stylesheet.
 */
function loadWithExtension(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const style = document.createElement('style');
  style.textContent = CSS_TEXT;
  document.head.append(style);
  return dom;
}

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

/** Markup of one notice wrapper, matching the user-supplied structure (inner text sanitised). */
function noticeMarkup({ hash = '895fa61ee7dda8e2', id = '' } = {}) {
  return `
    <div class="mt-3 flex flex-col gap-2"${id ? ` id="${id}"` : ''}>
      <div class="flex items-center gap-6 self-start rounded-2xl border border-default px-3 py-2.5 text-sm text-default md:p-4 w-fit">
        <div class="flex min-w-0 grow items-start gap-3">
          <svg aria-hidden="true" height="28" viewBox="0 0 28 28" width="28">
            <use href="/cdn/assets/icons-${hash}.svg#codex-icon-circle-info-light-28"></use>
          </svg>
          <div class="min-w-0 grow pt-[2px]">
            <div data-markdown-text-style="assistant-message"><p><strong>Help is available</strong></p></div>
          </div>
        </div>
      </div>
    </div>`;
}

module.exports = { ROOT, SRC, CSS_TEXT, cssRules, hidingSelector, loadWithExtension, fixture, noticeMarkup };
