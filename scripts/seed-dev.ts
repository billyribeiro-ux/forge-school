/**
 * ForgeSchool — development seed.
 *
 * Creates or reuses Stripe test-mode products + prices for every product
 * the catalog ships, then mirrors the resolved Stripe IDs into the local
 * Postgres via Drizzle. Idempotent: rerun produces no duplicates in
 * Stripe OR in the DB.
 *
 * Local-dev only. Refuses to run against anything that looks like a
 * production DATABASE_URL or STRIPE_SECRET_KEY.
 *
 * Invoke via:
 *     pnpm db:seed
 *
 * Or the full reset+seed loop:
 *     pnpm db:reset && pnpm db:seed
 */
import type Stripe from 'stripe';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/db/schema.ts';
import { loadEnv, refuseIfProdLike, requireDatabaseUrl } from './lib/env.ts';
import { createStripe } from './lib/stripe.ts';
import { seedCategories } from './seed-categories.ts';
import { seedCoupons } from './seed-coupons.ts';
import { seedCourse } from './seed-course.ts';
import { seedPersonas } from './seed-personas.ts';

loadEnv();
const databaseUrl = requireDatabaseUrl('seed');
refuseIfProdLike('seed', databaseUrl);
const stripe = createStripe('seed');

/**
 * Canonical catalog: every product the app ships.
 *
 * Slug is the business key (also the URL path in /pricing). Stripe
 * identifies our products via metadata.forge_slug so rerunning the seed
 * finds the existing Stripe row instead of creating a duplicate.
 */
type PriceSpec = {
	stripePriceIdMetaKey: string;
	currency: string;
	unitAmountCents: number;
	interval: 'one_time' | 'month' | 'year';
	intervalCount?: number;
	trialPeriodDays?: number;
	nickname: string;
};

type ProductSpec = {
	slug: string;
	name: string;
	description: string;
	kind: 'course' | 'bundle' | 'subscription' | 'lifetime';
	prices: PriceSpec[];
};

const catalog: ProductSpec[] = [
	{
		slug: 'forgeschool-lifetime',
		name: 'ForgeSchool — Lifetime',
		description:
			'One-time purchase, permanent access to every lesson and every future module.',
		kind: 'lifetime',
		prices: [
			{
				stripePriceIdMetaKey: 'forge_price_lifetime_497',
				currency: 'usd',
				unitAmountCents: 49700,
				interval: 'one_time',
				nickname: 'Lifetime $497'
			}
		]
	},
	{
		slug: 'forgeschool-pro-monthly',
		name: 'ForgeSchool Pro — Monthly',
		description: 'Ongoing access to every lesson, billed monthly. Cancel any time.',
		kind: 'subscription',
		prices: [
			{
				stripePriceIdMetaKey: 'forge_price_pro_monthly_49',
				currency: 'usd',
				unitAmountCents: 4900,
				interval: 'month',
				intervalCount: 1,
				trialPeriodDays: 7,
				nickname: 'Pro Monthly $49'
			}
		]
	},
	{
		slug: 'forgeschool-pro-yearly',
		name: 'ForgeSchool Pro — Yearly',
		description: 'Ongoing access to every lesson, billed annually. Cancel any time.',
		kind: 'subscription',
		prices: [
			{
				stripePriceIdMetaKey: 'forge_price_pro_yearly_497',
				currency: 'usd',
				unitAmountCents: 49700,
				interval: 'year',
				intervalCount: 1,
				trialPeriodDays: 14,
				nickname: 'Pro Yearly $497'
			}
		]
	}
];

async function findOrCreateStripeProduct(spec: ProductSpec): Promise<Stripe.Product> {
	const searchQuery = `metadata['forge_slug']:'${spec.slug}' AND active:'true'`;
	const existing = await stripe.products.search({ query: searchQuery, limit: 1 });
	if (existing.data[0] !== undefined) {
		return existing.data[0];
	}
	return stripe.products.create({
		name: spec.name,
		description: spec.description,
		metadata: { forge_slug: spec.slug, forge_kind: spec.kind }
	});
}

async function findOrCreateStripePrice(
	product: Stripe.Product,
	spec: PriceSpec
): Promise<Stripe.Price> {
	const searchQuery = `metadata['forge_price_key']:'${spec.stripePriceIdMetaKey}' AND active:'true'`;
	const existing = await stripe.prices.search({ query: searchQuery, limit: 1 });
	if (existing.data[0] !== undefined) {
		return existing.data[0];
	}
	const recurring: Stripe.PriceCreateParams.Recurring | undefined =
		spec.interval === 'one_time'
			? undefined
			: {
					interval: spec.interval,
					interval_count: spec.intervalCount ?? 1,
					...(spec.trialPeriodDays !== undefined && { trial_period_days: spec.trialPeriodDays })
				};
	return stripe.prices.create({
		product: product.id,
		currency: spec.currency,
		unit_amount: spec.unitAmountCents,
		nickname: spec.nickname,
		metadata: { forge_price_key: spec.stripePriceIdMetaKey },
		...(recurring !== undefined && { recurring })
	});
}

async function seedProducts(db: ReturnType<typeof drizzle<typeof schema>>): Promise<void> {
	console.log('[seed] products + prices (real Stripe test-mode sync)...');
	for (const spec of catalog) {
		const stripeProduct = await findOrCreateStripeProduct(spec);

		const [inserted] = await db
			.insert(schema.products)
			.values({
				slug: spec.slug,
				name: spec.name,
				description: spec.description,
				kind: spec.kind,
				status: 'active',
				stripeProductId: stripeProduct.id
			})
			.onConflictDoUpdate({
				target: schema.products.slug,
				set: {
					name: spec.name,
					description: spec.description,
					kind: spec.kind,
					stripeProductId: stripeProduct.id,
					updatedAt: new Date()
				}
			})
			.returning();

		if (inserted === undefined) {
			throw new Error(`[seed] failed to upsert product ${spec.slug}`);
		}

		for (const priceSpec of spec.prices) {
			const stripePrice = await findOrCreateStripePrice(stripeProduct, priceSpec);
			await db
				.insert(schema.prices)
				.values({
					productId: inserted.id,
					stripePriceId: stripePrice.id,
					currency: priceSpec.currency,
					unitAmountCents: priceSpec.unitAmountCents,
					interval: priceSpec.interval,
					intervalCount: priceSpec.intervalCount ?? null,
					trialPeriodDays: priceSpec.trialPeriodDays ?? null,
					active: true
				})
				.onConflictDoUpdate({
					target: schema.prices.stripePriceId,
					set: {
						unitAmountCents: priceSpec.unitAmountCents,
						updatedAt: new Date()
					}
				});
		}

		console.log(
			`[seed]   ✓ ${spec.slug} (${stripeProduct.id}) · ${spec.prices.length} price(s)`
		);
	}
}

async function main(): Promise<void> {
	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });
	try {
		console.log('[seed] inserting dev fixtures...');
		await seedProducts(db);
		await seedCategories(db);
		await seedCoupons(db);
		await seedCourse(db);
		await seedPersonas(db);
		console.log('[seed] done');
	} finally {
		await client.end({ timeout: 5 });
	}
}

await main();
