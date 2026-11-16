import { calculateBalances, splitEqual, splitByWeights, toCents, fromCents, simplifyDebts, validateLedger } from './ledger.js';

const STORAGE_KEY = 'fairshare-data-v1';
const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastRoot = document.querySelector('#toast-root');

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = days => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};
const uid = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

function seedData() {
  const people = [
    { id: 'alex', name: 'Alex Morgan', email: 'alex@example.com' },
    { id: 'jamie', name: 'Jamie Lee', email: 'jamie@example.com' },
    { id: 'sam', name: 'Sam Rivera', email: 'sam@example.com' },
    { id: 'taylor', name: 'Taylor Kim', email: 'taylor@example.com' },
    { id: 'casey', name: 'Casey Brooks', email: 'casey@example.com' },
    { id: 'jordan', name: 'Jordan Patel', email: 'jordan@example.com' }
  ];
  const groups = [
    { id: 'nyc', name: 'Weekend in New York', emoji: '🌆', color: 'purple', memberIds: ['alex', 'jamie', 'sam', 'taylor'], createdAt: daysAgo(15) },
    { id: 'home', name: 'Apartment 2B', emoji: '🏡', color: 'green', memberIds: ['alex', 'jamie', 'casey'], createdAt: daysAgo(55) },
    { id: 'road', name: 'Summer road trip', emoji: '🚙', color: 'orange', memberIds: ['alex', 'sam', 'jordan'], createdAt: daysAgo(32) }
  ];
  const expenses = [
    { id: 'e1', groupId: 'nyc', description: 'Dinner at Lilia', amount: 148.8, currency: 'USD', paidBy: 'alex', shares: [{ memberId: 'alex', amount: 37.2 }, { memberId: 'jamie', amount: 37.2 }, { memberId: 'sam', amount: 37.2 }, { memberId: 'taylor', amount: 37.2 }], category: 'Food & drink', date: daysAgo(1), note: 'Pasta and dessert' },
    { id: 'e2', groupId: 'nyc', description: 'Ride to the hotel', amount: 42, currency: 'USD', paidBy: 'jamie', shares: [{ memberId: 'alex', amount: 14 }, { memberId: 'jamie', amount: 14 }, { memberId: 'sam', amount: 14 }], category: 'Transport', date: daysAgo(2), note: '' },
    { id: 'e3', groupId: 'nyc', description: 'Museum tickets', amount: 96, currency: 'USD', paidBy: 'sam', shares: [{ memberId: 'alex', amount: 24 }, { memberId: 'jamie', amount: 24 }, { memberId: 'sam', amount: 24 }, { memberId: 'taylor', amount: 24 }], category: 'Activities', date: daysAgo(3), note: '' },
    { id: 'e4', groupId: 'home', description: 'Weekly groceries', amount: 86.4, currency: 'USD', paidBy: 'alex', shares: [{ memberId: 'alex', amount: 28.8 }, { memberId: 'jamie', amount: 28.8 }, { memberId: 'casey', amount: 28.8 }], category: 'Groceries', date: daysAgo(2), note: '' },
    { id: 'e5', groupId: 'home', description: 'Internet bill', amount: 64.99, currency: 'USD', paidBy: 'casey', shares: [{ memberId: 'alex', amount: 21.66 }, { memberId: 'jamie', amount: 21.66 }, { memberId: 'casey', amount: 21.67 }], category: 'Bills & utilities', date: daysAgo(8), note: 'Monthly plan' },
    { id: 'e6', groupId: 'road', description: 'Cabin for two nights', amount: 270, currency: 'USD', paidBy: 'jordan', shares: [{ memberId: 'alex', amount: 90 }, { memberId: 'sam', amount: 90 }, { memberId: 'jordan', amount: 90 }], category: 'Accommodation', date: daysAgo(11), note: '' },
    { id: 'e7', groupId: 'road', description: 'Fuel stop', amount: 58.5, currency: 'USD', paidBy: 'alex', shares: [{ memberId: 'alex', amount: 19.5 }, { memberId: 'sam', amount: 19.5 }, { memberId: 'jordan', amount: 19.5 }], category: 'Transport', date: daysAgo(10), note: '' }
  ];
  return { version: 1, currentUserId: 'alex', people, groups, expenses, settlements: [], settings: { currency: 'USD', theme: 'light' } };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedData();
    const parsed = JSON.parse(saved);
    if (parsed?.version !== 1 || !Array.isArray(parsed.people) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.settlements)) return seedData();
    if (validateLedger(parsed).length) return seedData();
    return { ...seedData(), ...parsed, settings: { currency: 'USD', theme: 'light', ...parsed.settings } };
  } catch (error) {
    console.warn('FairShare could not read saved data; loading demo data.', error);
    return seedData();
  }
}

let data = loadData();
let ui = { page: 'overview', selectedGroupId: null, expenseQuery: '', expenseGroup: 'all', balanceGroup: 'all', modal: null };

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function person(id) { return data.people.find(item => item.id === id) || { id, name: 'Unknown person', email: '' }; }
function group(id) { return data.groups.find(item => item.id === id); }
function groupMembers(id) { const item = group(id); return item ? item.memberIds.map(person).filter(Boolean) : []; }
function currency() { return data.settings.currency || 'USD'; }
function money(value) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency(), minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
function moneyCents(cents) { return money(fromCents(cents)); }
function dateLabel(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function initials(name) { return String(name || '?').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase(); }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function avatar(id, size = '') {
  const p = person(id);
  return `<span class="avatar ${size}" title="${escapeHtml(p.name)}">${escapeHtml(initials(p.name))}</span>`;
}
function toast(message, type = 'success') {
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  toastRoot.append(node);
  requestAnimationFrame(() => node.classList.add('show'));
  setTimeout(() => { node.classList.remove('show'); setTimeout(() => node.remove(), 250); }, 2800);
}
function currentUser() { return person(data.currentUserId); }
function balanceFor(groupId = 'all') { return calculateBalances(data, groupId); }
function balanceOf(memberId, groupId = 'all') { return balanceFor(groupId).find(row => row.memberId === memberId)?.cents || 0; }
function groupTransactions(groupId) {
  return [
    ...data.expenses.filter(item => item.groupId === groupId).map(item => ({ ...item, kind: 'expense' })),
    ...data.settlements.filter(item => item.groupId === groupId).map(item => ({ ...item, kind: 'settlement' }))
  ].sort((a, b) => b.date.localeCompare(a.date));
}
function allTransactions() {
  return [
    ...data.expenses.map(item => ({ ...item, kind: 'expense' })),
    ...data.settlements.map(item => ({ ...item, kind: 'settlement' }))
  ].sort((a, b) => b.date.localeCompare(a.date));
}
function displayTitle() {
  return ({ overview: 'Overview', expenses: 'Expenses', groups: 'Your groups', balances: 'Balances', people: 'People', activity: 'Activity', settings: 'Settings' })[ui.page] || 'Overview';
}
function groupChip(item) { return `<span class="group-chip ${escapeHtml(item.color || 'purple')}"><span>${escapeHtml(item.emoji || '👥')}</span>${escapeHtml(item.name)}</span>`; }

function expenseCard(item, compact = false) {
  const g = group(item.groupId);
  const isSettlement = item.kind === 'settlement';
  const payer = person(isSettlement ? item.fromId : item.paidBy);
  const share = isSettlement ? 0 : (item.shares || []).find(row => row.memberId === data.currentUserId)?.amount || 0;
  const paid = !isSettlement && item.paidBy === data.currentUserId;
  const rightLabel = isSettlement ? `${payer.name.split(' ')[0]} → ${person(item.toId).name.split(' ')[0]}` : paid ? `you paid ${money(item.amount)}` : `you owe ${money(share)}`;
  const categoryIcon = ({ 'Food & drink': '🍜', Groceries: '🛒', Transport: '🚕', Accommodation: '🛏️', Activities: '🎟️', 'Bills & utilities': '💡', Shopping: '🛍️', Other: '✦' })[item.category] || '✦';
  const title = isSettlement ? `${payer.name.split(' ')[0]} paid ${person(item.toId).name.split(' ')[0]}` : item.description;
  return `<article class="expense-row ${compact ? 'compact' : ''}">
    <div class="expense-icon">${isSettlement ? '↔' : categoryIcon}</div>
    <div class="expense-main"><div class="expense-name">${escapeHtml(title || 'Expense')}</div><div class="expense-meta"><span>${escapeHtml(payer.name)}</span><span class="dot-sep">·</span><span>${escapeHtml(g?.name || (isSettlement && item.groupId === 'all' ? 'Across groups' : 'Group'))}</span><span class="dot-sep">·</span><span>${dateLabel(item.date)}</span></div></div>
    <div class="expense-amount"><strong>${money(item.amount)}</strong><span>${escapeHtml(rightLabel)}</span></div>
    ${compact || isSettlement ? '' : `<button class="icon-button subtle expense-more" data-action="delete-expense" data-id="${escapeHtml(item.id)}" title="Delete expense" aria-label="Delete expense">⋯</button>`}
  </article>`;
}

function balanceCard(cents, title, detail, tone) {
  return `<div class="metric-card"><div class="metric-head"><span>${escapeHtml(title)}</span><span class="metric-dot ${tone}"></span></div><div class="metric-value ${tone}">${moneyCents(Math.abs(cents))}</div><div class="metric-foot">${escapeHtml(detail)}</div></div>`;
}

function renderOverview() {
  const mine = balanceOf(data.currentUserId);
  const owedToYou = mine > 0 ? mine : 0;
  const youOwe = mine < 0 ? -mine : 0;
  const recent = allTransactions().slice(0, 5);
  const suggestions = simplifyDebts(balanceFor()).filter(row => row.fromId === data.currentUserId || row.toId === data.currentUserId).slice(0, 3);
  const monthly = data.expenses.filter(item => item.date >= daysAgo(30)).reduce((sum, item) => sum + item.amount, 0);
  return `<section class="welcome-row"><div><div class="eyebrow">YOUR MONEY, IN GOOD COMPANY</div><h1>Good to see you, ${escapeHtml(currentUser().name.split(' ')[0])}.</h1><p>Here’s where things stand across your groups.</p></div><button class="btn btn-primary" data-action="add-expense"><span class="plus">＋</span> Add an expense</button></section>
    <section class="metrics-grid">
      ${balanceCard(owedToYou, 'You are owed', 'Money friends owe you', 'positive')}
      ${balanceCard(youOwe, 'You owe', 'Your outstanding share', 'negative')}
      <div class="metric-card"><div class="metric-head"><span>Shared this month</span><span class="metric-icon">↗</span></div><div class="metric-value">${money(monthly)}</div><div class="metric-foot">Across ${data.groups.length} active groups</div></div>
      <div class="metric-card"><div class="metric-head"><span>People you share with</span><span class="metric-icon">♧</span></div><div class="metric-value">${data.people.length}</div><div class="metric-foot">In your FairShare circle</div></div>
    </section>
    <section class="overview-grid"><div class="panel recent-panel"><div class="panel-heading"><div><h2>Recent activity</h2><p>Your latest shared expenses</p></div><button class="text-button" data-page="activity">View all <span>→</span></button></div><div class="expense-list">${recent.length ? recent.map(item => expenseCard(item, true)).join('') : emptyState('No activity yet', 'Add an expense to get started.')}</div></div>
      <div class="panel settle-panel"><div class="panel-heading"><div><h2>Settle up</h2><p>The simplest way to clear balances</p></div><span class="panel-symbol">↗</span></div>${suggestions.length ? `<div class="suggestion-list">${suggestions.map(row => `<div class="suggestion-row"><div class="suggestion-people">${avatar(row.fromId)}<span class="arrow-mini">→</span>${avatar(row.toId)}</div><div class="suggestion-copy"><strong>${escapeHtml(person(row.fromId).name.split(' ')[0])} pays ${escapeHtml(person(row.toId).name.split(' ')[0])}</strong><span>${moneyCents(row.cents)}</span></div><button class="icon-button" data-action="quick-settle" data-from="${escapeHtml(row.fromId)}" data-to="${escapeHtml(row.toId)}" data-cents="${row.cents}" data-group="all" title="Record settlement">↗</button></div>`).join('')}</div>` : `<div class="settled-state"><div class="settled-check">✓</div><strong>All settled up</strong><span>No outstanding balances across your groups.</span></div>`}<button class="btn btn-light btn-block" data-page="balances">See all balances <span>→</span></button></div></section>
    <section class="panel groups-panel"><div class="panel-heading"><div><h2>Your groups</h2><p>Keep every shared plan in one place</p></div><button class="text-button" data-page="groups">All groups <span>→</span></button></div><div class="group-grid">${data.groups.slice(0, 3).map(renderGroupCard).join('')}${data.groups.length === 0 ? emptyState('No groups yet', 'Create a group for your next shared plan.') : ''}</div></section>`;
}

function renderGroupCard(item) {
  const gBalance = balanceOf(data.currentUserId, item.id);
  return `<button class="group-card" data-action="view-group" data-id="${escapeHtml(item.id)}"><div class="group-card-top"><span class="group-emoji">${escapeHtml(item.emoji || '👥')}</span><span class="group-arrow">↗</span></div><strong>${escapeHtml(item.name)}</strong><span class="group-members">${item.memberIds.length} members · ${data.expenses.filter(e => e.groupId === item.id).length} expenses</span><div class="group-card-bottom"><span class="avatar-stack">${item.memberIds.slice(0, 4).map(id => avatar(id, 'tiny')).join('')}</span><span class="group-balance ${gBalance > 0 ? 'positive' : gBalance < 0 ? 'negative' : ''}">${gBalance === 0 ? 'Settled' : gBalance > 0 ? `+${moneyCents(gBalance)}` : `−${moneyCents(-gBalance)}`}</span></div></button>`;
}

function emptyState(title, copy) { return `<div class="empty-state"><div class="empty-illustration">✦</div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span></div>`; }

function renderExpenses() {
  const query = ui.expenseQuery.trim().toLowerCase();
  const items = allTransactions().filter(item => {
    const payerId = item.kind === 'settlement' ? item.fromId : item.paidBy;
    const matchesQuery = !query || `${item.description || ''} ${item.category || ''} ${group(item.groupId)?.name || ''} ${person(payerId).name}`.toLowerCase().includes(query);
    const matchesGroup = ui.expenseGroup === 'all' || item.groupId === ui.expenseGroup;
    return matchesQuery && matchesGroup;
  }).sort((a, b) => b.date.localeCompare(a.date));
  return `<section class="page-heading"><div><div class="eyebrow">EVERYTHING, ACCOUNTED FOR</div><h1>Expenses</h1><p>Track what was spent, who paid and how it was split.</p></div><button class="btn btn-primary" data-action="add-expense">＋ Add expense</button></section>
    <section class="panel table-panel"><div class="toolbar"><label class="search-box"><span>⌕</span><input id="expense-search" type="search" placeholder="Search expenses…" value="${escapeHtml(ui.expenseQuery)}"></label><select id="expense-group-filter" class="select-control"><option value="all">All groups</option>${data.groups.map(g => `<option value="${escapeHtml(g.id)}" ${ui.expenseGroup === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select><button class="btn btn-light" data-action="export-csv">↓ Export CSV</button></div><div class="expense-list">${items.length ? items.map(item => expenseCard(item)).join('') : emptyState('No expenses found', 'Try another search or add your first expense.')}</div><div class="panel-foot">Showing ${items.length} of ${allTransactions().length} transactions</div></section>`;
}

function renderGroups() {
  if (ui.selectedGroupId && group(ui.selectedGroupId)) return renderGroupDetail(group(ui.selectedGroupId));
  return `<section class="page-heading"><div><div class="eyebrow">BETTER TOGETHER</div><h1>Your groups</h1><p>Trips, homes, dinners and everything you share.</p></div><button class="btn btn-primary" data-action="add-group">＋ Create a group</button></section><div class="group-grid page-group-grid">${data.groups.map(renderGroupCard).join('')}${data.groups.length === 0 ? emptyState('Start your first group', 'Create a group and invite the people you share with.') : ''}<button class="create-group-card" data-action="add-group"><span class="create-plus">＋</span><strong>Create a group</strong><span>Bring everyone together</span></button></div>`;
}

function renderGroupDetail(item) {
  const transactions = groupTransactions(item.id);
  const balances = calculateBalances(data, item.id).filter(row => item.memberIds.includes(row.memberId));
  return `<section class="page-heading detail-heading"><div><button class="back-link" data-action="back-groups">← All groups</button><div class="group-title-line"><span class="group-emoji large">${escapeHtml(item.emoji || '👥')}</span><div><div class="eyebrow">GROUP OVERVIEW</div><h1>${escapeHtml(item.name)}</h1><p>${item.memberIds.length} people · created ${dateLabel(item.createdAt)}</p></div></div></div><button class="btn btn-primary" data-action="add-expense" data-group="${escapeHtml(item.id)}">＋ Add expense</button></section>
    <section class="detail-stats"><div class="detail-stat"><span>Total expenses</span><strong>${money(data.expenses.filter(e => e.groupId === item.id).reduce((sum, e) => sum + e.amount, 0))}</strong></div><div class="detail-stat"><span>Your group balance</span><strong class="${balanceOf(data.currentUserId, item.id) > 0 ? 'positive' : balanceOf(data.currentUserId, item.id) < 0 ? 'negative' : ''}">${balanceOf(data.currentUserId, item.id) > 0 ? '+' : balanceOf(data.currentUserId, item.id) < 0 ? '−' : ''}${moneyCents(Math.abs(balanceOf(data.currentUserId, item.id)))}</strong></div><div class="detail-stat"><span>Members</span><strong>${item.memberIds.length}</strong></div></section>
    <div class="overview-grid detail-grid"><section class="panel"><div class="panel-heading"><div><h2>Group activity</h2><p>Expenses and settlements</p></div></div><div class="expense-list">${transactions.length ? transactions.map(tx => expenseCard(tx)).join('') : emptyState('No activity yet', 'Add the first expense to this group.')}</div></section><section class="panel"><div class="panel-heading"><div><h2>Balances</h2><p>Who owes what in this group</p></div></div><div class="member-balance-list">${balances.map(row => `<div class="member-balance-row">${avatar(row.memberId)}<div class="member-balance-person"><strong>${escapeHtml(person(row.memberId).name)}</strong><span>${row.memberId === data.currentUserId ? 'You' : 'Group member'}</span></div><strong class="balance-value ${row.cents > 0 ? 'positive' : row.cents < 0 ? 'negative' : ''}">${row.cents === 0 ? 'Settled' : `${row.cents > 0 ? '+' : '−'}${moneyCents(Math.abs(row.cents))}`}</strong></div>`).join('')}</div><button class="btn btn-light btn-block" data-action="settle-group" data-group="${escapeHtml(item.id)}">Record a settlement</button></section></div>`;
}

function renderBalances() {
  const rows = balanceFor(ui.balanceGroup).filter(row => data.people.some(p => p.id === row.memberId));
  const transfers = simplifyDebts(rows);
  const mine = rows.find(row => row.memberId === data.currentUserId)?.cents || 0;
  return `<section class="page-heading"><div><div class="eyebrow">CLEAR IS KIND</div><h1>Balances</h1><p>See who owes whom and clear things up with fewer payments.</p></div><select id="balance-group-filter" class="select-control"><option value="all">All groups</option>${data.groups.map(g => `<option value="${escapeHtml(g.id)}" ${ui.balanceGroup === g.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}</select></section>
    <section class="balance-summary"><div><span>Your net balance</span><strong class="${mine > 0 ? 'positive' : mine < 0 ? 'negative' : ''}">${mine > 0 ? '+' : mine < 0 ? '−' : ''}${moneyCents(Math.abs(mine))}</strong><small>${mine > 0 ? 'You are owed overall' : mine < 0 ? 'You owe overall' : 'You are all settled up'}</small></div><div class="balance-summary-symbol">⇄</div><div class="balance-summary-note">FairShare simplifies group debts into the smallest practical set of payments. Record a settlement after money changes hands.</div></section>
    <div class="overview-grid balances-grid"><section class="panel"><div class="panel-heading"><div><h2>People balances</h2><p>Net position for each person</p></div></div><div class="member-balance-list">${rows.map(row => `<div class="member-balance-row">${avatar(row.memberId)}<div class="member-balance-person"><strong>${escapeHtml(person(row.memberId).name)} ${row.memberId === data.currentUserId ? '<span class="you-label">YOU</span>' : ''}</strong><span>${row.cents > 0 ? 'Is owed' : row.cents < 0 ? 'Owes' : 'Settled up'}</span></div><strong class="balance-value ${row.cents > 0 ? 'positive' : row.cents < 0 ? 'negative' : ''}">${row.cents > 0 ? '+' : row.cents < 0 ? '−' : ''}${moneyCents(Math.abs(row.cents))}</strong></div>`).join('')}</div></section>
    <section class="panel"><div class="panel-heading"><div><h2>Suggested settlements</h2><p>Optimized to minimize transfers</p></div><span class="panel-symbol">↗</span></div>${transfers.length ? `<div class="suggestion-list">${transfers.map(row => `<div class="suggestion-row balance-suggestion"><div class="suggestion-people">${avatar(row.fromId)}<span class="arrow-mini">→</span>${avatar(row.toId)}</div><div class="suggestion-copy"><strong>${escapeHtml(person(row.fromId).name.split(' ')[0])} pays ${escapeHtml(person(row.toId).name.split(' ')[0])}</strong><span>${moneyCents(row.cents)}</span></div><button class="btn btn-small btn-light" data-action="quick-settle" data-from="${escapeHtml(row.fromId)}" data-to="${escapeHtml(row.toId)}" data-cents="${row.cents}" data-group="${ui.balanceGroup === 'all' ? '' : escapeHtml(ui.balanceGroup)}">Record</button></div>`).join('')}</div>` : emptyState('No payments needed', 'Everyone is square. Enjoy the good company!')}</section></div>`;
}

function renderPeople() {
  const rows = balanceFor();
  return `<section class="page-heading"><div><div class="eyebrow">YOUR CIRCLE</div><h1>People</h1><p>The people you share expenses with across your groups.</p></div><button class="btn btn-primary" data-action="add-group">＋ Add people to a group</button></section><section class="people-grid">${data.people.map(p => {
    const net = rows.find(row => row.memberId === p.id)?.cents || 0;
    const memberships = data.groups.filter(g => g.memberIds.includes(p.id));
    return `<article class="person-card"><div class="person-card-top">${avatar(p.id, 'large')}<span class="balance-pill ${net > 0 ? 'positive-bg' : net < 0 ? 'negative-bg' : ''}">${net === 0 ? 'Settled' : `${net > 0 ? '+' : '−'}${moneyCents(Math.abs(net))}`}</span></div><strong>${escapeHtml(p.name)}</strong><span class="person-email">${escapeHtml(p.email || 'No email added')}</span><div class="person-groups">${memberships.map(g => `<span>${escapeHtml(g.emoji)} ${escapeHtml(g.name)}</span>`).join('') || '<span>Not in a group</span>'}</div></article>`;
  }).join('')}</section>`;
}

function renderActivity() {
  const transactions = allTransactions();
  const byDate = transactions.reduce((acc, tx) => { (acc[tx.date] ||= []).push(tx); return acc; }, {});
  return `<section class="page-heading"><div><div class="eyebrow">THE GROUP CHAT, IN NUMBERS</div><h1>Activity</h1><p>A running history of expenses and settlements.</p></div><button class="btn btn-light" data-action="export-csv">↓ Export CSV</button></section><section class="panel activity-panel">${transactions.length ? Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => `<div class="activity-day"><div class="activity-date">${dateLabel(date)}</div><div class="expense-list">${items.map(item => expenseCard(item, true)).join('')}</div></div>`).join('') : emptyState('Nothing here yet', 'Your group activity will appear here.')}</section>`;
}

function renderSettings() {
  return `<section class="page-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h1>Settings</h1><p>Manage your profile, currency and data.</p></div></section><div class="settings-grid"><section class="panel settings-panel"><div class="panel-heading"><div><h2>Profile</h2><p>Your local FairShare profile</p></div></div><div class="profile-setting">${avatar(data.currentUserId, 'large')}<div><strong>${escapeHtml(currentUser().name)}</strong><span>${escapeHtml(currentUser().email || 'Personal profile')}</span></div></div><label class="field-label" for="profile-name">Display name</label><input class="text-input" id="profile-name" value="${escapeHtml(currentUser().name)}"><label class="field-label" for="profile-email">Email</label><input class="text-input" id="profile-email" type="email" value="${escapeHtml(currentUser().email || '')}"><button class="btn btn-primary" data-action="save-profile">Save profile</button></section>
    <section class="panel settings-panel"><div class="panel-heading"><div><h2>Preferences</h2><p>Choose how your amounts look</p></div></div><label class="field-label" for="currency-select">Base currency</label><select id="currency-select" class="select-control full-width">${['USD','EUR','GBP','INR','CAD','AUD','JPY','AED','SGD'].map(code => `<option value="${code}" ${currency() === code ? 'selected' : ''}>${code}</option>`).join('')}</select><p class="field-help">All entries use one currency. Changing this setting changes the display symbol and does not convert existing amounts.</p><label class="field-label" for="theme-select">Appearance</label><select id="theme-select" class="select-control full-width"><option value="light" ${data.settings.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${data.settings.theme === 'dark' ? 'selected' : ''}>Dark</option></select><button class="btn btn-light" data-action="save-preferences">Save preferences</button></section>
    <section class="panel settings-panel data-panel"><div class="panel-heading"><div><h2>Your data</h2><p>Back up or move your local information</p></div></div><div class="data-action-row"><div><strong>Download a backup</strong><span>Export groups, people, expenses and settlements as JSON.</span></div><button class="btn btn-light" data-action="export-json">Export JSON</button></div><div class="data-action-row"><div><strong>Restore a backup</strong><span>Import a FairShare JSON backup from another device.</span></div><button class="btn btn-light" data-action="import-json">Import JSON</button></div><div class="data-action-row danger-row"><div><strong>Reset demo data</strong><span>Replace your local data with the example workspace.</span></div><button class="btn btn-danger-light" data-action="reset-data">Reset data</button></div></section></div>`;
}

function renderPage() {
  if (ui.page === 'expenses') return renderExpenses();
  if (ui.page === 'groups') return renderGroups();
  if (ui.page === 'balances') return renderBalances();
  if (ui.page === 'people') return renderPeople();
  if (ui.page === 'activity') return renderActivity();
  if (ui.page === 'settings') return renderSettings();
  return renderOverview();
}

function render() {
  document.documentElement.dataset.theme = data.settings.theme || 'light';
  const navItems = [
    ['overview', '▦', 'Overview'], ['expenses', '↗', 'Expenses'], ['groups', '◫', 'Groups'], ['balances', '⇄', 'Balances'], ['people', '♧', 'People'], ['activity', '◷', 'Activity']
  ];
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><a class="brand" href="#overview" data-page="overview"><span class="brand-mark">F</span><span>fairshare</span></a><div class="workspace-label">WORKSPACE</div><div class="workspace-switch"><span class="workspace-dot">A</span><span><strong>Alex’s space</strong><small>Personal workspace</small></span><span class="chevron">⌄</span></div><nav class="main-nav" aria-label="Main navigation">${navItems.map(([page, icon, label]) => `<button class="nav-item ${ui.page === page ? 'active' : ''}" data-page="${page}"><span class="nav-icon">${icon}</span>${label}${page === 'balances' && balanceOf(data.currentUserId) !== 0 ? '<span class="nav-indicator"></span>' : ''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-item ${ui.page === 'settings' ? 'active' : ''}" data-page="settings"><span class="nav-icon">⚙</span>Settings</button><div class="sidebar-help"><div class="help-orb">✳</div><strong>Keep things fair.</strong><span>Good friends. Clear balances.</span><button data-action="add-expense">Add an expense <span>→</span></button></div><div class="user-mini">${avatar(data.currentUserId)}<span><strong>${escapeHtml(currentUser().name)}</strong><small>Free account · Local data</small></span><button class="more-button" data-page="settings" aria-label="Settings">⋯</button></div></div></aside><main class="main-area"><header class="topbar"><div class="mobile-brand"><span class="brand-mark">F</span><strong>fairshare</strong></div><div class="breadcrumb">Workspace <span>/</span> <strong>${displayTitle()}</strong></div><div class="topbar-actions"><button class="icon-button top-search" data-action="global-search" title="Search expenses">⌕</button><button class="btn btn-primary btn-top" data-action="add-expense">＋ <span>Add expense</span></button><button class="avatar-button" data-page="settings" title="Profile">${escapeHtml(initials(currentUser().name))}</button></div></header><div class="content-area">${renderPage()}<footer class="app-footer"><span>FairShare <span>·</span> Shared expenses, simplified.</span><span>Local-first · Open source</span></footer></div></main></div><nav class="mobile-nav">${navItems.slice(0, 5).map(([page, icon, label]) => `<button class="${ui.page === page ? 'active' : ''}" data-page="${page}"><span>${icon}</span><small>${label}</small></button>`).join('')}</nav>`;
  renderModal();
}

function selectedMemberIds(form) {
  return [...form.querySelectorAll('[name="participant"]:checked')].map(input => input.value);
}
function draftFromForm(form) {
  const fd = new FormData(form);
  const values = Object.fromEntries(fd.entries());
  values.participants = selectedMemberIds(form);
  values.splitValues = {};
  form.querySelectorAll('[data-split-value]').forEach(input => { values.splitValues[input.dataset.splitValue] = input.value; });
  return values;
}

function expenseModalHtml(modal) {
  const selectedGroup = group(modal.draft?.groupId || modal.groupId || ui.selectedGroupId || data.groups[0]?.id);
  const members = selectedGroup ? groupMembers(selectedGroup.id) : [];
  const draft = modal.draft || {};
  const participantIds = draft.participants?.some(id => members.some(member => member.id === id)) ? draft.participants : members.map(p => p.id);
  const amount = draft.amount ?? '';
  const method = draft.splitMethod || 'equal';
  const splitValues = draft.splitValues || {};
  return `<div class="modal-backdrop"><section class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-content><div class="modal-heading"><div><div class="eyebrow">ADD TO YOUR LEDGER</div><h2 id="modal-title">Add an expense</h2><p>Capture the details now. FairShare handles the split.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="expense-form" class="modal-form"><div class="form-grid"><div class="field full"><label for="expense-description">What was it for?</label><input id="expense-description" name="description" class="text-input" placeholder="e.g. Dinner, groceries, hotel" required maxlength="80" value="${escapeHtml(draft.description || '')}"></div><div class="field"><label for="expense-amount">Total amount</label><div class="amount-input-wrap"><span>${new Intl.NumberFormat(undefined, { style: 'currency', currency: currency() }).formatToParts(0).find(part => part.type === 'currency')?.value || '$'}</span><input id="expense-amount" name="amount" class="text-input amount-input" type="number" min="0.01" step="0.01" placeholder="0.00" required value="${escapeHtml(amount)}"></div></div><div class="field"><label for="expense-group">Group</label><select id="expense-group" name="groupId" class="select-control" required>${data.groups.map(g => `<option value="${escapeHtml(g.id)}" ${selectedGroup?.id === g.id ? 'selected' : ''}>${escapeHtml(g.emoji)} ${escapeHtml(g.name)}</option>`).join('')}</select></div><div class="field"><label for="expense-paidby">Paid by</label><select id="expense-paidby" name="paidBy" class="select-control" required>${members.map(p => `<option value="${escapeHtml(p.id)}" ${(draft.paidBy || data.currentUserId) === p.id ? 'selected' : ''}>${escapeHtml(p.name)}${p.id === data.currentUserId ? ' (you)' : ''}</option>`).join('')}</select></div><div class="field"><label for="expense-category">Category</label><select id="expense-category" name="category" class="select-control">${['Food & drink','Groceries','Transport','Accommodation','Activities','Bills & utilities','Shopping','Other'].map(c => `<option ${draft.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label for="expense-date">Date</label><input id="expense-date" name="date" class="text-input" type="date" value="${escapeHtml(draft.date || today())}" required></div><div class="field full"><label for="expense-note">Note <span class="optional">Optional</span></label><input id="expense-note" name="note" class="text-input" placeholder="Add a little context" maxlength="180" value="${escapeHtml(draft.note || '')}"></div></div>
    <div class="split-section"><div class="split-section-heading"><div><strong>Split between</strong><span>Choose who shares this expense.</span></div><label class="split-method-label"><span>Split type</span><select name="splitMethod" id="split-method" class="select-control"><option value="equal" ${method === 'equal' ? 'selected' : ''}>Equally</option><option value="exact" ${method === 'exact' ? 'selected' : ''}>Exact amounts</option><option value="percent" ${method === 'percent' ? 'selected' : ''}>By percentage</option><option value="shares" ${method === 'shares' ? 'selected' : ''}>By shares</option></select></label></div><div class="participant-list">${members.map(p => `<label class="participant-row"><span class="check-person"><input type="checkbox" name="participant" value="${escapeHtml(p.id)}" ${participantIds.includes(p.id) ? 'checked' : ''}><span class="custom-check">✓</span>${avatar(p.id, 'small')}<span>${escapeHtml(p.name)}${p.id === data.currentUserId ? ' <em>(you)</em>' : ''}</span></span>${method === 'equal' ? '<span class="participant-equal">Included</span>' : `<span class="split-value-wrap"><input aria-label="${escapeHtml(p.name)} split value" data-split-value="${escapeHtml(p.id)}" type="number" min="0" step="${method === 'exact' ? '0.01' : '0.01'}" placeholder="${method === 'percent' ? '%' : method === 'shares' ? '1' : '0.00'}" value="${escapeHtml(splitValues[p.id] ?? (method === 'shares' ? '1' : ''))}" ${participantIds.includes(p.id) ? '' : 'disabled'}><small>${method === 'exact' ? currency() : method === 'percent' ? '%' : 'shares'}</small></span>`}</label>`).join('')}</div><div class="split-hint" id="split-hint">${method === 'equal' ? 'The total is divided as evenly as possible. Any remaining cents are distributed fairly.' : method === 'exact' ? 'Enter each person’s exact share. The amounts must add up to the total.' : method === 'percent' ? 'Enter a percentage for each person. The total must equal 100%.' : 'Enter relative shares. For example, 2 shares means twice as much as 1 share.'}</div></div>
    <div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Save expense <span>→</span></button></div></form></section></div>`;
}

function groupModalHtml() {
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-content><div class="modal-heading"><div><div class="eyebrow">MAKE IT A GROUP THING</div><h2 id="modal-title">Create a group</h2><p>Bring people together around shared expenses.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="group-form" class="modal-form"><div class="field"><label for="group-name">Group name</label><input class="text-input" id="group-name" name="name" placeholder="e.g. Beach weekend" required maxlength="60"></div><div class="field"><label for="group-emoji">Pick an icon</label><select class="select-control" id="group-emoji" name="emoji"><option>👥</option><option>🏡</option><option>🌆</option><option>🚙</option><option>✈️</option><option>🍽️</option><option>🎉</option><option>🏕️</option></select></div><div class="field"><label>Include people</label><div class="people-picker">${data.people.map(p => `<label class="participant-row"><span class="check-person"><input type="checkbox" name="member" value="${escapeHtml(p.id)}" ${p.id === data.currentUserId ? 'checked' : ''}><span class="custom-check">✓</span>${avatar(p.id, 'small')}<span>${escapeHtml(p.name)}</span></span></label>`).join('')}</div></div><div class="field"><label for="new-members">Add new people <span class="optional">Optional · separate names with commas</span></label><input class="text-input" id="new-members" name="newMembers" placeholder="e.g. Morgan, Robin"></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Create group <span>→</span></button></div></form></section></div>`;
}

function settlementModalHtml(modal) {
  const g = group(modal.groupId || ui.selectedGroupId || data.groups[0]?.id);
  const members = g ? groupMembers(g.id) : data.people;
  const draft = modal.draft || {};
  const suggestion = simplifyDebts(calculateBalances(data, g ? g.id : 'all'))[0];
  const fromId = members.some(p => p.id === draft.fromId) ? draft.fromId : (suggestion && members.some(p => p.id === suggestion.fromId) ? suggestion.fromId : members[0]?.id);
  const toId = members.some(p => p.id === draft.toId && p.id !== fromId) ? draft.toId : (suggestion && suggestion.toId !== fromId && members.some(p => p.id === suggestion.toId) ? suggestion.toId : members.find(p => p.id !== fromId)?.id);
  const amount = draft.amount ?? (suggestion ? fromCents(suggestion.cents).toFixed(2) : '');
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" data-modal-content><div class="modal-heading"><div><div class="eyebrow">CLOSE THE LOOP</div><h2 id="modal-title">Record a settlement</h2><p>Mark a payment that has already happened.</p></div><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div><form id="settlement-form" class="modal-form"><div class="field"><label for="settle-group">Group</label><select class="select-control" id="settle-group" name="groupId"><option value="all" ${modal.groupId === 'all' ? 'selected' : ''}>Across all groups</option>${data.groups.map(item => `<option value="${escapeHtml(item.id)}" ${g?.id === item.id && modal.groupId !== 'all' ? 'selected' : ''}>${escapeHtml(item.emoji)} ${escapeHtml(item.name)}</option>`).join('')}</select></div><div class="form-grid"><div class="field"><label for="settle-from">Paid by</label><select class="select-control" id="settle-from" name="fromId">${members.map(p => `<option value="${escapeHtml(p.id)}" ${fromId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div><div class="field"><label for="settle-to">Paid to</label><select class="select-control" id="settle-to" name="toId">${members.map(p => `<option value="${escapeHtml(p.id)}" ${toId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div></div><div class="field"><label for="settle-amount">Amount</label><input class="text-input" id="settle-amount" name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required value="${amount}"></div><div class="field"><label for="settle-date">Date</label><input class="text-input" id="settle-date" name="date" type="date" value="${today()}" required></div><div class="field"><label for="settle-note">Note <span class="optional">Optional</span></label><input class="text-input" id="settle-note" name="note" placeholder="e.g. Paid by bank transfer"></div><div class="modal-actions"><button type="button" class="btn btn-light" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary">Save settlement <span>→</span></button></div></form></section></div>`;
}

function renderModal() {
  if (!ui.modal) { modalRoot.innerHTML = ''; return; }
  if (ui.modal.type === 'expense') modalRoot.innerHTML = expenseModalHtml(ui.modal);
  else if (ui.modal.type === 'group') modalRoot.innerHTML = groupModalHtml();
  else if (ui.modal.type === 'settlement') modalRoot.innerHTML = settlementModalHtml(ui.modal);
  const firstInput = modalRoot.querySelector('input:not([type="checkbox"]), select');
  firstInput?.focus({ preventScroll: true });
}

function openModal(type, options = {}) {
  ui.modal = { type, ...options };
  renderModal();
}
function closeModal() { ui.modal = null; renderModal(); }

function buildShares(form, amountCents, members) {
  const participantIds = selectedMemberIds(form);
  if (!participantIds.length) throw new Error('Choose at least one person to split this expense.');
  const method = form.elements.splitMethod.value;
  if (method === 'equal') return splitEqual(amountCents, participantIds).map(row => ({ memberId: row.memberId, amount: fromCents(row.cents) }));
  const inputs = [...form.querySelectorAll('[data-split-value]')].filter(input => participantIds.includes(input.dataset.splitValue));
  const values = inputs.map(input => ({ memberId: input.dataset.splitValue, weight: Number(input.value) }));
  if (values.some(row => !Number.isFinite(row.weight) || row.weight < 0)) throw new Error('Split values must be valid non-negative numbers.');
  if (method === 'exact') {
    const result = values.map(row => ({ memberId: row.memberId, cents: toCents(row.weight) }));
    if (result.reduce((sum, row) => sum + row.cents, 0) !== amountCents) throw new Error('Exact split amounts must add up to the full expense total.');
    return result.map(row => ({ memberId: row.memberId, amount: fromCents(row.cents) }));
  }
  if (method === 'percent' && Math.abs(values.reduce((sum, row) => sum + row.weight, 0) - 100) > 0.01) throw new Error('Percentages must add up to 100%.');
  const rows = splitByWeights(amountCents, values);
  return rows.map(row => ({ memberId: row.memberId, amount: fromCents(row.cents) }));
}

function handleExpenseSubmit(form) {
  const fd = new FormData(form);
  const amountCents = toCents(fd.get('amount'));
  if (amountCents <= 0) throw new Error('Enter an amount greater than zero.');
  const groupId = fd.get('groupId');
  const targetGroup = group(groupId);
  if (!targetGroup) throw new Error('Choose a valid group.');
  const shares = buildShares(form, amountCents, groupMembers(groupId));
  const paidBy = fd.get('paidBy');
  if (!targetGroup.memberIds.includes(paidBy)) throw new Error('The payer must belong to the selected group.');
  data.expenses.push({ id: uid('expense'), groupId, description: String(fd.get('description')).trim(), amount: fromCents(amountCents), currency: currency(), paidBy, shares, category: fd.get('category'), date: fd.get('date'), note: String(fd.get('note') || '').trim() });
  persist();
  closeModal();
  render();
  toast('Expense added. The balances are updated.');
}

function handleGroupSubmit(form) {
  const fd = new FormData(form);
  const memberIds = [...fd.getAll('member')];
  const newNames = String(fd.get('newMembers') || '').split(',').map(name => name.trim()).filter(Boolean);
  for (const name of newNames) {
    let existing = data.people.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!existing) {
      existing = { id: uid('person'), name, email: '' };
      data.people.push(existing);
    }
    memberIds.push(existing.id);
  }
  if (!memberIds.includes(data.currentUserId)) memberIds.push(data.currentUserId);
  if (new Set(memberIds).size < 2) throw new Error('Add at least one other person to your group.');
  const item = { id: uid('group'), name: String(fd.get('name')).trim(), emoji: fd.get('emoji'), color: ['purple','green','orange','blue'][data.groups.length % 4], memberIds: [...new Set(memberIds)], createdAt: today() };
  data.groups.push(item);
  persist();
  closeModal();
  ui.selectedGroupId = item.id;
  ui.page = 'groups';
  render();
  toast('Your group is ready.');
}

function handleSettlementSubmit(form) {
  const fd = new FormData(form);
  const groupId = fd.get('groupId');
  const targetGroup = group(groupId);
  const fromId = fd.get('fromId');
  const toId = fd.get('toId');
  const amountCents = toCents(fd.get('amount'));
  const validPair = groupId === 'all' ? data.groups.some(g => g.memberIds.includes(fromId) && g.memberIds.includes(toId)) : !!targetGroup && targetGroup.memberIds.includes(fromId) && targetGroup.memberIds.includes(toId);
  if (!validPair) throw new Error('Both people must share at least one group, or select the right group.');
  if (fromId === toId) throw new Error('A person cannot settle a balance with themselves.');
  if (amountCents <= 0) throw new Error('Enter an amount greater than zero.');
  data.settlements.push({ id: uid('settlement'), groupId, fromId, toId, amount: fromCents(amountCents), date: fd.get('date'), note: String(fd.get('note') || '').trim() });
  persist();
  closeModal();
  render();
  toast('Settlement recorded. Balances updated.');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportJson() {
  downloadFile(`fairshare-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('Backup downloaded.');
}
function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function exportCsv() {
  const rows = [['Date','Type','Group','Description','Paid by','Amount','Currency','Category','Shares / participants']];
  for (const item of allTransactions()) {
    rows.push([item.date, item.kind, group(item.groupId)?.name || '', item.description || 'Settlement', person(item.kind === 'settlement' ? item.fromId : item.paidBy).name, item.amount.toFixed(2), currency(), item.category || '', item.kind === 'expense' ? item.shares.map(s => `${person(s.memberId).name}: ${s.amount.toFixed(2)}`).join('; ') : `${person(item.fromId).name} → ${person(item.toId).name}`]);
  }
  downloadFile(`fairshare-expenses-${today()}.csv`, rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  toast('CSV exported.');
}

function handleImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (parsed?.version !== 1 || !Array.isArray(parsed.people) || !Array.isArray(parsed.groups) || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.settlements)) throw new Error('This file is not a FairShare backup.');
      const errors = validateLedger(parsed);
      if (errors.length) throw new Error(`Backup validation failed: ${errors[0]}`);
      data = { ...parsed, settings: { currency: 'USD', theme: 'light', ...parsed.settings } };
      if (!data.people.some(p => p.id === data.currentUserId)) data.currentUserId = data.people[0]?.id || 'alex';
      persist();
      ui.page = 'overview';
      ui.selectedGroupId = null;
      render();
      toast('Backup restored successfully.');
    } catch (error) { toast(error.message || 'Could not import this backup.', 'error'); }
  };
  reader.onerror = () => toast('Could not read the selected file.', 'error');
  reader.readAsText(file);
}

function handleAction(action, button) {
  if (action === 'add-expense') {
    if (!data.groups.length) { openModal('group'); toast('Create a group before adding an expense.', 'error'); }
    else openModal('expense', { groupId: button.dataset.group || ui.selectedGroupId || undefined });
  }
  else if (action === 'add-group') openModal('group');
  else if (action === 'close-modal') closeModal();
  else if (action === 'view-group') { ui.selectedGroupId = button.dataset.id; ui.page = 'groups'; render(); }
  else if (action === 'back-groups') { ui.selectedGroupId = null; render(); }
  else if (action === 'delete-expense') {
    const item = data.expenses.find(e => e.id === button.dataset.id);
    if (item && confirm(`Delete “${item.description}”? This will recalculate the group balances.`)) {
      data.expenses = data.expenses.filter(e => e.id !== item.id); persist(); render(); toast('Expense deleted.');
    }
  } else if (action === 'quick-settle') {
    const cents = Number(button.dataset.cents || 0);
    const groupId = button.dataset.group || (ui.page === 'balances' && ui.balanceGroup === 'all' ? 'all' : ui.selectedGroupId || data.groups.find(g => g.memberIds.includes(button.dataset.from) && g.memberIds.includes(button.dataset.to))?.id);
    openModal('settlement', { groupId, draft: { fromId: button.dataset.from, toId: button.dataset.to, amount: fromCents(cents).toFixed(2) } });
  } else if (action === 'settle-group') openModal('settlement', { groupId: button.dataset.group });
  else if (action === 'export-json') exportJson();
  else if (action === 'export-csv') exportCsv();
  else if (action === 'import-json') document.querySelector('#import-file')?.click() || createImportInput();
  else if (action === 'reset-data') {
    if (confirm('Replace all FairShare data in this browser with the original demo workspace? Export a backup first if you need to keep your current data.')) { data = seedData(); persist(); ui = { ...ui, page: 'overview', selectedGroupId: null }; render(); toast('Demo workspace restored.'); }
  } else if (action === 'save-profile') {
    const name = document.querySelector('#profile-name')?.value.trim();
    const email = document.querySelector('#profile-email')?.value.trim();
    if (!name) return toast('Enter a display name.', 'error');
    const p = data.people.find(item => item.id === data.currentUserId);
    p.name = name; p.email = email; persist(); render(); toast('Profile saved.');
  } else if (action === 'save-preferences') {
    data.settings.currency = document.querySelector('#currency-select')?.value || 'USD';
    data.settings.theme = document.querySelector('#theme-select')?.value || 'light';
    persist(); render(); toast('Preferences saved.');
  } else if (action === 'global-search') {
    ui.page = 'expenses'; ui.expenseQuery = '';
    render(); document.querySelector('#expense-search')?.focus();
  }
}

function createImportInput() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json'; input.hidden = true;
  input.addEventListener('change', () => handleImport(input.files?.[0]));
  document.body.append(input); input.click(); setTimeout(() => input.remove(), 5000);
}

app.addEventListener('click', event => {
  const pageButton = event.target.closest('[data-page]');
  if (pageButton) {
    event.preventDefault();
    ui.page = pageButton.dataset.page;
    if (ui.page !== 'groups') ui.selectedGroupId = null;
    render();
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) handleAction(actionButton.dataset.action, actionButton);
});

modalRoot.addEventListener('click', event => {
  if (event.target.classList.contains('modal-backdrop') || event.target.closest('[data-action="close-modal"]')) closeModal();
});
modalRoot.addEventListener('click', event => event.stopPropagation());
modalRoot.addEventListener('change', event => {
  const form = event.target.closest('form');
  if (!form || !ui.modal) return;
  if (ui.modal.type === 'expense' && ['groupId', 'splitMethod', 'participant'].includes(event.target.name)) {
    const draft = draftFromForm(form);
    if (event.target.name === 'groupId') {
      const nextGroup = group(event.target.value);
      draft.groupId = event.target.value;
      draft.participants = nextGroup ? [...nextGroup.memberIds] : [];
      if (!nextGroup?.memberIds.includes(draft.paidBy)) draft.paidBy = nextGroup?.memberIds.includes(data.currentUserId) ? data.currentUserId : nextGroup?.memberIds[0];
    }
    ui.modal.draft = draft;
    renderModal();
  } else if (ui.modal.type === 'settlement' && event.target.name === 'groupId') {
    const fd = new FormData(form);
    ui.modal = { type: 'settlement', groupId: fd.get('groupId'), draft: { fromId: fd.get('fromId'), toId: fd.get('toId'), amount: fd.get('amount') } };
    renderModal();
  }
});
modalRoot.addEventListener('input', event => {
  const form = event.target.closest('form');
  if (!form || !ui.modal || ui.modal.type !== 'expense') return;
  if (event.target.name) ui.modal.draft = draftFromForm(form);
});
modalRoot.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (event.target.id === 'expense-form') handleExpenseSubmit(event.target);
    else if (event.target.id === 'group-form') handleGroupSubmit(event.target);
    else if (event.target.id === 'settlement-form') handleSettlementSubmit(event.target);
  } catch (error) { toast(error.message || 'Please check the form.', 'error'); }
});

app.addEventListener('change', event => {
  if (event.target.id === 'expense-group-filter') { ui.expenseGroup = event.target.value; render(); }
  if (event.target.id === 'balance-group-filter') { ui.balanceGroup = event.target.value; render(); }
});
app.addEventListener('input', event => {
  if (event.target.id === 'expense-search') {
    const start = event.target.selectionStart;
    ui.expenseQuery = event.target.value;
    const container = document.querySelector('.expense-list');
    if (container) {
      const query = ui.expenseQuery.trim().toLowerCase();
      const items = allTransactions().filter(item => (!query || `${item.description || ''} ${item.category || ''} ${group(item.groupId)?.name || ''} ${person(item.kind === 'settlement' ? item.fromId : item.paidBy).name}`.toLowerCase().includes(query)) && (ui.expenseGroup === 'all' || item.groupId === ui.expenseGroup)).sort((a,b) => b.date.localeCompare(a.date));
      container.innerHTML = items.length ? items.map(item => expenseCard(item)).join('') : emptyState('No expenses found', 'Try another search or add your first expense.');
      const count = document.querySelector('.panel-foot'); if (count) count.textContent = `Showing ${items.length} of ${allTransactions().length} transactions`;
    }
    event.target.setSelectionRange(start, start);
  }
});

window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && ui.modal) closeModal();
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); ui.page = 'expenses'; render(); document.querySelector('#expense-search')?.focus(); }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(error => console.info('Offline caching unavailable:', error)));
}

persist();
render();
