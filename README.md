# Akash Gupta homepage and AI show guide

A responsive fan-made homepage with sample shows, an OpenAI conversational agent, configurable agent behavior, and timestamped chat transcripts.

## Requirements

- Node.js 22.13 or newer and npm
- An OpenAI API key for live chat

The application uses React, Vinext, Cloudflare Workers, and a D1 database. GitHub can host the source repository. GitHub Pages cannot run the server, AI API, or database.

## Run locally

```bash
npm run install:ci
cp .dev.vars.example .dev.vars
```

On Windows, copy `.dev.vars.example` to `.dev.vars` using your editor or file manager. Set your `OPENAI_API_KEY` in `.dev.vars`. Keep this file private; Git ignores it.

Initialize the local database, then start the app:

```bash
npm run db:setup
npm run dev
```

Open the Local URL printed by the server, usually `http://127.0.0.1:5173`.

- `/`: homepage and conversational agent
- `/admin`: persona, tone, empathy examples, initiative, and conversation goal
- `/admin/chats`: sessions and timestamped transcripts

Local admin sign-in uses a development identity. Hosted access requires authentication and the owner's server-side `ADMIN_EMAIL`. Local and hosted secrets are configured separately.

## Check and build

```bash
npm run typecheck
npm run build
```

To preview the production build locally, run `npm run start`. Use development mode for the local admin sign-in flow.

The included GitHub Actions workflow installs dependencies, checks TypeScript, and builds pushes and pull requests. It does not deploy or require an API key.

## Database and conversations

The `drizzle/` folder contains versioned schema migrations. `npm run db:setup` applies pending migrations to the local database and tracks them to avoid replay. Run it again after adding migrations.

Chats are stored in `chat_sessions` and `chat_turns`, with UTC timestamps, independent session IDs, user messages, assistant replies, and processing status. Each tab/page starts its own session when its first question is sent. Resetting the conversation starts a new session. Older transcripts remain available to the admin. Parallel sessions stay independent, and duplicate request IDs return the existing response.

Chat history from the original working environment is not included in this source archive. A fresh checkout starts with an empty database.

## Upload to GitHub

Extract the ZIP and open the `akash-gupta-homepage` folder. Create an empty GitHub repository, then run:

```bash
git init
git add .
git commit -m "Add homepage, AI agent, admin panel and transcripts"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the repository URL with your own. You can also open this folder in GitHub Desktop and publish it. Source files and dotfiles such as `.github`, `.gitignore`, and `.openai` belong at the repository root.

## Hosting

This export retains the existing Sites project identity in `.openai/hosting.json` and the Sites build integration. Publishing through Sites requires access to that project. Configure hosted `OPENAI_API_KEY` and `ADMIN_EMAIL` as server secrets. Publication applies the database migrations. The existing site has not been published because source upload was blocked by the original environment's approval policy.

For another Cloudflare deployment, configure your own Worker, D1 binding named `DB`, authentication, and secrets before publishing. The local development database ID is a placeholder and is not a production database.

## Source layout

- `app/page.tsx`: homepage and chat widget
- `app/admin/`: behavior controls and transcript viewer
- `lib/show-guide.ts`: AI requests and session history
- `lib/chat-store.ts`: session creation and transcript access
- `lib/agent-settings.ts`: configuration, validation and behavior instructions
- `db/schema.ts` and `drizzle/`: database schema and migrations
- `build/`: Worker entrypoint and Sites integration
- `scripts/`: installation, runtime, and local database setup

## Content

The listed shows are illustrative and are not bookable. Biography information is sourced from [BookMyShow](https://in.bookmyshow.com/person/aakash-gupta/1047892); confirmed show links and official channels are at [Akash's official link page](https://linktr.ee/theskygupta).
