import { ipcMain } from 'electron'
import { DatabaseService } from '../services/database.service'

interface CaFilters {
  client_id?:       number | string
  essence?:         string
  epaisseur?:       number | string
  fournisseur_id?:  number | string
  contract_number?: string
}

export function registerDashboardIpc(db: DatabaseService): void {

  // ── Stats générales ────────────────────────────────────────
  ipcMain.handle('dashboard:stats-general', () => {
    const chiffreAffaires = (db.get<{ total: number }>(
      `SELECT COALESCE(SUM(total_price), 0) AS total
       FROM invoices
       WHERE status != 'canceled' AND deleted_at IS NULL`,
    )?.total ?? 0)

    const chiffreAffaireOld = (db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type = 'invoice'
         AND (old_transaction = '1' OR old_transaction = 1)
         AND deleted_at IS NULL`,
    )?.total ?? 0)

    const montantPaye = (db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type = 'payment' AND deleted_at IS NULL`,
    )?.total ?? 0)

    const stockDisponible = (db.get<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM article_items
       WHERE indisponible = 0 AND deleted_at IS NULL`,
    )?.count ?? 0)

    const entrees = (db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM caisse_transactions
       WHERE type = 'entree' AND deleted_at IS NULL`,
    )?.total ?? 0)

    const sorties = (db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM caisse_transactions
       WHERE type = 'sortie' AND deleted_at IS NULL`,
    )?.total ?? 0)

    const montantTotal = chiffreAffaires + chiffreAffaireOld

    return {
      chiffre_affaires:    chiffreAffaires,
      chiffre_affaire_old: chiffreAffaireOld,
      montant_paye:        montantPaye,
      montant_du:          montantTotal - montantPaye,
      stock_disponible:    stockDisponible,
      soldeCaisse:         entrees - sorties,
    }
  })

  // ── CA & Bénéfice par mois ────────────────────────────────
  ipcMain.handle('dashboard:ca-benefice', (_event, filters: CaFilters = {}) => {
    const args: unknown[] = []
    const conditions: string[] = [
      `ii.deleted_at IS NULL`,
      `inv.deleted_at IS NULL`,
      `inv.status != 'canceled'`,
    ]

    if (filters.client_id) {
      conditions.push(`inv.client_id = ?`)
      args.push(Number(filters.client_id))
    }
    if (filters.essence) {
      conditions.push(`a.essence = ?`)
      args.push(filters.essence)
    }
    if (filters.epaisseur) {
      conditions.push(`ai.epaisseur = ?`)
      args.push(Number(filters.epaisseur))
    }
    if (filters.fournisseur_id) {
      conditions.push(`a.supplier_id = ?`)
      args.push(Number(filters.fournisseur_id))
    }
    if (filters.contract_number) {
      conditions.push(`a.contract_number LIKE ?`)
      args.push(`%${filters.contract_number}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = db.all<{
      year: number
      month: number
      total_revenue: number
      cost_base: number
    }>(
      `SELECT
         CAST(strftime('%Y', inv.date) AS INTEGER) AS year,
         CAST(strftime('%m', inv.date) AS INTEGER) AS month,
         COALESCE(SUM(ii.total_price_item), 0)                     AS total_revenue,
         COALESCE(SUM(ai.volume * a.price_per_m3), 0)              AS cost_base
       FROM invoice_items ii
       JOIN article_items ai ON ai.id  = ii.article_item_id
       JOIN articles      a  ON a.id   = ai.article_id
       JOIN invoices      inv ON inv.id = ii.invoice_id
       ${where}
       GROUP BY strftime('%Y', inv.date), strftime('%m', inv.date)
       ORDER BY year ASC, month ASC`,
      args,
    )

    // Dépenses mensuelles
    const expenses = db.all<{ year: number; month: number; amount: number }>(
      `SELECT year, month, COALESCE(SUM(amount), 0) AS amount
       FROM monthly_expenses
       WHERE deleted_at IS NULL
       GROUP BY year, month`,
    )
    const expMap = new Map(expenses.map(e => [`${e.year}-${e.month}`, e.amount]))

    return rows.map(row => {
      const gross_profit   = row.total_revenue - row.cost_base
      const monthly_expense = expMap.get(`${row.year}-${row.month}`) ?? 0
      const net_profit     = gross_profit - monthly_expense
      return { ...row, gross_profit, monthly_expense, net_profit }
    })
  })

  // ── Évolution CA — 6 derniers mois ────────────────────────
  ipcMain.handle('dashboard:evolution-ca', (_event, filters: CaFilters = {}) => {
    const args: unknown[] = []
    const conditions: string[] = [
      `ii.deleted_at IS NULL`,
      `inv.deleted_at IS NULL`,
      `inv.status != 'canceled'`,
    ]

    if (filters.client_id) {
      conditions.push(`inv.client_id = ?`)
      args.push(Number(filters.client_id))
    }
    if (filters.essence) {
      conditions.push(`a.essence = ?`)
      args.push(filters.essence)
    }
    if (filters.epaisseur) {
      conditions.push(`ai.epaisseur = ?`)
      args.push(Number(filters.epaisseur))
    }
    if (filters.fournisseur_id) {
      conditions.push(`a.supplier_id = ?`)
      args.push(Number(filters.fournisseur_id))
    }
    if (filters.contract_number) {
      conditions.push(`a.contract_number LIKE ?`)
      args.push(`%${filters.contract_number}%`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    return db.all<{ month: string; total_revenue: number }>(
      `SELECT
         strftime('%Y-%m', inv.date)              AS month,
         COALESCE(SUM(ii.total_price_item), 0)    AS total_revenue
       FROM invoice_items ii
       JOIN article_items ai  ON ai.id  = ii.article_item_id
       JOIN articles      a   ON a.id   = ai.article_id
       JOIN invoices      inv ON inv.id = ii.invoice_id
       ${where}
       GROUP BY strftime('%Y-%m', inv.date)
       ORDER BY month DESC
       LIMIT 6`,
      args,
    ).reverse()
  })

  // ── Dashboard Clients & Comptabilité ─────────────────────
  ipcMain.handle('dashboard:clients-stats', () => {
    // ── KPI globaux (identique au web : transactions table) ──
    const totalCA = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'invoice' AND deleted_at IS NULL`,
    )?.total ?? 0

    const totalPaye = db.get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'payment' AND deleted_at IS NULL`,
    )?.total ?? 0

    const totalDu = totalCA - totalPaye
    const tauxRecouvrement = totalCA > 0 ? Math.round((totalPaye / totalCA) * 1000) / 10 : 0

    const nbClients = db.get<{ count: number }>(
      `SELECT COUNT(*) AS count FROM clients WHERE deleted_at IS NULL`,
    )?.count ?? 0

    // ── Liste clients — LEFT JOIN depuis clients (comme le web) ──
    const clientsList = db.all<{
      id: number
      name: string
      total_ca: number
      total_paye: number
      montant_du: number
      nb_factures: number
      derniere_facture: string | null
    }>(
      `SELECT
         c.id,
         c.name,
         COALESCE(SUM(CASE WHEN t.type = 'invoice' THEN t.amount ELSE 0 END), 0)                   AS total_ca,
         COALESCE(SUM(CASE WHEN t.type = 'payment' THEN t.amount ELSE 0 END), 0)                   AS total_paye,
         COALESCE(SUM(CASE WHEN t.type = 'invoice' THEN t.amount ELSE COALESCE(-t.amount, 0) END), 0) AS montant_du,
         COUNT(DISTINCT CASE WHEN t.type = 'invoice' THEN t.invoice_id END)                        AS nb_factures,
         MAX(CASE WHEN t.type = 'invoice' THEN t.transaction_date END)                             AS derniere_facture
       FROM clients c
       LEFT JOIN transactions t ON t.client_id = c.id AND t.deleted_at IS NULL
       WHERE c.deleted_at IS NULL
       GROUP BY c.id, c.name
       ORDER BY total_ca DESC`,
    ).map(row => ({
      ...row,
      taux_recouvrement: row.total_ca > 0 ? Math.round((row.total_paye / row.total_ca) * 1000) / 10 : 100,
    }))

    const nbClientsAvecCreances = clientsList.filter(c => c.montant_du > 0).length

    // ── Évolution 6 mois (transactions, comme le web) ────────
    const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
    const now = new Date()
    const months: { period: string; month: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({ period, month: `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}` })
    }

    const evoRows = db.all<{ period: string; type: string; total: number }>(
      `SELECT strftime('%Y-%m', transaction_date) AS period,
              type,
              COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE deleted_at IS NULL
         AND type IN ('invoice', 'payment')
         AND transaction_date >= date('now', '-6 months', 'start of month')
       GROUP BY strftime('%Y-%m', transaction_date), type`,
    )

    const evoMap = new Map<string, { facture: number; paye: number }>()
    for (const row of evoRows) {
      const entry = evoMap.get(row.period) ?? { facture: 0, paye: 0 }
      if (row.type === 'invoice') entry.facture = row.total
      else entry.paye = row.total
      evoMap.set(row.period, entry)
    }

    const evolution = months.map(m => ({
      month: m.month,
      total_facture: evoMap.get(m.period)?.facture ?? 0,
      total_paye:    evoMap.get(m.period)?.paye    ?? 0,
    }))

    return {
      kpi: { nb_clients: nbClients, total_ca: totalCA, total_paye: totalPaye, total_du: totalDu, taux_recouvrement: tauxRecouvrement, nb_clients_avec_creances: nbClientsAvecCreances },
      evolution,
      clients: clientsList,
    }
  })

  // ── Top 5 clients ──────────────────────────────────────────
  ipcMain.handle('dashboard:top-clients', () => {
    return db.all<{ id: number; name: string; total_revenue: number }>(
      `SELECT c.id, c.name,
              COALESCE(SUM(i.total_price), 0) AS total_revenue
       FROM clients c
       JOIN invoices      i  ON i.client_id          = c.id
       JOIN invoice_items ii ON ii.invoice_id         = i.id
       JOIN article_items ai ON ai.id                 = ii.article_item_id
       JOIN articles      a  ON a.id                  = ai.article_id
       WHERE c.deleted_at  IS NULL
         AND i.deleted_at  IS NULL
         AND ii.deleted_at IS NULL
         AND ai.deleted_at IS NULL
       GROUP BY c.id, c.name
       ORDER BY total_revenue DESC
       LIMIT 5`,
    )
  })
}
