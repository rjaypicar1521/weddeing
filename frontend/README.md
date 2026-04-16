# Wedding-Online Frontend (Next.js 15)

## Local Development

1. Install dependencies:
   npm install
2. Copy environment variables:
   copy .env.example .env.local
3. Run development server:
   npm run dev
4. Open http://localhost:3000

## Vercel Deployment Setup

Project settings for Vercel:
- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`

Environment variables to configure in Vercel:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_CDN_URL`

Use `.env.example` as the source of truth for expected frontend env keys.

## GitLab CI/CD

This repo now includes a root GitLab pipeline file:

- `.gitlab-ci.yml`
  Runs frontend lint/type-check/build and backend Laravel tests on pushes and merge requests.
  Deploys frontend to Vercel on `main` when required variables are configured.

Required GitLab CI/CD variables for frontend deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The frontend deploy job is skipped automatically if those variables are not set.

Backend deployment is intentionally not automated here because the project context still marks backend hosting as deferred.

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui ready (`components.json`)
