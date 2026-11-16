# FairShare

**Shared expenses, simplified.** FairShare is an open-source expense-sharing app concept for trips, households, roommates and friends.

> FairShare is an independent project. It is not affiliated with, endorsed by, or a copy of Splitwise.

## Repository status

The current `main` branch contains the project documentation, MIT licence, contributor/security notes, the pure ledger calculation module, and automated ledger tests. The complete interactive browser application is packaged separately in the FairShare v1.0.0 ZIP delivery archive.

**The browser UI files have not yet been added to this GitHub branch.** A fresh clone is therefore not deployable as a complete app until the contents of the delivery archive are extracted into the repository root and committed.

## Planned application features

- Groups and members
- Expense tracking with payer, date, category and notes
- Equal, exact amount, percentage and share-based splits
- Cent-accurate balances and debt simplification
- Settlements and activity history
- CSV and JSON export/import
- Responsive layout and installable PWA support

## Current technical scope

The first application version is local-first: data is stored in the browser's `localStorage`. It does not yet include accounts, shared live groups, invitations, cloud synchronization, notifications or encrypted storage. Do not store highly sensitive financial or identity information in this version.

## Ledger tests

Requires Node.js 20 or later:

```bash
npm test
```

The tests cover cent rounding, equal and weighted splits, debt simplification, and balanced ledgers.

## License

MIT. See [LICENSE](LICENSE).
