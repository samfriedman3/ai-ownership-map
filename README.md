# AI Ownership Map

An interactive, source-linked map of **who owns and invests in the major AI
companies** — the frontier labs and the smaller specialists. Every relationship
links its sources and carries a "last verified" date, and a scheduled monitor
drafts updates for human review whenever a new deal is struck.

- **Graph view** — a radial network of companies and their backers; click any
  node to isolate its ties.
- **Detail view** — searchable, filterable cards per company with stakes,
  voting status, deal descriptions, source links, and a freshness badge.
- **Semi-automated updates** — a weekly job asks Claude (with live web search)
  to find ownership news not yet in the dataset and opens a **pull request** with
  proposals. Nothing goes live until a human reviews and merges it.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · React Flow
(`@xyflow/react`). Deploys to Vercel with zero configuration.

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build          # production build
npm run validate-data  # check data/ownership.json integrity (also runs in CI)
npm run monitor        # run the news monitor once (needs ANTHROPIC_API_KEY)
```

## The data

All facts live in [`data/ownership.json`](data/ownership.json) — two arrays,
`entities` (companies/investors/foundations) and `relationships` (directed
owner → company ties). The schema is documented in
[`lib/types.ts`](lib/types.ts). Because it's plain JSON, edits are ordinary,
reviewable diffs. `npm run validate-data` enforces referential integrity and
that every tie has at least one source.

> **Disclaimer:** informational only, compiled from public reporting — not
> investment advice. Private-company stakes are often undisclosed or approximate;
> verify against the linked sources before relying on any figure.

## How updating works ("when deals are struck")

The **semi-automated with review** model:

1. `.github/workflows/monitor.yml` runs weekly (and on-demand).
2. It runs [`scripts/monitor.mjs`](scripts/monitor.mjs), which asks Claude to
   web-search for recent AI ownership/investment/M&A news, compares it against
   the current dataset, and writes a proposal file to `data/proposals/`.
3. If anything is found, the workflow opens a PR labelled `needs-review`.
4. **You** review each proposal against its sources, apply the good ones to
   `ownership.json` (bumping the `verified` date), and merge. Bad or
   low-confidence items are discarded.

This keeps the site fresh without ever auto-publishing an unverified — or
hallucinated — financial claim.

To enable it, add an `ANTHROPIC_API_KEY` repository secret in GitHub settings.

## Deploy to Vercel

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Or import the repo at vercel.com — it detects Next.js automatically. No
environment variables are required for the site itself; `ANTHROPIC_API_KEY` is
only needed by the GitHub Action that runs the monitor.
