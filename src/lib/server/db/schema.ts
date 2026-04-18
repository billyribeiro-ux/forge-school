/**
 * ForgeSchool — Drizzle schema.
 *
 * Source of truth for the database shape. Every structural decision in
 * this file is documented in `docs/ARCHITECTURE.md §4`. When the two
 * disagree, update both in the same commit.
 *
 * Conventions:
 * - UUID primary keys (uuid('id').primaryKey().defaultRandom()).
 * - Money in integer minor units (cents). Never floats.
 * - Timestamps in timestamptz, always UTC.
 * - `session_id` is the universal principal in v1 (no auth / users yet).
 * - Enums for closed sets; text for Stripe-mirror statuses that evolve.
 */
import {
	boolean,
	char,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';

/* ─── Timestamp helpers ─────────────────────────────────────────────────── */

const createdAt = () =>
	timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow();

const updatedAt = () =>
	timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date());

const nullableTimestamp = (name: string) =>
	timestamp(name, { withTimezone: true, mode: 'date' });

/* ─── Enums ─────────────────────────────────────────────────────────────── */

export const productKind = pgEnum('product_kind', ['course', 'bundle', 'subscription', 'lifetime']);
export const productStatus = pgEnum('product_status', ['draft', 'active', 'archived']);

export const priceInterval = pgEnum('price_interval', ['one_time', 'month', 'year']);

export const orderStatus = pgEnum('order_status', ['open', 'complete', 'expired', 'cancelled']);

export const subscriptionStatus = pgEnum('subscription_status', [
	'trialing',
	'active',
	'past_due',
	'cancelled',
	'unpaid',
	'paused'
]);

export const entitlementSource = pgEnum('entitlement_source', [
	'purchase',
	'subscription',
	'grant',
	'trial'
]);

export const couponDiscountType = pgEnum('coupon_discount_type', ['percent', 'amount']);
export const couponDuration = pgEnum('coupon_duration', ['once', 'repeating', 'forever']);

/* ─── Catalog ───────────────────────────────────────────────────────────── */

export const products = pgTable(
	'products',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		kind: productKind('kind').notNull(),
		status: productStatus('status').notNull().default('draft'),
		stripeProductId: text('stripe_product_id'),
		tags: text('tags').array().notNull().default([]),
		thumbnailUrl: text('thumbnail_url'),
		featuredOrder: integer('featured_order'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('products_slug_uq').on(t.slug),
		uniqueIndex('products_stripe_product_id_uq').on(t.stripeProductId),
		index('products_status_kind_idx').on(t.status, t.kind),
		index('products_featured_idx').on(t.featuredOrder)
	]
);

export const prices = pgTable(
	'prices',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		stripePriceId: text('stripe_price_id').notNull(),
		currency: char('currency', { length: 3 }).notNull().default('usd'),
		unitAmountCents: integer('unit_amount_cents').notNull(),
		interval: priceInterval('interval'),
		intervalCount: integer('interval_count'),
		trialPeriodDays: integer('trial_period_days'),
		active: boolean('active').notNull().default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('prices_stripe_price_id_uq').on(t.stripePriceId),
		index('prices_product_active_idx').on(t.productId, t.active)
	]
);

export const productCategories = pgTable(
	'product_categories',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('product_categories_slug_uq').on(t.slug)]
);

export const productCategoryMemberships = pgTable(
	'product_category_memberships',
	{
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		categoryId: uuid('category_id')
			.notNull()
			.references(() => productCategories.id, { onDelete: 'cascade' }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('product_category_memberships_pk').on(t.productId, t.categoryId),
		index('product_category_memberships_category_idx').on(t.categoryId)
	]
);

/* ─── Promotions ────────────────────────────────────────────────────────── */

export const coupons = pgTable(
	'coupons',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		code: text('code').notNull(),
		stripeCouponId: text('stripe_coupon_id'),
		discountType: couponDiscountType('discount_type').notNull(),
		discountValue: integer('discount_value').notNull(),
		duration: couponDuration('duration').notNull(),
		durationInMonths: integer('duration_in_months'),
		maxRedemptions: integer('max_redemptions'),
		redemptionsCount: integer('redemptions_count').notNull().default(0),
		validFrom: nullableTimestamp('valid_from'),
		validUntil: nullableTimestamp('valid_until'),
		active: boolean('active').notNull().default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('coupons_code_uq').on(t.code),
		uniqueIndex('coupons_stripe_coupon_id_uq').on(t.stripeCouponId)
	]
);

/* ─── Commerce ──────────────────────────────────────────────────────────── */

export const orders = pgTable(
	'orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: text('session_id').notNull(),
		stripeCheckoutSessionId: text('stripe_checkout_session_id'),
		status: orderStatus('status').notNull().default('open'),
		currency: char('currency', { length: 3 }).notNull().default('usd'),
		subtotalCents: integer('subtotal_cents').notNull().default(0),
		discountCents: integer('discount_cents').notNull().default(0),
		totalCents: integer('total_cents').notNull().default(0),
		couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('orders_stripe_checkout_session_id_uq').on(t.stripeCheckoutSessionId),
		index('orders_session_created_idx').on(t.sessionId, t.createdAt)
	]
);

export const orderItems = pgTable(
	'order_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		priceId: uuid('price_id')
			.notNull()
			.references(() => prices.id, { onDelete: 'restrict' }),
		quantity: integer('quantity').notNull().default(1),
		unitAmountCents: integer('unit_amount_cents').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('order_items_order_idx').on(t.orderId)]
);

export const payments = pgTable(
	'payments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		stripePaymentIntentId: text('stripe_payment_intent_id').notNull(),
		status: text('status').notNull(),
		amountCents: integer('amount_cents').notNull(),
		currency: char('currency', { length: 3 }).notNull().default('usd'),
		paidAt: nullableTimestamp('paid_at'),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('payments_stripe_payment_intent_id_uq').on(t.stripePaymentIntentId),
		index('payments_order_idx').on(t.orderId)
	]
);

export const refunds = pgTable(
	'refunds',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		paymentId: uuid('payment_id')
			.notNull()
			.references(() => payments.id, { onDelete: 'cascade' }),
		stripeRefundId: text('stripe_refund_id').notNull(),
		status: text('status').notNull(),
		amountCents: integer('amount_cents').notNull(),
		reason: text('reason'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('refunds_stripe_refund_id_uq').on(t.stripeRefundId)]
);

export const subscriptions = pgTable(
	'subscriptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: text('session_id').notNull(),
		stripeSubscriptionId: text('stripe_subscription_id').notNull(),
		stripeCustomerId: text('stripe_customer_id').notNull(),
		priceId: uuid('price_id')
			.notNull()
			.references(() => prices.id, { onDelete: 'restrict' }),
		status: subscriptionStatus('status').notNull(),
		currentPeriodStart: timestamp('current_period_start', {
			withTimezone: true,
			mode: 'date'
		}).notNull(),
		currentPeriodEnd: timestamp('current_period_end', {
			withTimezone: true,
			mode: 'date'
		}).notNull(),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
		trialEnd: nullableTimestamp('trial_end'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('subscriptions_stripe_subscription_id_uq').on(t.stripeSubscriptionId),
		index('subscriptions_session_status_idx').on(t.sessionId, t.status)
	]
);

/* ─── Access ────────────────────────────────────────────────────────────── */

export const entitlements = pgTable(
	'entitlements',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: text('session_id').notNull(),
		productId: uuid('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'restrict' }),
		source: entitlementSource('source').notNull(),
		sourceRef: text('source_ref'),
		grantedAt: createdAt(),
		revokedAt: nullableTimestamp('revoked_at')
	},
	(t) => [
		uniqueIndex('entitlements_session_product_source_uq').on(t.sessionId, t.productId, t.source),
		index('entitlements_session_revoked_idx').on(t.sessionId, t.revokedAt)
	]
);

/* ─── Coupon redemptions ────────────────────────────────────────────────── */

export const couponRedemptions = pgTable(
	'coupon_redemptions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		couponId: uuid('coupon_id')
			.notNull()
			.references(() => coupons.id, { onDelete: 'restrict' }),
		orderId: uuid('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		sessionId: text('session_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('coupon_redemptions_coupon_order_uq').on(t.couponId, t.orderId),
		index('coupon_redemptions_coupon_idx').on(t.couponId)
	]
);

/* ─── Cart ──────────────────────────────────────────────────────────────── */

export const carts = pgTable(
	'carts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		sessionId: text('session_id').notNull(),
		couponId: uuid('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('carts_session_id_uq').on(t.sessionId)]
);

export const cartItems = pgTable(
	'cart_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		cartId: uuid('cart_id')
			.notNull()
			.references(() => carts.id, { onDelete: 'cascade' }),
		priceId: uuid('price_id')
			.notNull()
			.references(() => prices.id, { onDelete: 'restrict' }),
		quantity: integer('quantity').notNull().default(1),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('cart_items_cart_price_uq').on(t.cartId, t.priceId),
		index('cart_items_cart_idx').on(t.cartId)
	]
);

/* ─── Integrity — Stripe webhook idempotency ────────────────────────────── */

export const webhookEvents = pgTable(
	'webhook_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		stripeEventId: text('stripe_event_id').notNull(),
		type: text('type').notNull(),
		processedAt: createdAt()
	},
	(t) => [
		uniqueIndex('webhook_events_stripe_event_id_uq').on(t.stripeEventId),
		index('webhook_events_type_processed_idx').on(t.type, t.processedAt)
	]
);

/* ─── Inferred row types — export for use in the rest of the codebase ──── */

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Price = typeof prices.$inferSelect;
export type NewPrice = typeof prices.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Entitlement = typeof entitlements.$inferSelect;
export type NewEntitlement = typeof entitlements.$inferInsert;
export type ProductCategory = typeof productCategories.$inferSelect;
export type ProductKindValue = (typeof productKind.enumValues)[number];
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
