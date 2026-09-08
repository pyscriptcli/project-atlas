# Project Atlas

Project Atlas is a private, full-screen geospatial studio for drawing, styling, organizing, importing, analyzing, and exporting map workspaces.

## Repository

- `apps/frontend` — Next.js map studio and Supabase Auth client.
- `apps/backend` — standalone authenticated Node.js API.
- `packages/types` — shared project and feature contracts.
- `packages/geo` — shared geometry operations.
- `packages/validation` — shared request schemas.
- `supabase/migrations` — database, ownership, row security, and private storage setup.
- `legacy` — original Python behavioral reference.

Folders and files use kebab-case; functions and variables use camelCase; components and types use PascalCase; constants use upper snake case.

## Local setup

1. Install Node.js 20 or newer and run `npm install` at the repository root.
2. Copy `.env.example` to `.env.local` and supply a Supabase project plus separate frontend/backend settings.
3. Apply the Supabase migrations in timestamp order.
4. Run `npm run dev`; the frontend defaults to port 3000 and the API to port 3001.

Useful commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Security

All project routes require a valid Supabase bearer token. Ownership is derived from that token and enforced again with row-level security. Assets are private and stored beneath the authenticated user ID. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.

Legacy anonymous projects are copied into `legacy_map_projects` and removed from the public project table by the security migration. They require deliberate administrator reassignment.

## Deployment

Create two Vercel projects from the same repository using `apps/frontend` and `apps/backend` as their respective roots. See [deployment documentation](docs/deployment.md) for variables, Auth redirect configuration, migrations, and smoke checks.
