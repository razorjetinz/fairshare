# FairShare

**Shared expenses, simplified.** FairShare is a clean, responsive expense-sharing app for trips, households, roommates and friends. It tracks who paid, who participated, how costs were divided and what remains to be settled.

> FairShare is an independent open-source project. It is not affiliated with, endorsed by, or a copy of Splitwise.

## Features

- **Groups and people** — create groups for trips, homes, dinners and other shared plans; add existing people or create new ones.
- **Expense tracking** — record the description, amount, group, payer, date, category and optional note.
- **Flexible splits** — split equally, by exact amount, by percentage or by relative shares.
- **Accurate money math** — monetary calculations use integer cents and distribute rounding remainders without losing a cent.
- **Balances** — see each person's net balance by group or across all groups.
- **Debt simplification** — calculate a practical set of transfers that clears the recorded net balances.
- **Settlements** — record payments already made, including settlements across multiple groups.
- **Activity and search** — review transactions and filter expenses by text or group.
- **Data portability** — export CSV reports and JSON backups; restore a JSON backup on another browser.
- **Responsive and installable** — desktop and mobile layouts, plus a lightweight PWA app shell for offline access after the first load.
- **No build step or third-party JavaScript dependencies** — uses browser-native JavaScript modules and local storage.

## Quick start

### Requirements

- A modern browser (Firefox, Chrome, Edge or Safari).
- Python 3, Node.js 20+ is optional and only needed to run the included test suite.

### Run locally

From the project folder:

```bash
./start.sh
```

On Windows, run `start.bat`. Or start the server manually with `python3 -m http.server 4173`. Open <http://localhost:4173>.

You can also use any static web server. A server is required because the app uses JavaScript modules and a service worker; opening `index.html` directly with `file://` may not work correctly.

### Run tests

```bash
npm test
```

The tests cover equal splits, weighted allocations, debt simplification, zero-sum balances and cent rounding.

## How to use it

1. Open FairShare and explore the sample groups and transactions.
2. Create a group and select its members.
3. Choose **Add expense**, enter the total and payer, and select who shares it.
4. Pick a split method: equally, exact amounts, percentage or shares.
5. Open **Balances** to see net positions and suggested settlements.
6. Record a settlement after a payment has actually happened.
7. Use **Settings → Export JSON** to back up your workspace, or export a CSV for reporting.

The initial workspace contains illustrative sample people and transactions. Use **Settings → Reset data** to restore that demo workspace.

## Data and privacy

FairShare is currently **local-first**. Data is saved in the browser's `localStorage` on the device where the app is running. There is no server, account system, invitation service, cross-device sync or shared live workspace in this version.

- Anyone with access to the same browser profile can access its FairShare data.
- Browser storage is not encrypted by FairShare. Do not use this version to store highly sensitive financial or identity information.
- Clearing browser storage can delete your workspace. Export JSON backups regularly.
- CSV and JSON files are downloaded to your device. JSON backups are plain text and are not encrypted.

## Scope and roadmap

This release focuses on the core expense-sharing workflow. Features that need a trusted backend are not included yet: user authentication, shared real-time groups, invitations, multi-device synchronization, email/push notifications and role-based permissions. Other possible next steps include receipt attachments, recurring expenses, comments, settlement history editing, multiple currencies with exchange rates, and richer reports.

A production multi-user service should add authenticated accounts, server-side authorization, a database, audit history, rate limiting, encrypted transport, secure backups and a clear privacy policy before handling real users' shared financial data.

## Tech stack

- HTML, CSS and modern JavaScript modules
- Browser `localStorage` for persistence
- Service Worker and Web App Manifest for installability/offline app-shell caching
- Node.js built-in test runner for ledger tests

## Contributing

Issues and pull requests are welcome. Please include a clear reproduction for bugs and tests for changes to ledger calculations. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
