'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SRC } = require('./helpers');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));

test('is Manifest V3 with required metadata', () => {
  assert.equal(manifest.manifest_version, 3);
  for (const key of ['name', 'version', 'description']) assert.equal(typeof manifest[key], 'string');
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
});

test('uses only expected top-level keys', () => {
  const allowed = new Set(['manifest_version', 'name', 'version', 'description', 'content_scripts', 'browser_specific_settings', 'icons']);
  for (const key of Object.keys(manifest)) assert.ok(allowed.has(key), `unexpected key "${key}"`);
});

test('requests no permissions and has no background, pages or exposed resources', () => {
  for (const key of [
    'permissions', 'optional_permissions', 'host_permissions', 'optional_host_permissions',
    'background', 'action', 'options_page', 'options_ui', 'web_accessible_resources',
    'externally_connectable', 'content_security_policy', 'declarative_net_request',
  ]) {
    assert.equal(manifest[key], undefined, `"${key}" must not be present`);
  }
});

test('injects one stylesheet, only on https://chatgpt.com, at document_start, no JS', () => {
  assert.equal(manifest.content_scripts.length, 1);
  const [cs] = manifest.content_scripts;
  assert.deepEqual(cs.matches, ['https://chatgpt.com/*']);
  assert.deepEqual(cs.css, ['content.css']);
  assert.equal(cs.js, undefined);
  assert.equal(cs.run_at, 'document_start');
  assert.notEqual(cs.all_frames, true);
  assert.equal(cs.match_about_blank, undefined);
  assert.equal(cs.match_origin_as_fallback, undefined);
  assert.equal(cs.world, undefined);
});

test('every referenced file exists', () => {
  for (const file of manifest.content_scripts.flatMap((cs) => cs.css ?? [])) {
    assert.ok(fs.existsSync(path.join(SRC, file)), `${file} missing`);
  }
});

test('Firefox settings declare the permanent add-on ID, no data collection and a minimum version', () => {
  const settings = manifest.browser_specific_settings;
  assert.deepEqual(Object.keys(settings), ['gecko']);
  assert.equal(settings.gecko.id, '{5a921c4b-e146-45b7-b5f2-2632c0b29fc1}');
  assert.deepEqual(settings.gecko.data_collection_permissions, { required: ['none'] });
  assert.match(settings.gecko.strict_min_version, /^\d+\.0$/);
});
