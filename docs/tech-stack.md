# Tech Stack

Approved technology choices. For architecture responsibilities and boundaries, see `PROJECT.md` §7–11.

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate

## Backend

- Separate Node.js/TypeScript service
- API-oriented architecture
- Frontend must not contain direct external-platform credentials or privileged API operations

## Database

- PostgreSQL
- Prisma ORM

## Package management

- pnpm

## Deployment

- Dockerized application (frontend container, backend container, PostgreSQL)
- Initial deployment target: self-hosted Coolify
- Coolify is a deployment target, not an application dependency
- Docker remains the deployment boundary

## File storage

- Local filesystem (initial)
- All file access through a storage abstraction/service
- Future implementations: S3, Cloudflare R2, other S3-compatible object storage

## External APIs

- Canva Connect API (authentication, template retrieval, Autofill field discovery, design generation, export)
- Meta Graph API (Facebook Page publishing and scheduling)
