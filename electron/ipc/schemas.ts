import { z } from 'zod'

// ── Parse helper ─────────────────────────────────────────────────────────────
export function parse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ')
    throw new Error(`[IPC] ${context} — ${msg}`)
  }
  return result.data
}

// ── Primitives ────────────────────────────────────────────────────────────────
export const PositiveInt  = z.number().int().positive()
export const NonnegNumber = z.number().nonnegative()
export const DateString   = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD attendu')

// SQLite stores booleans as 0/1 — accept both
const BoolLike = z.union([z.boolean(), z.number().int().min(0).max(1)])
const ArticleEssenceSchema = z.enum(['Ayous', 'Frake', 'Dibetou', 'Bois Rouge', 'Dabema'])

// ── Auth ──────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email:      z.string().email().max(255),
  password:   z.string().min(1).max(255),
  deviceName: z.string().min(1).max(100),
})

// ── Settings ──────────────────────────────────────────────────────────────────
export const ServerUrlSchema = z.string().url().max(500)

// ── Sync ──────────────────────────────────────────────────────────────────────
export const ResolveConflictSchema = z.object({
  conflictId: PositiveInt,
  resolution: z.enum(['keep_local', 'keep_server']),
})

// ── Clients ───────────────────────────────────────────────────────────────────
export const ClientCreateSchema = z.object({
  name:              z.string().min(1).max(255),
  slug:              z.string().max(255).optional(),
  address:           z.string().max(500).nullable().optional(),
  phone:             z.string().max(50).nullable().optional(),
  email:             z.string().email().max(255).nullable().optional(),
  amount_due:        NonnegNumber.optional(),
  amount_payment:    NonnegNumber.optional(),
  amount_solde:      z.number().optional(),
  credit_disponible: NonnegNumber.optional(),
})

export const ClientUpdateSchema = ClientCreateSchema.partial()

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const SupplierCreateSchema = z.object({
  name:      z.string().min(1).max(255),
  slug_name: z.string().max(255).optional(),
  address:   z.string().max(500).nullable().optional(),
  phone:     z.string().max(50).nullable().optional(),
  email:     z.string().email().max(255).nullable().optional(),
})

export const SupplierUpdateSchema = SupplierCreateSchema.partial()

// ── Articles ──────────────────────────────────────────────────────────────────
export const ArticleCreateSchema = z.object({
  essence:         ArticleEssenceSchema,
  supplier_id:     PositiveInt,
  contract_number: z.string().max(100).nullable().optional(),
  indisponible:    BoolLike.optional(),
  price_per_m3:    NonnegNumber.default(0),
  category:        z.string().max(100).nullable().optional(),
  nombre_de_colis: z.number().int().nonnegative().default(0),
  volume:          NonnegNumber.default(0),
})

export const ArticleUpdateSchema = ArticleCreateSchema.partial()

// ── Article Items ─────────────────────────────────────────────────────────────
export const ArticleItemCreateSchema = z.object({
  article_id:   PositiveInt,
  numero_colis: z.string().min(1).max(100),
  longueur:     z.number().positive(),
  largeur:      z.number().positive(),
  epaisseur:    z.number().positive(),
  nombre_piece: z.number().int().positive(),
  volume:       z.number().positive(),
  indisponible: BoolLike.optional(),
})

export const ArticleItemUpdateSchema = ArticleItemCreateSchema.partial()

// ── Payments ──────────────────────────────────────────────────────────────────
export const PaymentCreateSchema = z.object({
  client_id: PositiveInt,
  amount:    z.number().positive(),
  date:      DateString,
})

// ── Comptes Caisse ────────────────────────────────────────────────────────────
export const CaisseAccountCreateSchema = z.object({
  name:            z.string().min(1).max(255),
  type:            z.enum(['especes', 'banque', 'mobile_money']).nullable().optional(),
  currency_code:   z.string().max(10).optional(),
  initial_balance: z.number().nonnegative().optional(),
  active:          BoolLike.optional(),
})

export const CaisseAccountUpdateSchema = CaisseAccountCreateSchema.partial()

// ── Transactions Caisse ───────────────────────────────────────────────────────
export const CaisseCreateSchema = z.object({
  type:        z.enum(['entree', 'sortie']),
  amount:      z.number().positive(),
  objet:       z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  date:        DateString,
  caisse_id:   z.number().int().positive().optional(),
  payment_id:  z.number().int().positive().optional(),
})

// ── Invoices ──────────────────────────────────────────────────────────────────
export const InvoiceItemInputSchema = z.object({
  article_item_id:       PositiveInt.optional(),
  article_id:            PositiveInt.optional(),
  price:                 NonnegNumber,
  total_price_item:      NonnegNumber,
  volume_vendu:          NonnegNumber.optional(),
  nombre_de_colis_vendu: z.number().int().nonnegative().optional(),
})

export const InvoiceCreateSchema = z.object({
  client_id: PositiveInt,
  date:      DateString,
  status:    z.enum(['pending', 'validated', 'canceled']).optional(),
  items:     z.array(InvoiceItemInputSchema).min(1),
})

export const InvoiceUpdateSchema = z.object({
  status:    z.enum(['pending', 'validated', 'canceled']).optional(),
  date:      DateString.optional(),
  matricule: z.string().max(100).nullable().optional(),
}).strict()

export const InvoiceUpdateItemSchema = z.object({
  price: z.number().positive(),
})

export const InvoiceAddItemSchema = z.object({
  article_item_id: PositiveInt,
  article_id:      PositiveInt,
  price:           z.number().positive(),
  volume:          z.number().positive(),
})

// ── Dépenses mensuelles ───────────────────────────────────────────────────────
export const MonthlyExpenseCreateSchema = z.object({
  month:  z.number().int().min(1).max(12),
  year:   z.number().int().min(2000).max(2100),
  amount: z.number().nonnegative(),
})

export const MonthlyExpenseUpdateSchema = MonthlyExpenseCreateSchema.partial()
