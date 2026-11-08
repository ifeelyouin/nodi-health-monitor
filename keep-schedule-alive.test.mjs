import assert from 'node:assert/strict'
import { test } from 'node:test'
import { keepScheduleAlive } from './keep-schedule-alive.mjs'

test('current month does not use any token or make an API request', async () => {
  assert.equal(await keepScheduleAlive({ currentMonth: '2026-11', month: '2026-11', fetcher: () => { throw Error('unexpected request') } }), false)
})

test('monthly activity uses a compare-and-swap on the heartbeat file in this repository only', async () => {
  const options = { currentMonth: '2026-11', month: '2026-12', blobSha: 'a'.repeat(40), repository: 'ifeelyouin/nodi-health-monitor', token: 'fixture' }
  assert.equal(await keepScheduleAlive({ ...options, fetcher: async (url, init) => {
    assert.equal(url, 'https://api.github.com/repos/ifeelyouin/nodi-health-monitor/contents/.monitor-month')
    const body = JSON.parse(init.body)
    assert.equal(body.sha, options.blobSha)
    assert.equal(Buffer.from(body.content, 'base64').toString(), '2026-12\n')
    return new Response('{}', { status: 200 })
  } }), true)
  await assert.rejects(keepScheduleAlive({ ...options, repository: 'ifeelyouin/realtime-whiteboard' }), /Invalid heartbeat configuration/)
  await assert.rejects(keepScheduleAlive({ ...options, fetcher: async () => new Response('{}', { status: 409 }) }), /Monitor heartbeat failed \(409\)/)
})
