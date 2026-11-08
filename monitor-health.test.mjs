import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

test('public health checks accept the existing success contract and fail on app, Auth and timeout errors', async t => {
  let webStatus = 200, authStatus = 401, html = true, delay = 0
  const server = createServer((req, res) => {
    setTimeout(() => {
      res.writeHead(req.url === '/auth/v1/health' ? authStatus : webStatus, { 'Content-Type': req.url === '/auth/v1/health' || !html ? 'application/json' : 'text/html' })
      res.end(req.url === '/auth/v1/health' ? '{}' : '<div id="root"></div>')
    }, delay)
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => { server.closeAllConnections(); server.close() })
  const base = `http://127.0.0.1:${server.address().port}`
  async function check(timeout = '1000') {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./monitor-health.mjs', import.meta.url))], {
      env: { ...process.env, MONITOR_APP_URL: base, MONITOR_SUPABASE_URL: base, MONITOR_TIMEOUT_MS: timeout }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    child.stdout.on('data', data => { output += data })
    child.stderr.on('data', data => { output += data })
    const [code] = await once(child, 'close')
    return { code, output }
  }
  const healthy = await check()
  assert.equal(healthy.code, 0, healthy.output)
  webStatus = 503
  assert.notEqual((await check()).code, 0)
  webStatus = 200; authStatus = 503
  assert.notEqual((await check()).code, 0)
  authStatus = 401; html = false
  assert.notEqual((await check()).code, 0)
  html = true; delay = 100
  assert.notEqual((await check('10')).code, 0)
})
