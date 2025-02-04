# Self-Hosting Guide

This document outlines the steps required to run **Imply**, either via Docker (recommended) or by building yourself. Both methods require setting up the `.env` file.

## Create an `.env` file with the following keys:

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

# Analytics
POSTHOG_TOKEN=
```

### 🔑 Key Details:

1. **BUN_VERSION**: Required for using Bun with Cloudflare Pages. Set it to `1.1.38` if unsure.
2. **InstantDB**: Imply uses **InstantDB**. Since InstantDB is open-source, you can self-host it or use their free & unlimited cloud version. To set it up:

   ```sh
   # In the root folder
   npx instant-cli@latest push schema
   # Choose "Create a new app" and push the schema
   ```

   Afterward, visit the **InstantDB dashboard** to get `INSTANTDB_APP_ID` and `INSTANT_APP_ADMIN_TOKEN`.

3. **JWT_SECRET_KEY**: Generate this key with the following command:

   ```sh
   bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **BRAVE_SEARCH_API_KEY**: Get a free key from [Brave](https://brave.com/search/api/).

5. **OPENAI_API_KEY**: API key to use with OpenAI SDK. **OPENAI_MODEL** and **OPENAI_BASE_URL** are optional. In production, we use Open Router to mix & match multiple models, so our `.env` looks like this:

```sh
OPENAI_API_KEY=<Get from OpenRouter>
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
REASONING_MODEL=deepseek/deepseek-r1
```

6. **POSTHOG_TOKEN**: This is optional & used for analytics purposes.

## Method 1: Via Docker

The easiest way to get Imply running on your machine is via Docker.

```sh
docker run -d --name imply --env-file .env -p 3000:3000 implyapp/imply
```

## Method 2: Cloning and Building

Imply is a web app built using the JavaScript framework **Solid Start**.  
If you don't have **Bun** installed, we recommend doing so.

### 1. Clone & Install Dependencies

```sh
git clone https://github.com/tri2820/imply
cd imply
bun i
```

### 2. Add the `.env` file

Make sure you have the `.env` file created as described in the previous section & put it in the root folder.

### 3. Build & Run the App

```sh
cp app.config.bun.ts app.config.ts
bun run build
bun run start:bun
```
