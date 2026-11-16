import test from 'node:test';
import assert from 'node:assert/strict';
import { splitEqual, splitByWeights, simplifyDebts, calculateBalances, toCents, validateLedger } from '../src/ledger.js';

test('equal split distributes remainder cents without losing money', () => {
  assert.deepEqual(splitEqual(1000, ['a', 'b', 'c']), [
    { memberId: 'a', cents: 334 }, { memberId: 'b', cents: 333 }, { memberId: 'c', cents: 333 }
  ]);
});

test('weighted split allocates exact total cents', () => {
  const result = splitByWeights(10000, [
    { memberId: 'a', weight: 50 }, { memberId: 'b', weight: 30 }, { memberId: 'c', weight: 20 }
  ]);
  assert.deepEqual(result.map(row => row.cents), [5000, 3000, 2000]);
  assert.equal(result.reduce((sum, row) => sum + row.cents, 0), 10000);
});

test('debt simplification settles all balances with exact, zero-loss transfers', () => {
  const transfers = simplifyDebts([
    { memberId: 'a', cents: -7000 }, { memberId: 'b', cents: -3000 },
    { memberId: 'c', cents: 6000 }, { memberId: 'd', cents: 4000 }
  ]);
  assert.equal(transfers.length, 3);
  const net = new Map();
  for (const item of transfers) {
    net.set(item.fromId, (net.get(item.fromId) || 0) + item.cents);
    net.set(item.toId, (net.get(item.toId) || 0) - item.cents);
  }
  assert.equal(net.get('a'), 7000);
  assert.equal(net.get('b'), 3000);
  assert.equal(net.get('c'), -6000);
  assert.equal(net.get('d'), -4000);
});

test('expense shares and settlements produce zero-sum balances', () => {
  const data = {
    groups: [{ id: 'g', memberIds: ['a', 'b'] }],
    expenses: [{ id: 'e', groupId: 'g', amount: 10, paidBy: 'a', shares: [{ memberId: 'a', amount: 5 }, { memberId: 'b', amount: 5 }] }],
    settlements: [{ id: 's', groupId: 'g', fromId: 'b', toId: 'a', amount: 5 }]
  };
  assert.deepEqual(calculateBalances(data).map(row => row.cents), [0, 0]);
  assert.deepEqual(validateLedger(data), []);
});

test('money conversion rounds to cents', () => {
  assert.equal(toCents(12.345), 1235);
});

test('a cross-group settlement affects the overall balance, not an arbitrary group balance', () => {
  const data = {
    groups: [
      { id: 'g1', memberIds: ['a', 'b'] },
      { id: 'g2', memberIds: ['a', 'b'] }
    ],
    expenses: [
      { id: 'e1', groupId: 'g1', amount: 10, paidBy: 'a', shares: [{ memberId: 'a', amount: 5 }, { memberId: 'b', amount: 5 }] }
    ],
    settlements: [
      { id: 's1', groupId: 'all', fromId: 'b', toId: 'a', amount: 5 }
    ]
  };
  const overall = new Map(calculateBalances(data).map(row => [row.memberId, row.cents]));
  const groupOnly = new Map(calculateBalances(data, 'g1').map(row => [row.memberId, row.cents]));
  assert.equal(overall.get('a'), 0);
  assert.equal(overall.get('b'), 0);
  assert.equal(groupOnly.get('a'), 500);
  assert.equal(groupOnly.get('b'), -500);
  assert.deepEqual(validateLedger(data), []);
});
