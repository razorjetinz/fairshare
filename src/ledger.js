/** Pure ledger helpers. All monetary calculations use integer cents. */
export function toCents(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('Amount must be a finite number');
  return Math.round((number + Number.EPSILON) * 100);
}

export function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

export function splitEqual(totalCents, memberIds) {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new RangeError('Total must be non-negative integer cents');
  if (!Array.isArray(memberIds) || memberIds.length === 0) throw new RangeError('Select at least one participant');
  const base = Math.floor(totalCents / memberIds.length);
  const remainder = totalCents - base * memberIds.length;
  return memberIds.map((memberId, index) => ({ memberId, cents: base + (index < remainder ? 1 : 0) }));
}

export function splitByWeights(totalCents, entries) {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new RangeError('Total must be non-negative integer cents');
  if (!Array.isArray(entries) || entries.length === 0) throw new RangeError('Add at least one split');
  const weights = entries.map(entry => Number(entry.weight));
  if (weights.some(weight => !Number.isFinite(weight) || weight < 0) || weights.every(weight => weight === 0)) {
    throw new RangeError('Split values must be non-negative and at least one must be greater than zero');
  }
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  const exact = weights.map(weight => (totalCents * weight) / sum);
  const floors = exact.map(Math.floor);
  const remainder = totalCents - floors.reduce((acc, value) => acc + value, 0);
  const order = exact.map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i += 1) floors[order[i].index] += 1;
  return entries.map((entry, index) => ({ memberId: entry.memberId, cents: floors[index] }));
}

export function calculateBalances({ groups, expenses, settlements }, groupId = 'all') {
  const allowed = groupId === 'all' ? null : groupId;
  const memberIds = new Set();
  const balances = new Map();
  const touch = id => {
    if (!balances.has(id)) balances.set(id, 0);
    memberIds.add(id);
  };
  for (const group of groups) {
    if (allowed && group.id !== allowed) continue;
    for (const id of group.memberIds) touch(id);
  }
  for (const expense of expenses) {
    if (allowed && expense.groupId !== allowed) continue;
    touch(expense.paidBy);
    balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + toCents(expense.amount));
    for (const share of expense.shares) {
      touch(share.memberId);
      balances.set(share.memberId, (balances.get(share.memberId) || 0) - toCents(share.amount));
    }
  }
  for (const settlement of settlements) {
    if (allowed && settlement.groupId !== allowed) continue;
    touch(settlement.fromId);
    touch(settlement.toId);
    const amount = toCents(settlement.amount);
    balances.set(settlement.fromId, (balances.get(settlement.fromId) || 0) + amount);
    balances.set(settlement.toId, (balances.get(settlement.toId) || 0) - amount);
  }
  return [...memberIds].map(memberId => ({ memberId, cents: balances.get(memberId) || 0 }));
}

export function simplifyDebts(balanceRows) {
  const debtors = balanceRows.filter(row => row.cents < 0).map(row => ({ memberId: row.memberId, cents: -row.cents }));
  const creditors = balanceRows.filter(row => row.cents > 0).map(row => ({ memberId: row.memberId, cents: row.cents }));
  debtors.sort((a, b) => b.cents - a.cents);
  creditors.sort((a, b) => b.cents - a.cents);
  const transfers = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].cents, creditors[j].cents);
    if (amount > 0) transfers.push({ fromId: debtors[i].memberId, toId: creditors[j].memberId, cents: amount });
    debtors[i].cents -= amount;
    creditors[j].cents -= amount;
    if (debtors[i].cents === 0) i += 1;
    if (creditors[j].cents === 0) j += 1;
  }
  return transfers;
}

export function validateLedger({ groups, expenses, settlements }) {
  const errors = [];
  const groupIds = new Set(groups.map(group => group.id));
  for (const expense of expenses) {
    if (!groupIds.has(expense.groupId)) errors.push('Expense ' + expense.id + ' references a missing group');
    const shares = expense.shares.reduce((sum, share) => sum + toCents(share.amount), 0);
    if (shares !== toCents(expense.amount)) errors.push('Expense ' + expense.id + ' shares do not equal its total');
  }
  for (const settlement of settlements) {
    if (settlement.groupId !== 'all' && !groupIds.has(settlement.groupId)) errors.push('Settlement ' + settlement.id + ' references a missing group');
  }
  const rows = calculateBalances({ groups, expenses, settlements });
  if (rows.reduce((sum, row) => sum + row.cents, 0) !== 0) errors.push('Ledger does not balance to zero');
  return errors;
}
