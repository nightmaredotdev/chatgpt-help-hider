'use strict';

// Static privacy check: the shipped extension (src/) must contain no code or
// references that could cause network activity or talk to external services.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SRC } = require('./helpers');

const files = fs.readdirSync(SRC, { recursive: true, withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => path.relative(SRC, path.join(d.parentPath, d.name)).split(path.sep).join('/'));

const ALLOWED_MATCH_PATTERN = 'https://chatgpt.com/*';

const FORBIDDEN = [
  [/\bfetch\s*\(/, 'fetch()'],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/WebSocket/, 'WebSocket'],
  [/EventSource/, 'EventSource'],
  [/sendBeacon/, 'navigator.sendBeacon'],
  [/importScripts/, 'importScripts'],
  [/RTCPeerConnection/, 'WebRTC'],
  [/\b(chrome|browser)\.[a-z]/, 'extension APIs'],
  [/@import/i, 'CSS @import'],
  [/url\s*\(/i, 'CSS url() resource load'],
  [/\b(?:https?|wss?|ftp):\/\//i, 'absolute URL'],
  [/(?:^|[\s"'(=])\/\/[a-z0-9-]+\./i, 'protocol-relative URL'],
  [/analytics|telemetry|tracking|sentry|google-?tag/i, 'analytics/telemetry reference'],
];

test('src/ contains only the manifest and stylesheet (no scripts)', () => {
  assert.deepEqual(files.sort(), ['content.css', 'manifest.json']);
});

for (const file of files) {
  test(`${file}: no network APIs or external references`, () => {
    let text = fs.readFileSync(path.join(SRC, file), 'utf8');
    if (file === 'manifest.json') text = text.split(ALLOWED_MATCH_PATTERN).join('');
    for (const [pattern, label] of FORBIDDEN) {
      assert.doesNotMatch(text, pattern, `${file} contains ${label}`);
    }
  });
}
