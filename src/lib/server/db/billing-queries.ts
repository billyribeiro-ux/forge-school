/**
 * Billing-specific read queries. Keeps the /account/billing load lean
 * and its tests targeted.
 */
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from './index.ts';
import {
	type Order,
	orders,
	type Payment,
	type Price,
	type Product,
	payments,
	prices,
	products,
	type Subscription,
	subscriptions
} from './schema.ts';

export type BillingSubscription = Subscription & {
	price: Price;
	product: Product;
};

export type BillingPayment = Payment & { order: Order | null };

export async function listSubscriptionsForSession(
	db: Db,
	sessionId: string
): Promise<BillingSubscription[]> {
	const rows = await db
		.select({ sub: subscriptions, price: prices, product: products })
		.from(subscriptions)
		.innerJoin(prices, eq(prices.id, subscriptions.priceId))
		.innerJoin(products, eq(products.id, prices.productId))
		.where(eq(subscriptions.sessionId, sessionId))
		.orderBy(desc(subscriptions.createdAt));

	return rows.map((r) => ({ ...r.sub, price: r.price, product: r.product }));
}

export async function listCompletedOrdersForSession(
	db: Db,
	sessionId: string
): Promise<BillingPayment[]> {
	const rows = await db
		.select({ payment: payments, order: orders })
		.from(payments)
		.innerJoin(orders, eq(orders.id, payments.orderId))
		.where(and(eq(orders.sessionId, sessionId), eq(orders.status, 'complete')))
		.orderBy(desc(payments.createdAt));

	return rows.map((r) => ({ ...r.payment, order: r.order }));
}
