# FairShare

**Shared expenses, simplified.** FairShare is an open-source, local-first expense-sharing app for trips, households, roommates and friends. It tracks who paid, who participated, how expenses were divided and what remains to be settled.

> FairShare is an independent project. It is not affiliated with, endorsed by, or a copy of Splitwise.

## Features

- **Groups and members** — organize expenses for trips, households, dinners and other shared plans.
- **Expense tracking** — record descriptions, amounts, payers, dates, categories and notes.
- **Flexible splits** — split equally, by exact amounts, percentages or relative shares.
- **Money-safe calculations** — ledger calculations use integer cents and distribute rounding remainders without losing money.
- **Balances** — view what each person owes or is owed, by group or across all groups.
- **Debt simplification** — generate a practical set of transfers to clear net balances.
- **Settlements** — record payments already made.
- **Activity and search** — review and filter expenses and settlements.
- **Data portability** — export CSV reports and JSON backups; restore a JSON backup.
- **Responsive and installable** — desktop and mobile layouts, with a lightweight PWA app shell.
- **No build step or third-party JavaScript dependencies** — built with browser-native JavaScript modules.

## Quick start

### Requirements

- A modern browser (Firefox, Chrome, Edge or Safari).
- Python 3 for the simple local web server.
- Node.js 20 or later only if you want to run the test suite.

### Run locally

On Linux/macOS:

```bash
./start.sh
```

On Windows, run `start.bat`.

Alternatively, run:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

A web server is required because FairShare uses JavaScript modules and a service worker. Opening `index.html` directly with `file://` may not work correctly.

### Run tests

```bash
npm test
```

The automated ledger tests cover equal splits, weighted allocations, debt simplification, zero-sum balances and cent rounding. GitHub Actions runs these tests on pushes and pull requests.

## How to use it

1. Open FairShare and explore the sample groups and transactions.
2. Create a group and add its members.
3. Select **Add expense**, enter the amount and payer, and choose who shares it.
4. Choose a split method: equal, exact amount, percentage or shares.
5. Open **Balances** to see net positions and suggested settlements.
6. Record a settlement after a payment has actually happened.
7. Use **Settings** to export a JSON backup or restore a backup. You can also export expense activity as CSV.

The initial workspace contains illustrative sample people and transactions. Use **Settings → Reset data** to restore the demo workspace.

## Data, privacy and limitations

FairShare v1.0.0 is **local-first**. Data is stored in the browser's `localStorage` on the device where the app is running. This version does not provide user accounts, invitations, shared real-time groups, cloud synchronization, server-side backups or notifications.

- Anyone with access to the same browser profile can access its FairShare data.
- Browser storage is not encrypted by FairShare. Do not use this version to store highly sensitive personal or financial information.
- Clearing browser storage can delete your workspace. Export JSON backups regularly.
- JSON backup files are plain text and are not encrypted.
- Expenses currently use one workspace currency setting; there is no foreign-exchange conversion service.

## Roadmap

Potential future work includes user authentication, shared groups, invitations, cloud database synchronization, receipt attachments, recurring expenses, comments, notifications, multi-currency exchange rates and richer reports.

A production multi-user service should add authenticated accounts, server-side authorization, audit history, rate limiting, encrypted transport, secure backups and a clear privacy policy before handling real users' shared financial data.

## Tech stack

- HTML, CSS and modern JavaScript modules
- Browser `localStorage` for persistence
- Service Worker and Web App Manifest for PWA installation and app-shell caching
- Node.js built-in test runner for ledger tests

## Contributing

Issues and pull requests are welcome. Please include a clear reproduction for bugs and tests for changes to ledger calculations. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md). This is a local-first browser application and does not provide encrypted storage or a hosted account system.

## License

MIT. See [LICENSE](LICENSE).
