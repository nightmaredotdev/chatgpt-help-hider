'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cssRules, hidingSelector, loadWithExtension, fixture, noticeMarkup } = require('./helpers');

const SELECTOR = hidingSelector();
const isHidden = (win, el) => win.getComputedStyle(el).display === 'none';

describe('content.css', () => {
  test('contains exactly one rule, and it only sets display:none !important', () => {
    const [rule] = cssRules();
    assert.equal(rule.style.length, 1);
    assert.equal(rule.style.getPropertyValue('display'), 'none');
    assert.equal(rule.style.getPropertyPriority('display'), 'important');
  });

  test('selector anchors on the icon fragment, not the asset hash', () => {
    assert.match(SELECTOR, /use\[href\$="#codex-icon-circle-info-light-28"\]/);
    assert.doesNotMatch(SELECTOR, /icons-[0-9a-f]+\.svg/);
  });
});

describe('positive fixture: real notice structure', () => {
  const dom = loadWithExtension(fixture('notice.html'));
  const win = dom.window;
  const doc = win.document;
  const matched = [...doc.querySelectorAll(SELECTOR)];
  const expected = [...doc.querySelectorAll('[data-expect="hidden"]')];

  test('matches both notice instances and nothing else', () => {
    assert.equal(expected.length, 2);
    assert.deepEqual(matched.map((e) => e.id), ['notice-1', 'notice-2']);
  });

  test('both notices are hidden by the stylesheet (computed style)', () => {
    for (const el of expected) assert.ok(isHidden(win, el), `${el.id} should be hidden`);
  });

  test('matches only the notice wrapper, not the message or turn around it', () => {
    for (const el of matched) {
      assert.ok(el.classList.contains('mt-3'));
      assert.equal(el.querySelector('[data-message-author-role], article'), null);
      assert.ok(el.parentElement.matches('[data-message-author-role="assistant"]'));
    }
    for (const el of doc.querySelectorAll('main, article, [data-message-author-role], .markdown')) {
      assert.ok(!el.matches(SELECTOR), `<${el.tagName.toLowerCase()}> must not match`);
      assert.ok(!isHidden(win, el), `<${el.tagName.toLowerCase()}> must stay visible`);
    }
  });

  test('the rest of each assistant message stays visible', () => {
    for (const el of expected) {
      const reply = el.parentElement.querySelector('.markdown');
      assert.ok(reply);
      assert.ok(!isHidden(win, reply));
    }
  });
});

describe('negative fixture: look-alikes stay visible', () => {
  const dom = loadWithExtension(fixture('negatives.html'));
  const win = dom.window;
  const doc = win.document;
  const cases = [...doc.querySelectorAll('section[data-case]')];

  test('fixture contains the expected cases', () => {
    const names = cases.map((s) => s.dataset.case);
    for (const required of [
      'user-message-with-phrase',
      'assistant-message-with-phrase',
      'other-notice-same-structure-different-icon',
      'moderation-alert-role',
      'info-icon-in-button',
      'similar-wrapper-no-icon',
    ]) {
      assert.ok(names.includes(required), `missing case ${required}`);
    }
    assert.ok(doc.querySelector('script#hydration-data').textContent.includes('Help is available'));
  });

  test('selector matches nothing in the whole document', () => {
    assert.deepEqual([...doc.querySelectorAll(SELECTOR)], []);
  });

  for (const section of cases) {
    test(`case "${section.dataset.case}": nothing hidden`, () => {
      for (const el of [section, ...section.querySelectorAll('*')]) {
        assert.ok(!el.matches(SELECTOR), `<${el.tagName.toLowerCase()}> matched`);
        assert.ok(!isHidden(win, el), `<${el.tagName.toLowerCase()}> hidden`);
      }
    });
  }

  test('case "script-text": the script containing the phrase is not matched', () => {
    assert.ok(!doc.querySelector('script#hydration-data').matches(SELECTOR));
  });
});

describe('dynamic DOM changes (CSS applies live, no script needed)', () => {
  const page = '<!doctype html><html><head></head><body><div data-message-author-role="assistant"><div class="markdown"><p>reply</p></div></div></body></html>';

  test('a notice inserted after load is hidden', () => {
    const dom = loadWithExtension(page);
    const msg = dom.window.document.querySelector('[data-message-author-role]');
    msg.insertAdjacentHTML('beforeend', noticeMarkup({ id: 'late' }));
    const el = dom.window.document.getElementById('late');
    assert.ok(el.matches(SELECTOR));
    assert.ok(isHidden(dom.window, el));
    assert.ok(!isHidden(dom.window, msg));
  });

  test('a notice rendered incrementally is hidden once its icon appears', () => {
    const dom = loadWithExtension(page);
    const doc = dom.window.document;
    const msg = doc.querySelector('[data-message-author-role]');
    msg.insertAdjacentHTML('beforeend', noticeMarkup({ id: 'partial' }));
    const el = doc.getElementById('partial');
    const svg = el.querySelector('svg');
    const row = svg.parentElement;
    svg.remove();
    assert.ok(!el.matches(SELECTOR), 'not matched before the icon exists');
    row.prepend(svg);
    assert.ok(el.matches(SELECTOR), 'matched once the icon is inserted');
    assert.ok(isHidden(dom.window, el));
  });

  test('a re-rendered (replaced) notice is hidden again; a different asset hash still matches', () => {
    const dom = loadWithExtension(page);
    const doc = dom.window.document;
    const msg = doc.querySelector('[data-message-author-role]');
    msg.insertAdjacentHTML('beforeend', noticeMarkup({ id: 'v1' }));
    doc.getElementById('v1').remove();
    msg.insertAdjacentHTML('beforeend', noticeMarkup({ id: 'v2', hash: 'ffffffffffffffff' }));
    assert.ok(isHidden(dom.window, doc.getElementById('v2')));
  });

  test('swapping a whole conversation (SPA navigation) keeps hiding new notices', () => {
    const dom = loadWithExtension(page);
    const doc = dom.window.document;
    doc.body.innerHTML = `<main><div data-message-author-role="assistant">${noticeMarkup({ id: 'nav' })}</div></main>`;
    assert.ok(isHidden(dom.window, doc.getElementById('nav')));
  });
});
