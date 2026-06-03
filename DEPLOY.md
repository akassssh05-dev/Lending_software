# LendOS Public Deployment

This folder is a deployable MVP of the core lending system.

## Local Run

```powershell
cd outputs
$env:ADMIN_EMAIL="admin@example.com"
$env:ADMIN_PASSWORD="change-this-password"
npm start
```

Open:

```text
http://localhost:4174
```

## Required Environment Variables

Set these before publishing the app:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=4174
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=a-strong-password
```

## Docker Run

```powershell
cd outputs
docker build -t lendos-core .
docker run -p 4174:4174 `
  -e NODE_ENV=production `
  -e ADMIN_EMAIL=admin@example.com `
  -e ADMIN_PASSWORD=change-this-password `
  lendos-core
```

## Deploy To A Public Host

Use any Node.js or Docker hosting provider.

Typical settings:

```text
Root directory: outputs
Build command: none
Start command: npm start
Port: 4174 or provider-assigned PORT
```

For platforms that inject `PORT`, do not hardcode the port. The server already reads `process.env.PORT`.

## Current MVP Capabilities

- Admin login
- Product catalog API
- Loan list API
- Loan creation API
- Loan lifecycle action API
- EMI posting action
- Delinquency action
- Rejection action
- Demo reset action
- Persistent JSON data store
- Backend audit log

## Production Upgrade Checklist

- Replace JSON storage with PostgreSQL
- Add proper identity provider such as Keycloak/Auth0/Cognito
- Add role-based permissions per operation
- Add encrypted document storage
- Add KYC, bureau, payment, e-sign, and accounting integrations
- Add database migrations and backups
- Add audit log immutability
- Add HTTPS, WAF, rate limiting, and monitoring
- Add separate customer, staff, collection, and admin portals
