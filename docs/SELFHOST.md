# Self-Hosting Guide

This document outlines the steps required to run **Imply** on your own. Imply is a web app built using the JavaScript framework **Solid Start**. In production, we deploy it to **Cloudflare Pages**, but it can be deployed anywhere (e.g., **Vercel**, **bare metal**, etc.).

If you don't have **Bun** installed, we recommend doing so.

**Happy self-hosting!**

---

## 1. Clone & Install Dependencies

```sh
git clone https://github.com/tri2820/imply
cd imply
bun i
```

---

## 2. Set Up `.env` Keys

Create an `.env` file with the following keys:

```sh
BUN_VERSION=

# AI
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
REASONING_MODEL=

# Internet
BRAVE_SEARCH_API_KEY=

# Database
JWT_SECRET_KEY=
INSTANTDB_APP_ID=
INSTANT_APP_ADMIN_TOKEN=
```

### 🔑 Key Details:

1. **BUN_VERSION**: Required for using Bun with Cloudflare Pages. Set it to `1.1.38` if unsure.
2. **InstantDB**: Imply uses **InstantDB**. Since InstantDB is open-source, you can self-host it or use their free & unlimited cloud version. To set it up:

   ```sh
   # In root folder
   npx instant-cli@latest push schema
   # Choose "Create a new app" and push the schema
   ```

   Afterward, visit the **InstantDB dashboard** to get `INSTANTDB_APP_ID` and `INSTANT_APP_ADMIN_TOKEN`.

3. **JWT_SECRET_KEY**: Generate this key with the following command:

   ```sh
   bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **BRAVE_SEARCH_API_KEY**: Get a free key from [Brave](https://brave.com/search/api/).
5. **OPENAI_API_KEY**: API key to use with OpenAI SDK. **OPENAI_MODEL** and **OPENAI_BASE_URL** are optional. In production, we use Open Router to mix & match multiple models, so our `.env` looks like this.

```
OPENAI_API_KEY=<Get from OpenRouter>
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
REASONING_MODEL=deepseek/deepseek-r1
```

## 3. Running the App

### Locally

```sh
cp app.config.bun.ts app.config.ts
bun run build
bun run start:bun
```

### Deploy to Cloudflare Pages

1. **Framework preset**: None
2. **Build command**: `bun i && bun run build`
3. **Build output directory**: `dist`
4. **Environment variables**: Copy over the keys from the `.env` file
