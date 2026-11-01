import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOWED_CONTACT_CATEGORIES,
  validateContactEnquiryInput,
} from './contactBackend';

test('Contact Backend: validateContactEnquiryInput validates valid enquiries and rejects invalid inputs', () => {
  const valid = validateContactEnquiryInput({
    name: 'Ananya Roy',
    email: 'ananya@example.com',
    category: 'General Enquiry',
    subject: 'Partnership in Bangalore tech hubs',
    message: 'We operate a co-working space in Indiranagar and would love to explore setting up a BorrowBox hub.',
  });

  assert.equal(valid.valid, true);
  assert.equal(valid.cleanData?.name, 'Ananya Roy');
  assert.equal(valid.cleanData?.category, 'General Enquiry');

  // Rejects invalid email
  const invalidEmail = validateContactEnquiryInput({
    name: 'Ananya Roy',
    email: 'not-an-email',
    category: 'General Enquiry',
    subject: 'Valid Subject',
    message: 'Valid message exceeding 10 characters length.',
  });
  assert.equal(invalidEmail.valid, false);
  assert.ok(invalidEmail.error?.includes('valid email'));

  // Rejects invalid category
  const invalidCategory = validateContactEnquiryInput({
    name: 'Ananya Roy',
    email: 'ananya@example.com',
    category: 'NonExistentCategory',
    subject: 'Valid Subject',
    message: 'Valid message exceeding 10 characters length.',
  });
  assert.equal(invalidCategory.valid, false);

  // Rejects short message
  const shortMessage = validateContactEnquiryInput({
    name: 'Ananya Roy',
    email: 'ananya@example.com',
    category: 'Rental Assistance',
    subject: 'Need help',
    message: 'Too short',
  });
  assert.equal(shortMessage.valid, false);
  assert.ok(shortMessage.error?.includes('between 10 and 2,500'));
});

test('Contact Backend: ALLOWED_CONTACT_CATEGORIES contains all required categories', () => {
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('General Enquiry'));
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('Rental Assistance'));
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('Listing Assistance'));
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('Partnership'));
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('Technical Issue'));
  assert.ok(ALLOWED_CONTACT_CATEGORIES.includes('Other'));
});
