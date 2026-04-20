# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### London Bike Transit Planner (`artifacts/london-bike-transit`)
- **Preview path**: `/`
- **Kind**: React + Vite web app
- **Description**: Google Maps-style transit planner for London that replaces walking legs with cycling time. Uses TfL Journey Planner API and MapLibre GL JS with OpenFreeMap vector tiles (free, no API key, no rate limits).
- **Key features**:
  - Typeahead location search using Nominatim (OSM)
  - TfL public transport routing (Tube, Bus, Overground, Elizabeth line, DLR, National Rail)
  - Walking legs automatically replaced with cycling time estimates
  - Interactive MapLibre vector map with colour-coded route legs
  - Green dashed lines for cycling-substituted walking legs
  - TfL tube line colour coding
  - Journey time savings badge (cycling vs walking)

### API Server (`artifacts/api-server`)
- **Preview path**: `/api`
- **Routes**:
  - `GET /api/healthz` — health check
  - `GET /api/places/search?query=...` — Nominatim place search (London-bounded)
  - `GET /api/routes/plan?fromLat=...&fromLon=...&toLat=...&toLon=...` — TfL journey planner with cycling substitution
