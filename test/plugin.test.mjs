import test from 'node:test'
import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createMutex,
  dshHome,
  parseSessionIds,
  purgeSessions,
  readState,
  stateFile,
  unarchiveSessions,
  writeState,
} from '../lib/index.js'

async function withTempHome(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-recycle-bin-test-'))
  const previous = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  try {
    await run(dir)
  } finally {
    if (previous === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previous
    await fs.rm(dir, { recursive: true, force: true })
  }
}

test('state file is written and read atomically under DSH_HOME', async () => {
  await withTempHome(async () => {
    const state = { version: 1, items: [{ sessionId: 'session-a', trashedAt: '2026-01-01T00:00:00.000Z' }], deleted: [] }
    await writeState(state)
    const loaded = await readState()
    assert.deepEqual(loaded, state)
    assert.equal(stateFile().endsWith(path.join('cache', 'dsh-recycle-bin', 'state.json')), true)
  })
})

test('missing/corrupt state falls back to empty', async () => {
  await withTempHome(async () => {
    assert.deepEqual(await readState(), { version: 1, items: [], deleted: [] })
    await fs.mkdir(path.dirname(stateFile()), { recursive: true })
    await fs.writeFile(stateFile(), '{bad json', 'utf8')
    assert.deepEqual(await readState(), { version: 1, items: [], deleted: [] })
  })
})

test('parseSessionIds validates and deduplicates', () => {
  assert.deepEqual(parseSessionIds(['a', 'b', 'a']), ['a', 'b'])
  assert.equal(parseSessionIds('nope'), null)
  assert.equal(parseSessionIds(['']), null)
  assert.equal(parseSessionIds([1]), null)
})

test('purgeSessions removes trash index, local files, DSH metadata and records a permanent tombstone', async () => {
  await withTempHome(async () => {
    const sessionId = 'session-purge-me'
    const workspaceId = 'workspace-1'
    const sessionRoot = path.join(process.env.DSH_HOME, 'sessions', 'project', sessionId)
    await fs.mkdir(sessionRoot, { recursive: true })
    await fs.writeFile(path.join(sessionRoot, 'session.jsonl.zstd'), 'stub', 'utf8')

    const state = {
      version: 1,
      items: [
        { sessionId, trashedAt: '2026-01-01T00:00:00.000Z' },
        { sessionId: 'session-keep', trashedAt: '2026-01-01T00:00:00.000Z' },
      ],
      deleted: [],
    }
    await writeState(state)

    const workspaceRecord = {
      path: '/tmp/project',
      title: 'project',
      sessionIds: [sessionId, 'session-keep'],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const workspaceTable = new Map([[workspaceId, { ...workspaceRecord }]])
    const globalValue = {
      initialized: true,
      workspaceIds: [workspaceId],
      archivedSessionIds: [sessionId, 'session-keep'],
    }
    let setStateCalled = false

    const ctx = {
      sessionPersistence: {
        async listSnapshots() {
          return [{ header: { id: sessionId, cwd: '/tmp/project' } }]
        },
        locate(header) {
          assert.equal(header.id, sessionId)
          return { kind: 'jsonl', path: path.join(sessionRoot, 'session.jsonl.zstd') }
        },
      },
      storageDomain: {
        get(name) {
          if (name === 'workspace') {
            return {
              global: {
                get: () => globalValue,
              },
              table(name) {
                assert.equal(name, 'workspaces')
                return {
                  entries() {
                    return workspaceTable.entries()
                  },
                  async put(key, record) {
                    workspaceTable.set(key, record)
                  },
                }
              },
            }
          }
          if (name === 'session_projcache') {
            return {
              table(name) {
                assert.equal(name, 'sessions')
                return {
                  async delete(id) {
                    assert.equal(id, sessionId)
                  },
                }
              },
            }
          }
          return undefined
        },
      },
      workspaceRegistry: {
        async enqueueOperation(fn) {
          return fn()
        },
        async setState(next) {
          setStateCalled = true
          Object.assign(globalValue, next)
        },
      },
    }

    const result = await purgeSessions(ctx, [sessionId])
    assert.equal(result.error, undefined)
    assert.deepEqual(result.purged, [sessionId])
    assert.deepEqual(result.items.map((item) => item.sessionId), ['session-keep'])
    assert.deepEqual(result.deleted.map((item) => item.sessionId), [sessionId])

    // Local file directory removed.
    await assert.rejects(fs.stat(sessionRoot), { code: 'ENOENT' })

    // Workspace membership and archived set are cleaned.
    assert.deepEqual(workspaceTable.get(workspaceId).sessionIds, ['session-keep'])
    assert.equal(setStateCalled, true)
    assert.deepEqual(globalValue.archivedSessionIds, ['session-keep'])

    // State file no longer contains purged id in trash, but keeps a tombstone.
    const persisted = await readState()
    assert.deepEqual(persisted.items.map((item) => item.sessionId), ['session-keep'])
    assert.deepEqual(persisted.deleted.map((item) => item.sessionId), [sessionId])
  })
})

test('mutex serializes concurrent state mutations', async () => {
  const enqueue = createMutex()
  const order = []
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  await Promise.all([
    enqueue(async () => {
      order.push('a-start')
      await delay(10)
      order.push('a-end')
    }),
    enqueue(async () => {
      order.push('b')
    }),
  ])
  assert.deepEqual(order, ['a-start', 'a-end', 'b'])
})

test('unarchiveSessions removes ids from the archived set', async () => {
  await withTempHome(async () => {
    const globalValue = {
      initialized: true,
      workspaceIds: ['workspace-1'],
      archivedSessionIds: ['session-a', 'session-b', 'session-c'],
    }
    let setStateCalled = false
    const ctx = {
      storageDomain: {
        get(name) {
          assert.equal(name, 'workspace')
          return {
            global: {
              get: () => globalValue,
            },
          }
        },
      },
      workspaceRegistry: {
        async enqueueOperation(fn) {
          return fn()
        },
        async setState(next) {
          setStateCalled = true
          Object.assign(globalValue, next)
        },
      },
    }

    const result = await unarchiveSessions(ctx, ['session-a', 'session-c'])
    assert.deepEqual(result.unarchived, ['session-a', 'session-c'])
    assert.deepEqual(result.archivedSessionIds, ['session-b'])
    assert.equal(setStateCalled, true)
    assert.deepEqual(globalValue.archivedSessionIds, ['session-b'])
  })
})

test('dshHome respects DSH_HOME', async () => {
  await withTempHome(async (dir) => {
    assert.equal(dshHome(), dir)
  })
})
