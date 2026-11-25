import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BRANDING,
  formatMoney,
  getCurrencyOption,
  resolveGymBranding,
  splitBrandWordmark,
} from './branding';

test('formatMoney formats amounts accurately for INR, USD, EUR, GBP, and AED', () => {
  assert.equal(formatMoney(1000, 'INR'), '₹1,000');
  assert.equal(formatMoney(125000, 'INR'), '₹1,25,000');
  assert.equal(formatMoney(1500, 'USD'), '$1,500');
  assert.equal(formatMoney(95, 'EUR'), '€95');
  assert.equal(formatMoney(240, 'GBP'), '£240');
  assert.equal(formatMoney(500, 'AED'), 'AED 500');
});

test('resolveGymBranding sanitizes invalid inputs and preserves valid branding', () => {
  assert.deepEqual(resolveGymBranding(null), DEFAULT_BRANDING);
  assert.deepEqual(resolveGymBranding({ gymName: '   ', currency: 'INVALID' }), DEFAULT_BRANDING);

  const custom = resolveGymBranding({
    gymName: '  Titan Strength Club  ',
    logoUrl: 'data:image/png;base64,abc',
    currency: 'USD',
  });
  assert.equal(custom.gymName, 'Titan Strength Club');
  assert.equal(custom.logoUrl, 'data:image/png;base64,abc');
  assert.equal(custom.currency, 'USD');
  assert.equal(getCurrencyOption('USD').symbol, '$');
});

test('splitBrandWordmark splits default and custom gym names cleanly', () => {
  assert.deepEqual(splitBrandWordmark('IronPulse Gym'), {
    lead: 'IRON',
    accent: 'PULSE',
    trailing: 'GYM',
  });
  assert.deepEqual(splitBrandWordmark('Titan Athletics'), {
    lead: 'TITAN',
    accent: 'ATHLETICS',
    trailing: '',
  });
  assert.deepEqual(splitBrandWordmark('Apex Iron Club'), {
    lead: 'APEX',
    accent: 'IRON',
    trailing: 'CLUB',
  });
});
