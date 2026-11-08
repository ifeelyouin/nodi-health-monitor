import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function keepScheduleAlive({ currentMonth, month, blobSha, repository, token, fetcher = fetch }) {
  if (currentMonth === month) return false
  if (!/^\d{4}-\d{2}$/.test(month) || repository !== 'ifeelyouin/nodi-health-monitor' || !token || !/^[a-f0-9]{40}$/.test(blobSha)) {
    throw new Error('Invalid heartbeat configuration')
  }
  const response = await fetcher(`https://api.github.com/repos/${repository}/contents/.monitor-month`, {
    method: 'PUT', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ message: `Record active health monitoring for ${month} [skip ci]`, content: Buffer.from(`${month}\n`).toString('base64'), sha: blobSha }),
  })
  if (!response.ok) throw new Error(`Monitor heartbeat failed (${response.status})`)
  return true
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const month = new Date().toISOString().slice(0, 7)
  const currentMonth = readFileSync(new URL('./.monitor-month', import.meta.url), 'utf8').trim()
  const changed = await keepScheduleAlive({ currentMonth, month,
    blobSha: currentMonth === month ? undefined : execFileSync('git', ['rev-parse', 'HEAD:.monitor-month'], { encoding: 'utf8' }).trim(),
    repository: process.env.GITHUB_REPOSITORY, token: process.env.GITHUB_TOKEN,
  })
  console.log(changed ? 'Recorded monthly monitoring activity.' : 'Monthly monitoring activity is current.')
}
