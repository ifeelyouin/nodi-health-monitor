const appUrl = process.env.MONITOR_APP_URL
const supabaseUrl = process.env.MONITOR_SUPABASE_URL
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS ?? 10_000)

if (!appUrl || !supabaseUrl) {
  throw new Error('MONITOR_APP_URL and MONITOR_SUPABASE_URL are required')
}

async function check(name, url, validate) {
  const startedAt = performance.now()
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'user-agent': 'nodi-release-monitor/1.0' },
  })
  const body = await response.text()
  const durationMs = Math.round(performance.now() - startedAt)
  if (!validate(body, response)) {
    throw new Error(`${name} check failed: status=${response.status} durationMs=${durationMs}`)
  }
  return { name, status: response.status, durationMs }
}

const checks = await Promise.all([
  check('web', appUrl, (body, response) => response.ok && response.headers.get('content-type')?.includes('text/html') === true && body.includes('id="root"')),
  check('supabase-auth', new URL('/auth/v1/health', supabaseUrl), (body, response) => [200, 401].includes(response.status) && body.length > 0),
])

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), checks }, null, 2))
