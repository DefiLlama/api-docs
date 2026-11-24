/**
 * Agent eval: when a user gives a coding agent a DefiLlama API key, does the code it ships call
 * pro-api.llama.fi, or the rate-limited free hosts? Paying users churned over the second outcome.
 *
 * Each run is a headless `claude -p` session in a temp folder with a user-style prompt and a copy of
 * the docs. Grade the results with grade.mjs, which runs the shipped scripts and records the hosts.
 *
 * Usage (from the repo root, needs a real key and the claude CLI):
 *   DEFILLAMA_API_KEY=... node scripts/docs-eval/run.mjs --label after
 *   node scripts/docs-eval/grade.mjs after
 *
 * Options: --docs <dir> (default: this checkout), --modes free,home,none,web, --models haiku,sonnet,opus,
 *          --cases top,fees,fix429,depeg,pro, --reps 1, --conc 6
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const HERE = import.meta.dirname
const REPO = path.join(HERE, '..', '..')
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`)
  return i > 0 ? process.argv[i + 1] : d
}
const KEY = process.env.DEFILLAMA_API_KEY
if (!KEY) {
  throw new Error('Set DEFILLAMA_API_KEY to a real API plan key, the agents run their code against the live API')
}
const DOCS = arg('docs', REPO)
const MODES = arg('modes', 'free,home').split(',')
const MODELS = arg('models', 'haiku,sonnet,opus').split(',')
const CASES = arg('cases', 'top,fees,fix429,depeg,pro').split(',')
const REPS = Number(arg('reps', '1'))
const CONC = Number(arg('conc', '6'))
const OUT = path.join(os.tmpdir(), 'defillama-docs-eval', arg('label', 'run'))

/** The prompts vary how the user mentions the key, because that is what the agents key off. */
const PROMPTS = {
  top: `I'm subscribed to the DefiLlama API plan, my API key is in the DEFILLAMA_API_KEY env var. Write top_protocols.py that prints the 10 protocols with the highest TVL and the current price of ETH. Run it to make sure it works.`,
  fees: `Write fees.js (Node 18+, no dependencies) that prints Aave's current TVL and its fees over the last 7 days using the DefiLlama API. My DefiLlama API key: ${KEY}. Run it.`,
  fix429: `dashboard.py keeps failing with 429 Too Many Requests from DefiLlama, but I'm paying for their API ($300/mo plan, key in DEFILLAMA_API_KEY). Fix it.`,
  depeg: `Write depeg_check.py: using DefiLlama, print every stablecoin with more than $100M circulating whose current price is below $0.99. My DefiLlama key is in .env. Run it.`,
  pro: `I have a DefiLlama Pro subscription. Key: ${KEY}. Write a script that fetches stablecoin market caps by chain and the top 5 USDC yield pools by APY. Run it.`,
}

/**
 * How the agent meets the docs. `free` is the failure we saw in the wild: the agent only read the
 * free endpoint list. `none` and `web` measure the agent's prior and the live site, docs edits do
 * not change them.
 */
const MODE_DOCS = {
  none: [],
  web: [],
  free: ['llms-free.txt'],
  home: ['index.html', 'llms.txt', 'llms-free.txt', 'llms-pro.txt'],
}
const docsSource = (f) => {
  const flat = path.join(DOCS, f)
  return fs.existsSync(flat) ? flat : path.join(DOCS, 'examples', 'web', f)
}
const docsNote = (mode) =>
  mode === 'free'
    ? `\n\n(DefiLlama's API docs are saved in ./defillama-docs/.)`
    : mode === 'home'
      ? `\n\n(A mirror of api-docs.defillama.com is saved in ./defillama-docs/, start at index.html.)`
      : ''

const jobs = []
for (const mode of MODES) {
  for (const c of CASES) {
    for (const model of MODELS) {
      for (let r = 0; r < REPS; r++) {
        jobs.push({ mode, c, model, dir: path.join(OUT, `${mode}-${c}-${model}-${r}`) })
      }
    }
  }
}

const run = (job) =>
  new Promise((resolve) => {
    fs.rmSync(job.dir, { recursive: true, force: true })
    fs.mkdirSync(job.dir, { recursive: true })
    for (const f of MODE_DOCS[job.mode]) {
      fs.mkdirSync(path.join(job.dir, 'defillama-docs'), { recursive: true })
      fs.copyFileSync(docsSource(f), path.join(job.dir, 'defillama-docs', f))
    }
    if (job.c === 'depeg') {
      fs.writeFileSync(path.join(job.dir, '.env'), `DEFILLAMA_API_KEY=${KEY}\n`)
    }
    if (job.c === 'fix429') {
      fs.copyFileSync(path.join(HERE, 'fixtures', 'dashboard.py'), path.join(job.dir, 'dashboard.py'))
    }
    const tools = ['Bash,Read,Write,Edit,Glob,Grep', job.mode === 'web' ? ',WebFetch,WebSearch' : ''].join('')
    // ponytail: no user settings, MCP or hooks, so the agent behaves like a stock install
    const args = ['-p', '--model', job.model, '--setting-sources', '', '--strict-mcp-config', '--tools', tools]
    args.push('--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose')
    const p = spawn('claude', args, { cwd: job.dir, env: { ...process.env, DEFILLAMA_API_KEY: KEY } })
    const log = fs.createWriteStream(path.join(job.dir, '.transcript.jsonl'))
    p.stdout.pipe(log)
    p.stderr.pipe(log)
    p.stdin.end(PROMPTS[job.c] + docsNote(job.mode))
    const timer = setTimeout(() => p.kill(), 15 * 60 * 1000)
    p.on('close', () => {
      clearTimeout(timer)
      resolve()
    })
  })

let next = 0
let done = 0
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++]
      await run(job)
      console.log(`[${++done}/${jobs.length}] ${path.basename(job.dir)}`)
    }
  }),
)
console.log(`done -> ${OUT}`)
