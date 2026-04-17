# LyricsRay — Claude Code Guide

## Project Overview

LyricsRay is a Next.js app that helps parents and guardians evaluate whether song lyrics are age-appropriate for children (up to age 21). It uses the Anthropic Claude API to perform multi-dimensional lyrical analysis — detecting explicit language, mature themes, cultural references, and more — and returns age-based recommendations.

## Repository Structure

```
├── deploy/
│   └── terraform/         # Infrastructure as code (AWS/cloud deployment)
├── docs/                  # Additional documentation
├── web/                   # Next.js application (primary workspace)
│   ├── public/            # Static assets
│   └── src/               # App source code
├── .gitignore
└── README.md
```

Most development happens inside `web/`.

## Tech Stack

- **Framework**: Next.js (TypeScript, ~95% of codebase)
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514` or as set in `.env`)
- **CAPTCHA**: Altcha (spam/bot protection on forms)
- **Infrastructure**: Terraform (HCL, ~4% of codebase)

## Development Setup

All commands below are run from the `web/` directory unless otherwise noted.

```bash
cd web
npm install
```

Create a `.env` file in `web/`:

```env
APP_NAME=LyricsRay
APP_VERSION=v1.0
APP_URL=http://localhost:3000
ENV=dev
IS_LOCAL=1
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ANTHROPIC_API_KEY=<your key>
ALTCHA_KEY=<your key>
ALTCHA_SECRET=<your secret>
```

## Common Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run test     # Run tests
npm run lint     # Run ESLint
npm run build    # Build for production
```

## Environment Variables

| Variable          | Purpose                                      |
|-------------------|----------------------------------------------|
| `APP_NAME`        | Display name                                 |
| `APP_VERSION`     | Version string shown in UI                   |
| `APP_URL`         | Base URL (used for redirects/meta)           |
| `ENV`             | `dev` or `prod`                              |
| `IS_LOCAL`        | Set to `1` for local dev (skips some checks) |
| `ANTHROPIC_MODEL` | Claude model to use for analysis             |
| `ANTHROPIC_API_KEY` | Anthropic API key — never commit this      |
| `ALTCHA_KEY`      | Altcha CAPTCHA public key                    |
| `ALTCHA_SECRET`   | Altcha CAPTCHA secret — never commit this   |

**Never commit `.env` or any file containing real API keys.**

## Core Feature: Lyrics Analysis

The heart of the app is the AI-powered lyrics analysis pipeline. When working in this area, keep these principles in mind:

- Analysis is performed server-side via Next.js API routes (not client-side) to protect the API key.
- The Claude prompt is the core logic — changes to it affect all analysis output. Test carefully.
- Results include: explicit language detection, mature theme recognition, contextual understanding, cultural sensitivity, and a minimum recommended age.
- The system should be non-judgmental in tone — it informs, it doesn't moralize.

## Code Conventions

- **Language**: TypeScript throughout. Avoid `any` types where possible.
- **Linting**: ESLint is configured — run `npm run lint` before committing.
- **Tests**: Add or update tests when changing business logic, especially the analysis pipeline.
- **API routes**: Live under `web/src/app/api/` (Next.js App Router convention).
- **Components**: Use functional components with hooks. No class components.
- **Styling**: Check existing patterns before introducing new CSS approaches.

## Sensitive Areas — Be Careful

- **Anthropic prompt changes**: The system prompt for lyrical analysis is sensitive. Changes can silently degrade output quality. Always test with a variety of songs (clean, explicit, borderline).
- **Age recommendation logic**: This is the primary user-facing output. Be conservative when modifying age thresholds or scoring.
- **Altcha CAPTCHA integration**: Don't remove or weaken bot protection on the analysis endpoint.
- **API key handling**: Ensure keys are only ever accessed server-side. Never expose them to the client bundle.

## Deployment

Infrastructure lives in `deploy/terraform/`. The app is deployed via CI/CD (GitHub Actions). For infra changes, coordinate carefully — don't apply Terraform changes locally against production without review.

## What This App Is NOT

- Not a parental control system or content blocker.
- Not a replacement for parental judgment (explicitly stated in the UI).
- Not a mental health or therapy resource.

Keep this framing in mind when writing user-facing copy or error messages.