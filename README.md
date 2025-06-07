# language-learn

Small personal project to help with expanding vocabulary in a foreign language. Consists of a browser extension, a Telegram bot, a backend server and a web client. The extension and Telegram bot allow you to quickly add words to your learning list. The web client provides a flashcard-based training interface for memorizing them.

Testing ground for some experimentation with codegen from types, tsc api, vibe coding.

## Architecture

| Package | Purpose |
|---|---|
| `packages/server` | Express API server + Telegram bot (Telegraf) + Prisma (SQLite) |
| `packages/client` | React web app for flashcard training sessions |
| `packages/extension` | Browser extension for adding words from any page |

Word definitions are fetched from multiple dictionaries and cached in the database. When a word arrives (via bot or extension), it is lemmatized and looked up; existing definitions are reused.

### How it fits together

```
Telegram Bot / Web App / Browser Extension
        |
        v
   Express API  -->  Prisma (SQLite)
        |
    codegen pipeline
     +------+
     v      v
  OpenAPI   Zod schemas
  (JSON)    (generated)
     |
     v
  React client
  (typed API client)
```

## Type-safe codegen pipeline

Instead of manually writing API schemas, the pipeline derives everything from the TypeScript handler source code:

1. **`server/codegen/gatherApi.ts`** Uses the TypeScript Compiler API to statically analyze route handler files. Finds `createGetHandler(router, '/path').use(...).handle(fn)` call chains and extracts the handler's parameter types, return types, and middleware error types into an intermediate representation (`MethodDescription`).

2. **`server/codegen/generateOpenApi.ts`** Converts the intermediate representation into an OpenAPI 3.1 specification. Parses `StatusResponse<400 | 500, { error: string }>` unions to extract per-status-code response schemas.

3. **`server/codegen/convertTypeDescriptionToZod.ts`**  Generates Zod validation schemas from the same type information. Uses topological sorting on the type dependency graph so schemas are emitted in valid declaration order.

4. **`client/codegen/apiClientGenerate.ts`** Reads the generated `openapi.json` and produces a fully typed API client where each method knows its path params, body params, and all possible response status codes.

The result: handler types are the single source of truth. Change a handler's signature, re-run `yarn codegen`, and the API client, validation schemas, and OpenAPI spec all update automatically. No manual synchronization, no runtime/type mismatches.

## Type-safe middleware builder

Route handlers use a fluent builder pattern where each `.use()` call threads generics forward:

```typescript
createPostHandler(router, "/training-set/mark")
  .use(withSchemaValidation<MarkPath, MarkData>())  // adds 400 to error union
  .use(withAuthentication(prisma))                    // adds 401, puts user in context
  .handle(async (path, data, { extra: { user } }) => {
    // TypeScript knows: path is MarkPath, data is MarkData,
    // context.extra.user exists, and possible responses include 400 | 401
  });
```

Middleware can either pass data forward (with transformed types) or early-return a `StatusResponse`. All possible error responses accumulate in the builder's type parameter, so the generated client knows every status code a given endpoint can return.

See [`server/src/httpRouteHandlers.ts`](packages/server/src/httpRouteHandlers.ts) and [`server/src/middlewares.ts`](packages/server/src/middlewares.ts).

## Development

### Prerequisites

- Node.js ≥ 20
- [Yarn 4](https://yarnpkg.com/getting-started/install) (`corepack enable`)
- A Telegram bot token (create one via [@BotFather](https://t.me/BotFather))
- A [Gemini API key](https://aistudio.google.com/app/apikey) for AI-assisted definition lookup

### Setup

```bash
# Install all dependencies across workspaces
yarn install

# Run codegen (generates Prisma client, OpenAPI types, Zod schemas)
yarn codegen
```

### Environment variables

**`packages/server/.env`** (copy from `.env.example`):

```env
DATABASE_URL="file:./dev.db"
TELEGRAM_BOT_TOKEN=<your bot token>
WEB_CLIENT_URL=http://localhost:5173   # used for auth redirect links sent in bot messages
PORT=3000
GEMINI_API_KEY=<your Gemini API key>
```

**`packages/client/.env`** (copy from `.env.example`):

```env
VITE_API_BASE_URL=http://localhost:3000
```

### Database

```bash
# Apply migrations and generate Prisma client
cd packages/server
yarn prisma migrate deploy
yarn prisma generate
```

### Running locally

Start the server and client in separate terminals:

```bash
# Terminal 1 — backend (hot-reloads via tsx)
cd packages/server
yarn dev

# Terminal 2 — frontend (Vite dev server, default http://localhost:5173)
cd packages/client
yarn dev
```

### Codegen

The project uses a custom codegen pipeline that derives types and Zod schemas from the TypeScript source and generates a typed API client for the frontend.

```bash
# Run codegen for all packages
yarn codegen

# Run for a single package
yarn workspace server run codegen
yarn workspace client run codegen
```

Re-run codegen after changing API handler types or the Prisma schema.

### Build

```bash
# Build all packages (runs codegen first)
yarn build

# Build only the client (runs codegen first)
yarn build:client
```

### Validation

```bash
# Type-check, lint and format-check all packages
yarn validate
```

### Production

```bash
# After build
yarn start:prod
```

