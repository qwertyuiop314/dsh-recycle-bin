/**
 * dsh-recycle-bin — host half.
 *
 * Provides HTTP routes used by the recycle-bin browser UI:
 *   GET  /dsh-recycle-bin/list
 *   POST /dsh-recycle-bin/trash
 *   POST /dsh-recycle-bin/restore
 *   POST /dsh-recycle-bin/purge
 *
 * The plugin stores only a small trash index under
 *   <DSH_HOME or ~/.dsh>/cache/dsh-recycle-bin/state.json
 * It does not modify DSH core or existing plugins. Moving to trash is a
 * logical operation: the archived-session registry entry is left untouched,
 * so restore is exact and local files are never changed by trash/restore.
 * Permanent purge removes the session directory on disk and cleans the workspace /
 * projection-cache metadata after the user confirms.
 */
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

export const name = 'dsh-recycle-bin'
export const inject = ['webServer', 'storageDomain', 'workspaceRegistry']

const ROUTE_PREFIX = '/dsh-recycle-bin'
const STATE_VERSION = 1

function dshHome() {
  return process.env.DSH_HOME && process.env.DSH_HOME.trim() !== ''
    ? path.resolve(process.env.DSH_HOME)
    : path.join(homedir(), '.dsh')
}

function stateDir() {
  return path.join(dshHome(), 'cache', 'dsh-recycle-bin')
}

function stateFile() {
  return path.join(stateDir(), 'state.json')
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

function defaultState() {
  return { version: STATE_VERSION, items: [], deleted: [] }
}

async function readState() {
  try {
    const raw = await fs.readFile(stateFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && Array.isArray(parsed.items)) {
      return {
        version: STATE_VERSION,
        items: parsed.items,
        deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
      }
    }
    return defaultState()
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn(`[dsh-recycle-bin] cannot read state, using empty: ${messageOf(error)}`)
    }
    return defaultState()
  }
}

async function writeState(state) {
  const dir = stateDir()
  await fs.mkdir(dir, { recursive: true })
  const finalPath = stateFile()
  const tmpPath = path.join(dir, `state.json.${process.pid}.${Date.now()}.tmp`)
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8')
  try {
    await fs.rename(tmpPath, finalPath)
  } catch (error) {
    // Windows rename does not always replace an existing destination.
    try {
      await fs.rm(finalPath, { force: true })
      await fs.rename(tmpPath, finalPath)
    } catch (secondError) {
      await fs.rm(tmpPath, { force: true }).catch(() => {})
      throw secondError
    }
  }
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const text = await readBody(req)
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('invalid-json')
    error.status = 400
    throw error
  }
}

function parseSessionIds(value) {
  if (!Array.isArray(value)) return null
  if (value.some((id) => typeof id !== 'string' || id.trim() === '')) return null
  return [...new Set(value)]
}

/** Serialize state-file mutations so concurrent UI actions cannot interleave. */
function createMutex() {
  let tail = Promise.resolve()
  return function enqueue(job) {
    const run = tail.then(job, job)
    tail = run.then(() => {}, () => {})
    return run
  }
}

/**
 * Escape one path segment the way the JSONL session backend does, so a session
 * id can be compared with the directory name it owns on disk. Safe code units
 * stay literal; every other unit becomes `~XXXX` (DSH's
 * `session-persistence-jsonl` `encodeSegment`). Session ids are normally
 * `session-<uuid>` and therefore unchanged, but this keeps the lookup correct
 * for any id.
 *
 * @param raw - the string to encode.
 * @returns the escaped single path segment.
 */
function encodeSegment(raw) {
  if (raw === '.') return '~002E'
  if (raw === '..') return '~002E~002E'
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i)
    const ch = String.fromCharCode(code)
    if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) out += ch
    else out += '~' + code.toString(16).toUpperCase().padStart(4, '0')
  }
  return out
}

/**
 * Locate the on-disk directory of a materialized session.
 *
 * DSH keeps one directory per session below `<DSH_HOME>/sessions`, grouped by
 * project:
 *   - DSH 0.1.5+ writes `sessions/--<project-slug>--/<encoded-session-id>/`.
 *   - Older releases wrote `sessions/<project-slug>/<session-id>/`.
 *   - A session whose header carries no `cwd` lives under `_no-cwd/`.
 * The directory holds the session log (`session.vN.jsonl[.zstd]`) and, on
 * POSIX, a `session.lock`. Sessions that were created but never materialized
 * have no directory at all.
 *
 * @param home - resolved DSH home directory.
 * @param id - session id (`session-<uuid>`); matched literally and encoded.
 * @returns the session directory, or `undefined` when it does not exist.
 */
async function findSessionDir(home, id) {
  const root = path.join(home, 'sessions')
  let entries = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (error) {
    if (error && error.code === 'ENOENT') return undefined
    throw error
  }
  const names = id === encodeSegment(id) ? [id] : [id, encodeSegment(id)]
  const isDirectory = async (target) => {
    try {
      return (await fs.stat(target)).isDirectory()
    } catch (error) {
      if (error && error.code === 'ENOENT') return false
      throw error
    }
  }
  // Legacy flat layout (<root>/<id>) kept for pre-0.1.5 homes.
  for (const name of names) {
    const flat = path.join(root, name)
    if (await isDirectory(flat)) return flat
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    for (const name of names) {
      const candidate = path.join(root, entry.name, name)
      if (await isDirectory(candidate)) return candidate
    }
  }
  return undefined
}

async function purgeSessions(ctx, sessionIds) {
  const state = await readState()
  const trashIds = new Set(state.items.map((item) => item.sessionId))
  const toPurge = sessionIds.filter((id) => trashIds.has(id))
  if (toPurge.length === 0) return { purged: [], items: state.items }

  // 1. Delete local session artifacts first. This is the destructive part and
  //    must happen before metadata is changed. DSH 0.1.5 replaced the old
  //    `sessionPersistence.listSnapshots()` / `.locate()` pair: the service is
  //    append-only and no longer exposes artifact paths, so the plugin locates
  //    `sessions/<workspace-slug>/<session-id>/` on disk itself.
  const failures = []
  const missing = []
  for (const id of toPurge) {
    try {
      const sessionDir = await findSessionDir(dshHome(), id)
      if (sessionDir === undefined) {
        missing.push(id)
        continue
      }
      await fs.rm(sessionDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    } catch (error) {
      failures.push({ id, error: messageOf(error) })
    }
  }
  if (missing.length > 0) {
    console.warn(`[dsh-recycle-bin] no local artifacts on disk for: ${missing.join(', ')}`)
  }
  if (failures.length > 0) {
    return { error: 'purge-failed', failures, items: state.items }
  }

  // 2. Clean DSH metadata so the conversation disappears from the normal
  //    sidebar as well. The plugin also keeps a tombstone in its own state so
  //    the archive/trash lists never show it again, even if a UI refresh races.
  const metadataError = await removeSessionMetadata(ctx, toPurge)
  if (metadataError !== undefined) {
    return { error: 'metadata-cleanup-failed', message: metadataError, items: state.items }
  }

  // 3. Remove from trash index and record a permanent tombstone.
  const nextItems = state.items.filter((item) => !toPurge.includes(item.sessionId))
  const now = new Date().toISOString()
  const nextDeleted = [
    ...(state.deleted || []),
    ...toPurge.map((sessionId) => ({ sessionId, deletedAt: now })),
  ]
  state.items = nextItems
  state.deleted = nextDeleted
  await writeState(state)
  return { purged: toPurge, items: nextItems, deleted: nextDeleted }
}

/**
 * Remove sessions from every DSH-side record that could still surface them:
 * the registry-global archive set, the global pin set, each workspace's session
 * account, and the projection cache.
 *
 * DSH 0.1.7 moved archive/pin bookkeeping onto the Workspace registry and
 * exposes purpose-built mutators (`unarchiveSession`, `unpinSession`, and
 * `Workspace.detachSession`). All three are idempotent, run no session-existence
 * probe, and are serialized on the registry's own write chain, so they replace
 * both the old `enqueueOperation`/`setState` pair and the direct workspace-table
 * rewrite. Older releases only exposed the domain state itself, so that path is
 * kept as a fallback.
 *
 * @param ctx - plugin context (`storageDomain` and/or `workspaceRegistry`).
 * @param sessionIds - sessions being purged.
 * @returns the failure message, or `undefined` when cleanup succeeded.
 */
async function removeSessionMetadata(ctx, sessionIds) {
  const registry = ctx.workspaceRegistry
  try {
    if (registry && typeof registry.unarchiveSession === 'function') {
      for (const id of sessionIds) {
        await registry.unarchiveSession(id)
        if (typeof registry.unpinSession === 'function') await registry.unpinSession(id)
      }
      if (typeof registry.list === 'function') {
        for (const workspace of registry.list()) {
          if (typeof workspace?.detachSession !== 'function') continue
          const owned = workspace.sessionIds || []
          for (const id of sessionIds) {
            if (owned.includes(id)) await workspace.detachSession(id)
          }
        }
      }
    } else {
      const workspaceDomain = ctx.storageDomain.get('workspace')
      if (workspaceDomain) {
        if (workspaceDomain.global) {
          const current = workspaceDomain.global.get()
          const nextArchived = current.archivedSessionIds.filter((id) => !sessionIds.includes(id))
          if (nextArchived.length !== current.archivedSessionIds.length) {
            await registry.enqueueOperation(() =>
              registry.setState({ ...current, archivedSessionIds: nextArchived })
            )
          }
        }
        const table = workspaceDomain.table('workspaces')
        if (table) {
          for (const [workspaceId, record] of table.entries()) {
            if (record.sessionIds.some((id) => sessionIds.includes(id))) {
              await table.put(workspaceId, {
                ...record,
                sessionIds: record.sessionIds.filter((id) => !sessionIds.includes(id)),
                updatedAt: new Date().toISOString(),
              })
            }
          }
        }
      }
    }

    // The projection cache is a derived store in every release; dropping the
    // row keeps a purged session from reappearing through a cached listing.
    const cacheDomain = ctx.storageDomain.get('session_projcache')
    if (cacheDomain) {
      const cacheTable = cacheDomain.table('sessions')
      if (cacheTable) {
        for (const id of sessionIds) {
          await cacheTable.delete(id)
        }
      }
    }
    return undefined
  } catch (error) {
    return messageOf(error)
  }
}

async function unarchiveSessions(ctx, sessionIds) {
  const registry = ctx.workspaceRegistry
  // DSH 0.1.7+ owns the archive set on the registry and serializes its writes.
  if (registry && typeof registry.unarchiveSession === 'function') {
    const before = new Set(registry.archivedSessionIds || [])
    const unarchived = []
    for (const id of sessionIds) {
      await registry.unarchiveSession(id)
      if (before.has(id)) unarchived.push(id)
    }
    return { unarchived, archivedSessionIds: [...(registry.archivedSessionIds || [])] }
  }
  const workspaceDomain = ctx.storageDomain.get('workspace')
  if (!workspaceDomain || !workspaceDomain.global) {
    throw new Error('workspace domain unavailable')
  }
  const current = workspaceDomain.global.get()
  const remove = new Set(sessionIds)
  const nextArchived = current.archivedSessionIds.filter((id) => !remove.has(id))
  if (nextArchived.length === current.archivedSessionIds.length) {
    return { unarchived: [], archivedSessionIds: current.archivedSessionIds }
  }
  await registry.enqueueOperation(() =>
    registry.setState({ ...current, archivedSessionIds: nextArchived })
  )
  return { unarchived: sessionIds, archivedSessionIds: nextArchived }
}

export function apply(ctx) {
  const enqueue = createMutex()
  const webServer = ctx.webServer ?? ctx.get('webServer') ?? ctx.get('httpServer')
  if (!webServer) {
    console.warn('[dsh-recycle-bin] webServer service is unavailable; routes disabled')
    return
  }

  ctx.effect(() => webServer.register({
    kind: 'prefix',
    path: ROUTE_PREFIX,
    handler: async (req, res) => {
      try {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const pathname = url.pathname

        if (req.method === 'GET' || req.method === 'HEAD') {
          if (pathname === `${ROUTE_PREFIX}/list` || pathname === `${ROUTE_PREFIX}/state`) {
            const state = await readState()
            return json(res, 200, { items: state.items, deleted: state.deleted || [] })
          }
          return json(res, 404, { error: 'not-found' })
        }

        if (req.method !== 'POST') {
          return json(res, 405, { error: 'method-not-allowed' })
        }

        if (pathname === `${ROUTE_PREFIX}/trash`) {
          const body = await readJson(req)
          const sessionIds = parseSessionIds(body.sessionIds)
          if (!sessionIds) return json(res, 400, { error: 'invalid-session-ids' })
          const archived = new Set(ctx.workspaceRegistry.archivedSessionIds || [])
          const notArchived = sessionIds.filter((id) => !archived.has(id))
          if (notArchived.length > 0) {
            return json(res, 400, { error: 'not-archived', sessionIds: notArchived })
          }
          return await enqueue(async () => {
            const state = await readState()
            const existing = new Set(state.items.map((item) => item.sessionId))
            const now = new Date().toISOString()
            const added = sessionIds
              .filter((id) => !existing.has(id))
              .map((sessionId) => ({ sessionId, trashedAt: now }))
            if (added.length > 0) {
              state.items.push(...added)
              await writeState(state)
            }
            return json(res, 200, { items: state.items, deleted: state.deleted || [], added: added.map((item) => item.sessionId) })
          })
        }

        if (pathname === `${ROUTE_PREFIX}/unarchive`) {
          const body = await readJson(req)
          const sessionIds = parseSessionIds(body.sessionIds)
          if (!sessionIds) return json(res, 400, { error: 'invalid-session-ids' })
          return await enqueue(async () => {
            const result = await unarchiveSessions(ctx, sessionIds)
            return json(res, 200, result)
          })
        }

        if (pathname === `${ROUTE_PREFIX}/restore`) {
          const body = await readJson(req)
          const sessionIds = parseSessionIds(body.sessionIds)
          if (!sessionIds) return json(res, 400, { error: 'invalid-session-ids' })
          return await enqueue(async () => {
            const state = await readState()
            const remove = new Set(sessionIds)
            const nextItems = state.items.filter((item) => !remove.has(item.sessionId))
            if (nextItems.length !== state.items.length) {
              state.items = nextItems
              await writeState(state)
            }
            return json(res, 200, { items: nextItems, deleted: state.deleted || [], restored: sessionIds })
          })
        }

        if (pathname === `${ROUTE_PREFIX}/purge`) {
          const body = await readJson(req)
          const sessionIds = parseSessionIds(body.sessionIds)
          if (!sessionIds) return json(res, 400, { error: 'invalid-session-ids' })
          return await enqueue(async () => {
            const result = await purgeSessions(ctx, sessionIds)
            if (result.error) {
              return json(res, 500, result)
            }
            return json(res, 200, result)
          })
        }

        return json(res, 404, { error: 'not-found' })
      } catch (error) {
        const status = error && error.status ? error.status : 500
        return json(res, status, { error: messageOf(error) })
      }
    },
  }), 'dsh-recycle-bin: routes')
}

// Exported for automated tests and offline tooling.
export {
  createMutex,
  dshHome,
  encodeSegment,
  findSessionDir,
  parseSessionIds,
  purgeSessions,
  readState,
  removeSessionMetadata,
  stateFile,
  unarchiveSessions,
  writeState,
}

