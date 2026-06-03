# LendOS Core Lending MVP

LendOS is a working MVP for an end-to-end core lending system covering onboarding, loan origination, product configuration, servicing, collections, collateral management, reporting, and public-ready admin access.

## Features

- Admin login with server-side session cookie
- Loan product catalog for secured and unsecured lending
- Loan application creation
- Loan lifecycle actions
- EMI posting
- Delinquency and collections tracking
- Collateral management view
- Backend audit activity
- JSON persistence for MVP use
- Docker and Node.js deployment support

## Run Locally

```powershell
npm start
```

Then open:

```text
http://localhost:4174
```

Default local credentials:

```text
Email: admin@lendos.local
Password: lendos-admin
```

Set these before any public deployment:

```text
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=a-strong-password
NODE_ENV=production
```

## Deploy

See [DEPLOY.md](./DEPLOY.md).

## Production Roadmap

- Replace JSON storage with PostgreSQL
- Add full RBAC and staff/customer portals
- Add encrypted document storage
- Integrate KYC, credit bureau, payments, e-sign, and accounting
- Add immutable audit logs, monitoring, backups, and rate limiting
