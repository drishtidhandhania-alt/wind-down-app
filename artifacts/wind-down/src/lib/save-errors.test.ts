import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerErrorMessage, needsAccountGuidance } from './save-errors.ts';

test('uses a non-empty server response error message', () => {
  assert.equal(
    getServerErrorMessage(
      { data: { error: '  Connect this private tester to your account.  ' } },
      'Try again.',
    ),
    'Connect this private tester to your account.',
  );
});

test('uses the fallback for missing or malformed error bodies', () => {
  const fallback = 'The save did not work. Try again.';
  const malformedErrors: unknown[] = [
    undefined,
    null,
    new Error('request failed'),
    { data: undefined },
    { data: null },
    { data: 'not an object' },
    { data: { error: '' } },
    { data: { error: '   ' } },
    { data: { error: { message: 'not a string' } } },
  ];

  for (const error of malformedErrors) {
    assert.equal(getServerErrorMessage(error, fallback), fallback);
  }
});

test('shows account guidance for an unlinked private tester conflict', () => {
  assert.equal(
    needsAccountGuidance({
      status: 409,
      data: {
        error: 'Connect this private tester to your account before saving.',
      },
    }),
    true,
  );
});

test('shows account guidance for sign-in-required failures', () => {
  assert.equal(
    needsAccountGuidance({
      status: 401,
      data: { error: 'Sign in to continue.' },
    }),
    true,
  );
  assert.equal(
    needsAccountGuidance({
      status: 401,
      data: { error: 'Sign-in is required to save this routine.' },
    }),
    true,
  );
});

test('does not show account guidance for unrelated conflicts or invalid tokens', () => {
  assert.equal(
    needsAccountGuidance({
      status: 409,
      data: { error: 'A different token is already in use.' },
    }),
    false,
  );
  assert.equal(
    needsAccountGuidance({
      status: 401,
      data: { error: 'A valid private tester token is required.' },
    }),
    false,
  );
  assert.equal(
    needsAccountGuidance({
      status: 403,
      data: { error: 'This private tester belongs to another account.' },
    }),
    false,
  );
});
