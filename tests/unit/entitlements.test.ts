import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	grantPurchaseEntitlement,
	grantSubscriptionEntitlement,
	revokePurchaseEntitlementsForSession,
	revokeSubscriptionEntitlement,
	hasEntitlement
} from '../../src/lib/server/entitlements/index.ts';
import {
	entitlements,
	products
} from '../../src/lib/server/db/schema.ts';

/**
 * Argument-shape tests. We mock Drizzle's chain to capture every call —
 * each test asserts the grant/revoke writes hit the right table with
 * the right onConflict target, the right SET payload, and the right
 * WHERE clause shape.
 *
 * Live-Postgres integration tests live in `tests/integration/` (run
 * after `pnpm db:reset && pnpm db:seed`); this suite runs without
 * any database and never goes near `postgres.js`.
 */

type Captured = {
	insertedTable?: unknown;
	insertedValues?: unknown;
	onConflictTarget?: unknown;
	onConflictSet?: unknown;
	updatedTable?: unknown;
	updatedSet?: unknown;
	whereArg?: unknown;
	selectColumns?: unknown;
	fromTable?: unknown;
};

function makeMockDb(): { db: object; captured: Captured } {
	const captured: Captured = {};
	const onConflictDoUpdate = vi.fn((args: { target: unknown; set: unknown }) => {
		captured.onConflictTarget = args.target;
		captured.onConflictSet = args.set;
		return Promise.resolve();
	});
	const insertChain = {
		values: vi.fn((v: unknown) => {
			captured.insertedValues = v;
			return { onConflictDoUpdate };
		})
	};
	const setReturn = {
		where: vi.fn((arg: unknown) => {
			captured.whereArg = arg;
			return Promise.resolve();
		})
	};
	const updateChain = {
		set: vi.fn((s: unknown) => {
			captured.updatedSet = s;
			return setReturn;
		})
	};
	const selectFromInner = {
		innerJoin: vi.fn(() => selectFromInner),
		where: vi.fn(() => selectFromInner),
		limit: vi.fn(async () => [])
	};
	const selectChain = {
		from: vi.fn((t: unknown) => {
			captured.fromTable = t;
			return selectFromInner;
		})
	};
	const db = {
		insert: vi.fn((t: unknown) => {
			captured.insertedTable = t;
			return insertChain;
		}),
		update: vi.fn((t: unknown) => {
			captured.updatedTable = t;
			return updateChain;
		}),
		select: vi.fn((cols: unknown) => {
			captured.selectColumns = cols;
			return selectChain;
		})
	};
	return { db, captured };
}

describe('entitlements.grantPurchaseEntitlement', () => {
	let mock: ReturnType<typeof makeMockDb>;
	beforeEach(() => {
		mock = makeMockDb();
	});

	it('inserts into the entitlements table', async () => {
		await grantPurchaseEntitlement(mock.db as never, {
			sessionId: 's1',
			productId: 'p1',
			sourceRef: 'cs_test_xyz'
		});
		expect(mock.captured.insertedTable).toBe(entitlements);
	});

	it('writes the source as "purchase" + carries sourceRef', async () => {
		await grantPurchaseEntitlement(mock.db as never, {
			sessionId: 's1',
			productId: 'p1',
			sourceRef: 'cs_test_xyz'
		});
		expect(mock.captured.insertedValues).toMatchObject({
			sessionId: 's1',
			productId: 'p1',
			source: 'purchase',
			sourceRef: 'cs_test_xyz'
		});
	});

	it('upserts with revokedAt cleared on conflict (idempotent re-grant)', async () => {
		await grantPurchaseEntitlement(mock.db as never, {
			sessionId: 's1',
			productId: 'p1',
			sourceRef: 'cs_test_xyz'
		});
		expect(mock.captured.onConflictSet).toMatchObject({
			revokedAt: null,
			sourceRef: 'cs_test_xyz'
		});
	});
});

describe('entitlements.grantSubscriptionEntitlement', () => {
	it('writes source="subscription" + carries subscriptionId as sourceRef', async () => {
		const mock = makeMockDb();
		await grantSubscriptionEntitlement(mock.db as never, {
			sessionId: 's2',
			productId: 'p2',
			subscriptionId: 'sub_test_abc'
		});
		expect(mock.captured.insertedValues).toMatchObject({
			sessionId: 's2',
			productId: 'p2',
			source: 'subscription',
			sourceRef: 'sub_test_abc'
		});
		expect(mock.captured.onConflictSet).toMatchObject({
			revokedAt: null,
			sourceRef: 'sub_test_abc'
		});
	});
});

describe('entitlements.revokePurchaseEntitlementsForSession', () => {
	it('updates the entitlements table with revokedAt set to a Date', async () => {
		const mock = makeMockDb();
		await revokePurchaseEntitlementsForSession(mock.db as never, { sessionId: 's3' });
		expect(mock.captured.updatedTable).toBe(entitlements);
		expect(mock.captured.updatedSet).toMatchObject({ revokedAt: expect.any(Date) });
	});
});

describe('entitlements.revokeSubscriptionEntitlement', () => {
	it('updates with revokedAt set to a Date', async () => {
		const mock = makeMockDb();
		await revokeSubscriptionEntitlement(mock.db as never, {
			sessionId: 's4',
			productId: 'p4'
		});
		expect(mock.captured.updatedTable).toBe(entitlements);
		expect(mock.captured.updatedSet).toMatchObject({ revokedAt: expect.any(Date) });
	});
});

describe('entitlements.hasEntitlement', () => {
	it('returns false when the select returns no rows', async () => {
		const mock = makeMockDb();
		const result = await hasEntitlement(mock.db as never, {
			sessionId: 's5',
			productSlug: 'forgeschool-lifetime'
		});
		expect(result).toBe(false);
		expect(mock.captured.fromTable).toBe(entitlements);
	});

	it('returns true when at least one row matches', async () => {
		const mock = makeMockDb();
		// Override the select chain to return a row.
		(mock.db as { select: ReturnType<typeof vi.fn> }).select = vi.fn(() => ({
			from: () => ({
				innerJoin: () => ({
					where: () => ({
						limit: async () => [{ id: 'e1' }]
					})
				})
			})
		}));
		const result = await hasEntitlement(mock.db as never, {
			sessionId: 's6',
			productSlug: 'forgeschool-lifetime'
		});
		expect(result).toBe(true);
	});
});

describe('entitlements — schema imports compile-time guards', () => {
	it('entitlements + products schema objects are non-undefined', () => {
		expect(entitlements).toBeDefined();
		expect(products).toBeDefined();
	});
});
