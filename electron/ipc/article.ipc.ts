import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'
import {
  parse, PositiveInt,
  ArticleCreateSchema, ArticleUpdateSchema,
  ArticleItemCreateSchema, ArticleItemUpdateSchema,
} from './schemas'

export function registerArticleIpc(db: DatabaseService, sync: SyncService): void {
  // LIST avec JOIN supplier
  ipcMain.handle('articles:list', (_event, params: Record<string, unknown> = {}) => {
    const perPage = Math.min(Number(params['per_page'] ?? 100), 500)
    const page    = Math.max(Number(params['page'] ?? 1), 1)
    const offset  = (page - 1) * perPage

    const data = db.all(`
      SELECT a.*, s.name AS supplier_name
      FROM articles a
      LEFT JOIN suppliers s ON s.id = a.supplier_id
      WHERE a.deleted_at IS NULL
      ORDER BY a.updated_at DESC
      LIMIT ? OFFSET ?
    `, [perPage, offset])

    const total = db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM articles WHERE deleted_at IS NULL`
    )?.count ?? 0

    return { data, total, per_page: perPage, current_page: page }
  })

  ipcMain.handle('articles:get', (_event, id: number) => {
    parse(PositiveInt, id, 'articles:get id')
    return db.get(`
      SELECT a.*, s.name AS supplier_name
      FROM articles a
      LEFT JOIN suppliers s ON s.id = a.supplier_id
      WHERE a.id = ? AND a.deleted_at IS NULL
    `, [id])
  })

  ipcMain.handle('articles:create', (_event, data: Record<string, unknown>) => {
    const validated = parse(ArticleCreateSchema, data, 'articles:create')
    const now = new Date().toISOString()
    const cols = ['created_at', 'updated_at', 'sync_status', 'local_uuid', ...Object.keys(validated)]
    const vals = [now, now, 'pending', uuidv4(), ...Object.values(validated)]
    const result = db.run(
      `INSERT INTO articles (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      vals
    )
    const id = result.lastInsertRowid as number
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'articles', operation: 'create', localId: id, data: { ...validated, created_at: now, updated_at: now } })
    return db.get(`SELECT a.*, s.name AS supplier_name FROM articles a LEFT JOIN suppliers s ON s.id = a.supplier_id WHERE a.id = ?`, [id])
  })

  ipcMain.handle('articles:update', (_event, id: number, data: Record<string, unknown>) => {
    parse(PositiveInt, id, 'articles:update id')
    const validated = parse(ArticleUpdateSchema, data, 'articles:update')
    const now  = new Date().toISOString()
    const sets = Object.keys(validated).map((k) => `${k} = ?`).join(', ')
    db.run(`UPDATE articles SET ${sets}, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [...Object.values(validated), now, id])
    const record = db.get<Record<string, unknown>>(`SELECT * FROM articles WHERE id = ?`, [id])
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'articles', operation: 'update', localId: id, data: { ...validated, server_id: record?.['server_id'], updated_at: now } })
    return db.get(`SELECT a.*, s.name AS supplier_name FROM articles a LEFT JOIN suppliers s ON s.id = a.supplier_id WHERE a.id = ?`, [id])
  })

  ipcMain.handle('articles:delete', (_event, id: number) => {
    parse(PositiveInt, id, 'articles:delete id')
    const record = db.get<Record<string, unknown>>(`SELECT * FROM articles WHERE id = ?`, [id])
    if (!record) return { success: false }
    const now = new Date().toISOString()
    db.run(`UPDATE articles SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ?`, [now, id])
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'articles', operation: 'delete', localId: id, data: { server_id: record['server_id'] } })
    return { success: true }
  })

  ipcMain.handle('articles:items', (_event, articleId: number) => {
    parse(PositiveInt, articleId, 'articles:items articleId')
    return db.all(
      `SELECT * FROM article_items WHERE article_id = ? AND deleted_at IS NULL ORDER BY numero_colis`,
      [articleId]
    )
  })

  registerCrudIpc('article-items', 'article_items', db, sync, {
    createSchema: ArticleItemCreateSchema,
    updateSchema: ArticleItemUpdateSchema,
  })
}
