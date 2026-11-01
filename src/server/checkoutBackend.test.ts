import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCheckoutQuote,
  getPaymentGatewayConfiguration,
} from './checkoutBackend';

test('Checkout Backend: calculates 3-day rental without weekly discount', () => {
  const quote = computeCheckoutQuote({
    dailyRateINR: 1000,
    refundableDepositINR: 5000,
    startDate: '2026-11-10',
    endDate: '2026-11-13',
    minRentalDays: 1,
  });

  assert.equal(quote.valid, true);
  assert.equal(quote.days, 3);
  assert.equal(quote.baseRentalINR, 3000);
  assert.equal(quote.weeklyDiscountINR, 0, 'No weekly discount for < 7 days');
  // 5% of 3000 = 150
  assert.equal(quote.platformServiceFeeINR, 150);
  assert.equal(quote.netRentalCostINR, 3150);
  assert.equal(quote.totalUpfrontINR, 8150); // 3150 + 5000 deposit
});

test('Checkout Backend: calculates 7-day rental with 10% weekly discount', () => {
  const quote = computeCheckoutQuote({
    dailyRateINR: 1000,
    refundableDepositINR: 5000,
    startDate: '2026-11-10',
    endDate: '2026-11-17',
    minRentalDays: 1,
  });

  assert.equal(quote.valid, true);
  assert.equal(quote.days, 7);
  assert.equal(quote.baseRentalINR, 7000);
  // 10% of 7000 = 700
  assert.equal(quote.weeklyDiscountINR, 700);
  const netRentalFee = 7000 - 700; // 6300
  // 5% of 6300 = 315
  assert.equal(quote.platformServiceFeeINR, 315);
  assert.equal(quote.netRentalCostINR, 6615);
  assert.equal(quote.totalUpfrontINR, 11615); // 6615 + 5000 deposit
});

test('Checkout Backend: rejects invalid date order or below min days', () => {
  const invalidOrder = computeCheckoutQuote({
    dailyRateINR: 1000,
    refundableDepositINR: 5000,
    startDate: '2026-11-20',
    endDate: '2026-11-15',
  });
  assert.equal(invalidOrder.valid, false);

  const belowMin = computeCheckoutQuote({
    dailyRateINR: 1000,
    refundableDepositINR: 5000,
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    minRentalDays: 3,
  });
  assert.equal(belowMin.valid, false);
});

test('Checkout Backend: provides gateway evaluation status and notices', () => {
  const status = getPaymentGatewayConfiguration();
  assert.equal(status.provider, 'Razorpay');
  assert.ok(typeof status.isConfigured === 'boolean');
  assert.ok(typeof status.notice === 'string');
});
