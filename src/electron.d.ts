/**
 * Typage de l'API exposée par le preload via contextBridge.
 * Le renderer accède à window.electron pour toutes les opérations.
 */

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  per_page: number
  current_page: number
}

export interface Client {
  id: number
  name: string
  slug: string
  address: string | null
  phone: string | null
  email: string | null
  amount_due: number
  amount_payment: number
  amount_solde: number
  credit_disponible: number
  sync_status: 'synced' | 'pending' | 'conflict' | 'deleted_pending'
  updated_at: string
}

export interface Supplier {
  id: number
  name: string
  slug_name: string
  address: string | null
  phone: string | null
  email: string | null
  sync_status: string
  updated_at: string
}

export type ArticleEssence = 'Ayous' | 'Frake' | 'Dibetou' | 'Bois Rouge' | 'Dabema'

export interface Article {
  id: number
  essence: ArticleEssence
  supplier_id: number
  contract_number: string | null
  indisponible: boolean
  price_per_m3: number
  category: string | null
  nombre_de_colis: number
  volume: number
  sync_status: string
  updated_at: string
}

export interface ArticleItem {
  id: number
  article_id: number
  numero_colis: string
  longueur: number
  largeur: number
  epaisseur: number
  nombre_piece: number
  volume: number
  indisponible: boolean
  sync_status: string
  updated_at: string
}

export interface InvoiceItem {
  id: number
  invoice_id: number
  article_item_id: number | null
  article_id: number | null
  price: number
  total_price_item: number
  volume_vendu: number | null
  nombre_de_colis_vendu: number | null
  // joined from article_items + articles
  numero_colis: string | null
  longueur: number | null
  epaisseur: number | null
  largeur: number | null
  nombre_piece: number | null
  volume: number | null
  essence: string | null
  contract_number: string | null
}

export interface Invoice {
  id: number
  client_id: number
  date: string
  matricule: string | null
  sequence: number | null
  total_price: number
  montant_solde: number
  status: 'pending' | 'validated' | 'canceled'
  client_name?: string
  sync_status: string
  updated_at: string
}

export interface Payment {
  id: number
  client_id: number
  amount: number
  date: string
  sync_status: string
}

export interface Caisse {
  id: number
  name: string
  type: 'especes' | 'banque' | 'mobile_money' | null
  currency_code: string | null
  initial_balance: number
  active: boolean
  balance_with_initial: number
  sync_status: string
  updated_at: string
}

export interface CaisseTransaction {
  id: number
  type: 'entree' | 'sortie'
  amount: number
  objet: string
  description: string | null
  date: string
  payment_id: number | null
  sync_status: string
}

export interface MonthlyExpense {
  id: number
  month: number
  year: number
  amount: number
  user_id: number | null
  server_id: number | null
  sync_status: string
  created_at: string
  updated_at: string
}

export interface SyncStatus {
  isOnline: boolean
  lastSyncedAt: string | null
  serverUrl: string
}

type IpcListener = (...args: unknown[]) => void

declare global {
  interface Window {
    electron: {
      auth: {
        login(email: string, password: string, deviceName: string): Promise<{ user: { id: number; name: string; email: string }; expiresAt: string }>
        logout(): Promise<{ success: boolean }>
        getSession(): Promise<{ user: { id: number; name: string; email: string }; hasToken: boolean } | null>
        refreshToken(): Promise<{ expiresAt: string }>
      }
      clients: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Client>>
        get(id: number): Promise<Client | undefined>
        create(data: Partial<Client>): Promise<Client>
        update(id: number, data: Partial<Client>): Promise<Client>
        delete(id: number): Promise<{ success: boolean }>
        balance(id: number): Promise<{ client_id: number; total_due: number; total_paid: number; balance: number; credit: number }>
      }
      suppliers: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Supplier>>
        get(id: number): Promise<Supplier | undefined>
        create(data: Partial<Supplier>): Promise<Supplier>
        update(id: number, data: Partial<Supplier>): Promise<Supplier>
        delete(id: number): Promise<{ success: boolean }>
      }
      articles: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Article>>
        get(id: number): Promise<Article | undefined>
        create(data: Partial<Article>): Promise<Article>
        update(id: number, data: Partial<Article>): Promise<Article>
        delete(id: number): Promise<{ success: boolean }>
        items(articleId: number): Promise<ArticleItem[]>
      }
      articleItems: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<ArticleItem>>
        get(id: number): Promise<ArticleItem | undefined>
        create(data: Partial<ArticleItem>): Promise<ArticleItem>
        update(id: number, data: Partial<ArticleItem>): Promise<ArticleItem>
        delete(id: number): Promise<{ success: boolean }>
      }
      invoices: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Invoice>>
        get(id: number): Promise<Invoice | undefined>
        items(invoiceId: number): Promise<InvoiceItem[]>
        create(data: Partial<Invoice> & { items: unknown[] }): Promise<Invoice>
        update(id: number, data: Partial<Invoice>): Promise<Invoice>
        delete(id: number): Promise<{ success: boolean }>
        updateItem(invoiceId: number, itemId: number, data: { price: number }): Promise<{ success: boolean; total_price_item: number }>
        removeItem(invoiceId: number, itemId: number): Promise<{ success: boolean }>
        addItem(invoiceId: number, data: { article_item_id: number; article_id: number; price: number; volume: number }): Promise<{ success: boolean; id: number }>
      }
      deliveryNotes: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Record<string, unknown>>>
        get(id: number): Promise<Record<string, unknown> | undefined>
        create(data: Record<string, unknown>): Promise<Record<string, unknown>>
        update(id: number, data: Record<string, unknown>): Promise<Record<string, unknown>>
        delete(id: number): Promise<{ success: boolean }>
        convert(id: number): Promise<{ success: boolean; invoice_id?: number }>
      }
      payments: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<Payment>>
        get(id: number): Promise<Payment | undefined>
        create(data: Partial<Payment>): Promise<Payment>
        delete(id: number): Promise<{ success: boolean }>
      }
      caisses: {
        list(params?: Record<string, unknown>): Promise<Caisse[]>
        get(id: number): Promise<Caisse | undefined>
        create(data: Partial<Caisse>): Promise<Caisse>
        update(id: number, data: Partial<Caisse>): Promise<Caisse>
        delete(id: number): Promise<{ success: boolean }>
      }
      caisse: {
        list(params?: Record<string, unknown>): Promise<PaginatedResponse<CaisseTransaction>>
        listByCaisse(caisseId: number, params?: Record<string, unknown>): Promise<CaisseTransaction[]>
        solde(): Promise<{ entrees: number; sorties: number; solde: number }>
        summary(caisseId: number): Promise<{ entrees: number; sorties: number; transfers_in: number; transfers_out: number }>
        create(data: Partial<CaisseTransaction> & { caisse_id?: number }): Promise<CaisseTransaction>
        update(id: number, data: Partial<CaisseTransaction>): Promise<CaisseTransaction>
        delete(id: number): Promise<{ success: boolean }>
        transfer(data: { source_caisse_id: number; destination_caisse_id: number; amount_source: number; exchange_rate?: number | null; amount_destination?: number | null; description?: string; transfer_date: string }): Promise<{ success: boolean }>
        correctPayment(data: { transaction_id: number; amount: number; date: string; description?: string | null; reason?: string | null }): Promise<{ success: boolean }>
        deletePayment(transactionId: number): Promise<{ success: boolean }>
      }
      monthlyExpenses: {
        list(params?: Record<string, unknown>): Promise<{ data: MonthlyExpense[]; total: number }>
        get(id: number): Promise<MonthlyExpense | undefined>
        create(data: Partial<MonthlyExpense>): Promise<MonthlyExpense>
        update(id: number, data: Partial<MonthlyExpense>): Promise<MonthlyExpense>
        delete(id: number): Promise<{ success: boolean }>
      }
      sync: {
        now(): Promise<{ success: boolean; pulled?: number; pushed?: number; conflicts?: number; message?: string }>
        getStatus(): Promise<SyncStatus>
        getPendingCount(): Promise<number>
        resolveConflict(conflictId: number, resolution: 'keep_local' | 'keep_server'): Promise<{ success: boolean }>
        resetFull(): Promise<{ success: boolean; pulled?: number; pushed?: number; conflicts?: number; message?: string }>
      }
      settings: {
        get(): Promise<{ serverUrl: string; version: string; appName: string; logPath: string }>
        setServerUrl(url: string): Promise<{ success: boolean; error?: string }>
        testConnection(url?: string): Promise<{ online: boolean }>
        openLogFolder(): Promise<void>
      }
      updater: {
        check(): Promise<{ available: boolean; version?: string; devMode?: boolean }>
        download(): Promise<void>
        install(): Promise<void>
      }
      dashboard: {
        statsGeneral(): Promise<{
          chiffre_affaires: number
          chiffre_affaire_old: number
          montant_paye: number
          montant_du: number
          stock_disponible: number
          soldeCaisse: number
        }>
        caBenefice(filters?: Record<string, unknown>): Promise<{
          year: number; month: number
          total_revenue: number; cost_base: number
          gross_profit: number; monthly_expense: number; net_profit: number
        }[]>
        evolutionCa(filters?: Record<string, unknown>): Promise<{
          month: string; total_revenue: number
        }[]>
        topClients(): Promise<{ id: number; name: string; total_revenue: number }[]>
        clientsStats(): Promise<{
          kpi: {
            nb_clients: number; total_ca: number; total_paye: number
            total_du: number; taux_recouvrement: number; nb_clients_avec_creances: number
          }
          evolution: { month: string; total_facture: number; total_paye: number }[]
          clients: {
            id: number; name: string; total_ca: number; total_paye: number
            montant_du: number; taux_recouvrement: number; nb_factures: number
            derniere_facture: string | null
          }[]
        }>
      }
      print(): Promise<void>
      exportPdf(fileName?: string): Promise<{ canceled: boolean; filePath?: string }>
      exportInvoicePdf(invoiceId: number): Promise<{ canceled: boolean; filePath?: string; error?: string }>
      reload(): Promise<void>
      reportRendererError(data: { message: string; stack?: string }): Promise<void>
      on(channel: string, listener: IpcListener): () => void
    }
  }
}
