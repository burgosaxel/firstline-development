import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRange } from '../../packages/contracts/src/index.ts';

test('date ranges are capped at 90 inclusive days', () => {
  assert.deepEqual(parseRange({ start: '2026-01-01', end: '2026-03-31' }), { start: '2026-01-01', end: '2026-03-31' });
  assert.throws(() => parseRange({ start: '2026-01-01', end: '2026-04-01' }));
});