# Ask my agent: backend

A tiny Cloudflare Worker that answers visitors' questions about Tal using Claude.
The website calls this Worker; the Worker holds the Anthropic API key, so the key is never in the public site.

- `src/profile.js`: everything the agent knows about Tal. Edit it, then redeploy.
- `src/index.js`: the Worker (rules for the agent, safety limits, the Claude call).
- `wrangler.toml`: Worker name and a rate limit of 10 questions per minute per visitor.

## One-time setup (about 10 minutes)

1. **Anthropic API key.** Sign in at https://console.anthropic.com, add a small amount of credit, create an API key, and set a monthly spend limit (for example $5) under Limits.
2. **Cloudflare account.** Create a free account at https://dash.cloudflare.com/sign-up.
3. **Deploy**, from this `agent/` folder on your computer (needs Node.js 20+):

   ```bash
   npm install
   npx wrangler login                          # opens the browser to connect Cloudflare
   npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when asked
   npm run deploy
   ```

   The last command prints the Worker's address, like `https://tal-agent.<your-name>.workers.dev`.
4. **Connect the site.** In `index.html`, put that address in the `agent-url` meta tag:

   ```html
   <meta name="agent-url" content="https://tal-agent.<your-name>.workers.dev">
   ```

   Push to `main`. The chat panel switches from "offline" to "online".

## Cost

The agent uses Claude Opus 5.5 at low effort with short answers. Each question costs roughly 1 cent, less when the same visitor asks several in a row (the profile is cached). The spend limit in step 1 caps the worst case.

## Local testing

Create `agent/.dev.vars` with `ANTHROPIC_API_KEY=...` (it's git-ignored), run `npm run dev`, and set the meta tag to the local address it prints. Serve the site with `python3 -m http.server 8000` from the repo root.
