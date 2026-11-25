import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectIOSUserAgent,
  detectStandaloneDisplayMode,
  getPWAInstallMode,
  getThemeColorHex,
} from './pwa';

test('detectStandaloneDisplayMode recognizes display-mode and iOS navigator.standalone', () => {
  assert.equal(detectStandaloneDisplayMode(true, false), true);
  assert.equal(detectStandaloneDisplayMode(false, true), true);
  assert.equal(detectStandaloneDisplayMode(false, false), false);
  assert.equal(detectStandaloneDisplayMode(false, undefined), false);
});

test('detectIOSUserAgent identifies iPhone, iPad, and touch-enabled iPadOS', () => {
  assert.equal(
    detectIOSUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    ),
    true
  );
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5),
    true
  );
  assert.equal(
    detectIOSUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0),
    false
  );
  assert.equal(
    detectIOSUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile'
    ),
    false
  );
});

test('getPWAInstallMode prioritizes installed, native prompt, iOS guide, and manual guide', () => {
  assert.equal(
    getPWAInstallMode({ isInstalled: true, hasDeferredPrompt: true, isIOS: false }),
    'installed'
  );
  assert.equal(
    getPWAInstallMode({ isInstalled: false, hasDeferredPrompt: true, isIOS: false }),
    'native_prompt'
  );
  assert.equal(
    getPWAInstallMode({ isInstalled: false, hasDeferredPrompt: false, isIOS: true }),
    'ios_guide'
  );
  assert.equal(
    getPWAInstallMode({ isInstalled: false, hasDeferredPrompt: false, isIOS: false }),
    'manual_guide'
  );
});

test('getThemeColorHex maps dark and light modes to status bar colors', () => {
  assert.equal(getThemeColorHex('dark'), '#090B0E');
  assert.equal(getThemeColorHex('light'), '#FFFFFF');
});
