/**
 * Usine de handlers IPC générique pour les entités CRUD.
 * Chaque handler lit depuis SQLite (offline-first) et enqueue une mutation
 * pour la synchronisation ultérieure avec le serveur.
 */

import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { parse, PositiveInt } from './schemas'

type Params = Record<string, unknown>

// Column / key names must be safe SQL identifiers — prevents injection via dynamic WHERE clauses
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/i

function sanitizeKeys(obj: Record<string, unknown>, context: string): void {
  for (const key of Object.keys(obj)) {
    if (!SAFE_IDENTIFIER.test(key)) {
      throw new Error(`[IPC] ${context} — clé invalide: "${key}"`)
    }
  }
}

interface CrudSchemas {
  createSchema?: z.ZodTypeAny
  updateSchema?: z.ZodTypeAny
}

export function registerCrudIpc(
  channel: string,
  table: string,
  db: DatabaseService,
  _sync: SyncService,
  schemas: CrudSchemas = {},
): void {
  // LIST
  ipcMain.handle(`${channel}:list`, (_event, params: Params = {}) => {
    sanitizeKeys(params, `${channel}:list`)

    let sql    = `SELECT * FROM ${table} WHERE deleted_at IS NULL`
    const args: unknown[] = []

    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && key !== 'per_page' && key !== 'page') {
        sql += ` AND ${key} = ?`
        args.push(val)
      }
    }

    sql += ` ORDER BY updated_at DESC`

    const perPage = Math.min(Number(params['per_page'] ?? 100), 500)
    const page    = Math.max(Number(params['page'] ?? 1), 1)
    const offset  = (page - 1) * perPage

    sql += ` LIMIT ? OFFSET ?`
    args.push(perPage, offset)

    const data  = db.all(sql, args)
    const total = (db.get<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} WHERE deleted_at IS NULL`)?.count ?? 0)

    return { data, total, per_page: perPage, current_page: page }
  })

  // GET
  ipcMain.handle(`${channel}:get`, (_event, id: number) => {
    parse(PositiveInt, id, `${channel}:get id`)
    return db.get(`SELECT * FROM ${table} WHERE id = ? AND deleted_at IS NULL`, [id])
  })

  // CREATE
  ipcMain.handle(`${channel}:create`, (_event, data: Params) => {
    if (schemas.createSchema) {
      parse(schemas.createSchema, data, `${channel}:create`)
    } else {
      sanitizeKeys(data, `${channel}:create`)
    }

    const now     = new Date().toISOString()
    const columns = ['created_at', 'updated_at', 'sync_status', 'local_uuid', ...Object.keys(data)]
    const values  = [now, now, 'pending', uuidv4(), ...Object.values(data)]
    const placeholders = columns.map(() => '?').join(', ')

    const result = db.run(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    )

    const id = result.lastInsertRowid as number

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table,
      operation:      'create',
      localId:        id,
      data:           { ...data, created_at: now, updated_at: now },
    })

    return db.get(`SELECT * FROM ${table} WHERE id = ?`, [id])
  })

  // UPDATE
  ipcMain.handle(`${channel}:update`, (_event, id: number, data: Params) => {
    parse(PositiveInt, id, `${channel}:update id`)

    if (schemas.updateSchema) {
      parse(schemas.updateSchema, data, `${channel}:update`)
    } else {
      sanitizeKeys(data, `${channel}:update`)
    }

    const now  = new Date().toISOString()
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ')

    db.run(
      `UPDATE ${table} SET ${sets}, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [...Object.values(data), now, id]
    )

    const record = db.get<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id])

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table,
      operation:      'update',
      localId:        id,
      data:           { ...data, server_id: record?.['server_id'], updated_at: now },
    })

    return record
  })

  // DELETE
  ipcMain.handle(`${channel}:delete`, (_event, id: number) => {
    parse(PositiveInt, id, `${channel}:delete id`)

    const record = db.get<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id = ?`, [id])

    if (!record) return { success: false, message: 'Introuvable.' }

    const now = new Date().toISOString()

    db.run(
      `UPDATE ${table} SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ?`,
      [now, id]
    )

    db.enqueueMutation({
      idempotencyKey: uuidv4(),
      table,
      operation:      'delete',
      localId:        id,
      data:           { server_id: record['server_id'] },
    })

    return { success: true }
  })
}
