# Austin Humphrey Portfolio

Next.js application showcasing Blaze Intelligence deployments, case studies, and AI-powered contact workflows.

## Quick start

```bash
npm install
npm run dev
```

The site will be available at `http://localhost:3000`.

## Features

- Rich hero experience outlining Blaze Intelligence wins
- Modular sections for results, flagship projects, testimonials, and contact
- AI assistant API routes for Claude and ChatGPT with streaming responses
- Tailwind CSS design system with custom Blaze Intelligence palette

## Tech stack

- Next.js 14 (App Router, Edge runtime for AI routes)
- TypeScript with strict mode
- Tailwind CSS & lucide-react icon system
- Anthropic + OpenAI SDKs for AI assistants

## Environment variables

Create a `.env.local` file with the following keys:

```
ANTHROPIC_API_KEY=your_key
OPENAI_API_KEY=your_key
```

## Deployment

Deploy to Vercel with the standard Next.js adapter. Ensure the environment variables above are configured in the deployment target.

---

Austin Humphrey • Blaze Intelligence™