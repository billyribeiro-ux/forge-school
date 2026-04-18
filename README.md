# ForgeSchool

A fullstack learning platform built at PE7 Distinguished standard with SvelteKit.

ForgeSchool teaches students how to build a production-grade membership platform with WooCommerce-equivalent functionality. The platform itself is the worked example — students browse ForgeSchool and read lessons describing how ForgeSchool was built.

## Stack

- **SvelteKit 2.x** — fullstack framework
- **Svelte 5** — runes-only UI
- **TypeScript** — strict mode, zero `any`
- **PostgreSQL 16** — via Drizzle ORM
- **Stripe** — test-mode payments
- **Motion** — GPU-accelerated animations
- **Biome** — lint + format
- **Vitest + Playwright** — testing

## Getting Started

```bash
# Install dependencies (pnpm only)
pnpm install

# Start local Postgres
docker compose up -d

# Run migrations and seed
pnpm db:reset && pnpm db:seed

# Start dev server
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm check` | TypeScript type checking |
| `pnpm lint` | Biome lint + format check |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm db:reset` | Drop and recreate database |
| `pnpm db:seed` | Seed development data |
| `pnpm db:studio` | Open Drizzle Studio |

## Documentation

See [`docs/`](./docs/) for:
- [Product Specification](./docs/SPEC.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Testing](./docs/TESTING.md)
- [Deployment](./docs/DEPLOYMENT.md)

## Curriculum

The full PE7 course lives in [`curriculum/`](./curriculum/). Each lesson corresponds to exactly one git commit in this repository.

## License

Proprietary. All rights reserved.
