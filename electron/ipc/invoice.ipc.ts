import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { DatabaseService } from '../services/database.service'
import { SyncService } from '../services/sync.service'
import { registerCrudIpc } from './base.ipc'

const INVOICE_WITH_CLIENT = `
  SELECT i.*, c.name AS client_name
  FROM invoices i
  LEFT JOIN clients c ON c.id = i.client_id
`

export function registerInvoiceIpc(db: DatabaseService, sync: SyncService): void {
  // LIST avec client_name
  ipcMain.handle('invoices:list', (_event, params: Record<string, unknown> = {}) => {
    const perPage = Math.min(Number(params['per_page'] ?? 100), 500)
    const page    = Math.max(Number(params['page'] ?? 1), 1)
    const offset  = (page - 1) * perPage
    const args: unknown[] = []
    let where = 'WHERE i.deleted_at IS NULL'
    if (params['status']) { where += ' AND i.status = ?'; args.push(params['status']) }

    const data  = db.all(`${INVOICE_WITH_CLIENT} ${where} ORDER BY i.date DESC LIMIT ? OFFSET ?`, [...args, perPage, offset])
    const total = db.get<{ count: number }>(`SELECT COUNT(*) as count FROM invoices i ${where}`, args)?.count ?? 0
    return { data, total, per_page: perPage, current_page: page }
  })

  ipcMain.handle('invoices:get', (_event, id: number) => {
    return db.get(`${INVOICE_WITH_CLIENT} WHERE i.id = ? AND i.deleted_at IS NULL`, [id])
  })

  // Items d'une facture avec les infos article_item + article
  ipcMain.handle('invoices:items', (_event, invoiceId: number) => {
    return db.all(`
      SELECT
        ii.*,
        ai.numero_colis, ai.longueur, ai.epaisseur, ai.largeur,
        ai.nombre_piece, ai.volume,
        a.essence, a.contract_number
      FROM invoice_items ii
      LEFT JOIN article_items ai ON ai.id = ii.article_item_id
      LEFT JOIN articles     a  ON a.id  = ai.article_id
      WHERE ii.invoice_id = ? AND ii.deleted_at IS NULL
      ORDER BY ai.longueur ASC, ai.epaisseur ASC
    `, [invoiceId])
  })

  ipcMain.handle('invoices:update', (_event, id: number, data: Record<string, unknown>) => {
    const now  = new Date().toISOString()
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(', ')
    db.run(`UPDATE invoices SET ${sets}, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [...Object.values(data), now, id])
    const record = db.get<Record<string, unknown>>(`SELECT * FROM invoices WHERE id = ?`, [id])
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'invoices', operation: 'update', localId: id, data: { ...data, server_id: record?.['server_id'], updated_at: now } })
    return db.get(`${INVOICE_WITH_CLIENT} WHERE i.id = ?`, [id])
  })

  ipcMain.handle('invoices:delete', (_event, id: number) => {
    const record = db.get<Record<string, unknown>>(`SELECT * FROM invoices WHERE id = ?`, [id])
    if (!record) return { success: false }
    const now = new Date().toISOString()
    db.run(`UPDATE invoices SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ?`, [now, id])
    db.enqueueMutation({ idempotencyKey: uuidv4(), table: 'invoices', operation: 'delete', localId: id, data: { server_id: record['server_id'] } })
    return { success: true }
  })

  // CREATE avec items en transaction
  ipcMain.handle('invoices:create', (_event, data: {
    client_id: number
    date: string
    status?: string
    items: Array<{ article_item_id?: number; article_id?: number; price: number; total_price_item: number; volume_vendu?: number; nombre_de_colis_vendu?: number }>
  }) => {
    return db.transaction(() => {
      const now     = new Date().toISOString()
      const localUuid = uuidv4()

      // Créer la facture
      const invoiceResult = db.run(
        `INSERT INTO invoices (client_id, date, status, total_price, montant_solde, sync_status, local_uuid, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, 'pending', ?, ?, ?)`,
        [data.client_id, data.date, data.status ?? 'pending', localUuid, now, now]
      )
      const invoiceId = invoiceResult.lastInsertRowid as number

      let totalPrice = 0

      // Créer les items
      for (const item of data.items) {
        db.run(
          `INSERT INTO invoice_items (invoice_id, article_item_id, article_id, price, total_price_item, volume_vendu, nombre_de_colis_vendu, sync_status, local_uuid, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
          [invoiceId, item.article_item_id ?? null, item.article_id ?? null, item.price, item.total_price_item, item.volume_vendu ?? null, item.nombre_de_colis_vendu ?? null, uuidv4(), now, now]
        )
        totalPrice += item.total_price_item
      }

      // Mettre à jour le total
      db.run(`UPDATE invoices SET total_price = ? WHERE id = ?`, [totalPrice, invoiceId])

      // Enqueue la mutation complète
      db.enqueueMutation({
        idempotencyKey: uuidv4(),
        table:          'invoices',
        operation:      'create',
        localId:        invoiceId,
        data: {
          client_id: data.client_id,
          date:      data.date,
          status:    data.status ?? 'pending',
          items:     data.items,
          created_at: now,
          updated_at: now,
        },
      })

      return db.get(
        `SELECT i.*, c.name as client_name FROM invoices i
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.id = ?`,
        [invoiceId]
      )
    })
  })

  // Mettre à jour le prix d'un item de facture
  ipcMain.handle('invoices:update-item', (_event, invoiceId: number, itemId: number, data: { price: number }) => {
    const now  = new Date().toISOString()
    const item = db.get<{ volume_vendu: number }>(`SELECT * FROM invoice_items WHERE id = ? AND invoice_id = ? AND deleted_at IS NULL`, [itemId, invoiceId])
    if (!item) throw new Error('Item introuvable')
    const total_price_item = Math.round((item.volume_vendu ?? 0) * data.price)
    db.run(
      `UPDATE invoice_items SET price = ?, total_price_item = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`,
      [data.price, total_price_item, now, itemId]
    )
    const agg = db.get<{ total: number }>(`SELECT SUM(total_price_item) as total FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL`, [invoiceId])
    db.run(`UPDATE invoices SET total_price = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [agg?.total ?? 0, now, invoiceId])
    return { success: true, total_price_item }
  })

  // Supprimer un item de facture
  ipcMain.handle('invoices:remove-item', (_event, invoiceId: number, itemId: number) => {
    const now = new Date().toISOString()
    db.run(`UPDATE invoice_items SET deleted_at = ?, sync_status = 'deleted_pending' WHERE id = ? AND invoice_id = ?`, [now, itemId, invoiceId])
    const agg = db.get<{ total: number }>(`SELECT SUM(total_price_item) as total FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL`, [invoiceId])
    db.run(`UPDATE invoices SET total_price = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [agg?.total ?? 0, now, invoiceId])
    return { success: true }
  })

  // Ajouter un article_item à une facture existante
  ipcMain.handle('invoices:add-item', (_event, invoiceId: number, data: {
    article_item_id: number
    article_id: number
    price: number
    volume: number
  }) => {
    const now = new Date().toISOString()
    const total_price_item = Math.round(data.volume * data.price)
    const result = db.run(
      `INSERT INTO invoice_items (invoice_id, article_item_id, article_id, price, total_price_item, volume_vendu, nombre_de_colis_vendu, sync_status, local_uuid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'pending', ?, ?, ?)`,
      [invoiceId, data.article_item_id, data.article_id, data.price, total_price_item, data.volume, uuidv4(), now, now]
    )
    const agg = db.get<{ total: number }>(`SELECT SUM(total_price_item) as total FROM invoice_items WHERE invoice_id = ? AND deleted_at IS NULL`, [invoiceId])
    db.run(`UPDATE invoices SET total_price = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?`, [agg?.total ?? 0, now, invoiceId])
    return { success: true, id: result.lastInsertRowid }
  })
}
