/**
 * Grades an agent-eval run by behavior, not by grepping: every script the agent shipped runs with the
 * key set, behind a local proxy that records which hosts it connects to. A script that uses pro-api
 * when a key is set and falls back to a free host without one passes, a grep would flag it.
 *
 * Usage: DEFILLAMA_API_KEY=... node scripts/docs-eval/grade.mjs <label> [name filter]
 * PRO = only pro-api.llama.fi, FREE = only free hosts, MIXED = both, NOCALL = no script or no call.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const [label = 'run', filter = ''] = process.argv.slice(2)
const KEY = process.env.DEFILLAMA_API_KEY
if (!KEY) {
  throw new Error('Set DEFILLAMA_API_KEY, the shipped scripts need it')
}
const root = path.join(os.tmpdir(), 'defillama-docs-eval', label)

let seen = new Set()
const proxy = http.createServer((req, res) => {
  seen.add(new URL(req.url).hostname)
  res.writeHead(502).end()
})
proxy.on('connect', (req, sock, head) => {
  const [host, port] = req.url.split(':')
  seen.add(host)
  const up = net.connect(Number(port) || 443, host, () => {
    sock.write('HTTP/1.1 200 OK\r\n\r\n')
    up.write(head)
    up.pipe(sock)
    sock.pipe(up)
  })
  up.on('error', () => sock.destroy())
  sock.on('error', () => up.destroy())
})
await new Promise((r) => proxy.listen(0, '127.0.0.1', r))
const PROXY = `http://127.0.0.1:${proxy.address().port}`
// Python honors HTTPS_PROXY, Node 24 fetch does with NODE_USE_ENV_PROXY.
const env = { ...process.env, HTTPS_PROXY: PROXY, HTTP_PROXY: PROXY, https_proxy: PROXY, http_proxy: PROXY }
env.NODE_USE_ENV_PROXY = '1'

const exec = (file) =>
  new Promise((resolve) => {
    const p = spawn(file.endsWith('.py') ? 'python' : 'node', [path.basename(file)], { cwd: path.dirname(file), env })
    p.stdout.resume()
    p.stderr.resume()
    const timer = setTimeout(() => p.kill(), 120_000)
    p.on('close', (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })

const rows = []
for (const name of fs
  .readdirSync(root)
  .sort()
  .filter((n) => n.includes(filter))) {
  const dir = path.join(root, name)
  const scripts = fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((f) => /\.(py|js|mjs)$/.test(f) && !/test|defillama-docs|node_modules/i.test(f))
  seen = new Set()
  const codes = []
  for (const s of scripts) {
    codes.push(await exec(path.join(dir, s)))
  }
  const hosts = [...seen].filter((h) => h.endsWith('llama.fi'))
  const free = hosts.some((h) => h !== 'pro-api.llama.fi')
  const pro = hosts.includes('pro-api.llama.fi')
  const verdict = !hosts.length ? 'NOCALL' : free ? (pro ? 'MIXED' : 'FREE') : 'PRO'
  rows.push({ name, verdict })
  console.log(`${verdict.padEnd(7)} ${name.padEnd(26)} exit=${codes.join(',')} hosts=${hosts.join(',')} [${scripts}]`)
}
proxy.close()

const byMode = {}
for (const r of rows) {
  const m = r.name.split('-')[0]
  byMode[m] ??= { pro: 0, total: 0 }
  byMode[m].total++
  byMode[m].pro += r.verdict === 'PRO' ? 1 : 0
}
console.log(
  `\n${label} PRO by mode: ${Object.entries(byMode)
    .map(([m, t]) => `${m} ${t.pro}/${t.total}`)
    .join('  ')}`,
)
