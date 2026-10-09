# DefiLlama API Docs

Interactive API reference for the DefiLlama API, served at https://api-docs.defillama.com.
The site is the Vue app in `examples/web`, built on top of the Scalar monorepo in this repository.

## Where things live

| What | Where |
| --- | --- |
| Docs app | `examples/web` |
| OpenAPI specs | `defillama-openapi-free.json`, `defillama-openapi-pro.json` |
| LLM text files | `llms.txt`, `llms-free.txt`, `llms-pro.txt` (served at `/llms.txt`, `/llms-free.txt`, `/llms-pro.txt`) |
| Crawler files | `examples/web/public/robots.txt`, `sitemap.xml`, `404.html` |

Every user agent gets the same HTML homepage. There is no user-agent detection and no Pages Function; the site is static.

## Local development

```bash
pnpm install
pnpm dev:web        # http://localhost:5050
pnpm build:web      # production build into examples/web/dist
```

Node 22 (see `.nvmrc`). The build fails on purpose if any emitted HTML, CSS or JS file is larger than 2,000,000 bytes, which is Googlebot's per-resource fetch limit.

## Cloudflare Pages setup

The site is a Cloudflare Pages project connected to this GitHub repository.

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | empty (repository root) |
| Build command | see below |
| Build output directory | `examples/web/dist` |
| Build system | Version 3 |
| Automatic deployments | enabled |

Build command:

```bash
pnpm --filter @scalar-examples/web --filter @scalar-examples/web^... build
```

Do not append `cp -r functions ../../functions` to the build command. The `functions` directory was removed, so that step exits with an error and the whole build fails. The llms text files are copied into `dist` by the Vite build, so no `mv` step is needed either.

## Deployment steps

1. Open a pull request against `main`. Cloudflare builds a preview for every push and comments the preview URL on the PR.
2. Run the checks below against the preview URL.
3. Merge. Cloudflare builds `main` and deploys it to production automatically.
4. Run the same checks against https://api-docs.defillama.com.
5. If the build fails, the Pages project's deployment log shows the failing command. Builds are killed after 20 minutes.

## Testing before pushing to production

Replace `$URL` with the preview URL or the production URL.

```bash
# Homepage must be HTML for crawlers and browsers alike
curl -sI -A 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' $URL/ | grep -i content-type
curl -sI -A 'Mozilla/5.0 (compatible; bingbot/2.0)' $URL/ | grep -i content-type
curl -sI -A 'Mozilla/5.0' $URL/ | grep -i content-type
# expected: text/html, and no X-Served-As header

# Crawler files
curl -sI $URL/robots.txt | grep -i content-type     # text/plain
curl -sI $URL/sitemap.xml | grep -i content-type    # xml
curl -sI $URL/llms.txt | grep -i content-type       # text/plain

# Unknown routes must be a real 404, not a copy of the homepage
curl -s -o /dev/null -w '%{http_code}\n' $URL/does-not-exist   # 404

# No script above Googlebot's 2 MB limit
curl -s $URL/ | grep -oE '/assets/[^"]+\.js' | sort -u | while read js; do
  echo "$js $(curl -s --compressed $URL$js | wc -c) bytes"
done
```

After a production deploy, open Google Search Console, inspect the homepage, confirm the crawled page is HTML, submit `sitemap.xml`, and request indexing.
