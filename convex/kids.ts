import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

// Helper to assert authentication and return userId
async function requireAuth(ctx: any): Promise<string> {
	const userId = await getAuthUserId(ctx);
	if (!userId) {
		throw new Error('Unauthenticated parent user. Please sign in.');
	}
	return userId;
}

// 1. Pure query to list children
export const listChildren = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuth(ctx);
		return await ctx.db
			.query('children')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.collect();
	},
});

// Seed default children profiles
export const seedDefaultChildren = mutation({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db
			.query('children')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.collect();

		if (existing.length > 0) {
			return existing;
		}

		const defaults = [
			{ name: 'Muhammadloiq', emoji: '👦', score: 120, claimed: [], unlocked: [] },
			{ name: 'Aisha', emoji: '👧', score: 95, claimed: [], unlocked: [] },
			{ name: 'Zaynab', emoji: '👶', score: 50, claimed: [], unlocked: [] },
			{ name: 'Ibrohim', emoji: '👶', score: 30, claimed: [], unlocked: [] },
		];

		const seeded = [];
		for (const kid of defaults) {
			const id = await ctx.db.insert('children', {
				userId,
				name: kid.name,
				emoji: kid.emoji,
				score: kid.score,
				claimed: kid.claimed,
				unlocked: kid.unlocked,
				createdAt: Date.now(),
			});
			const doc = await ctx.db.get(id);
			if (doc) seeded.push(doc);
		}
		return seeded;
	},
});

// 2. Create new child
export const createChild = mutation({
	args: {
		name: v.string(),
		emoji: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const id = await ctx.db.insert('children', {
			userId,
			name: args.name,
			emoji: args.emoji || '👦',
			score: 0,
			claimed: [],
			unlocked: [],
			createdAt: Date.now(),
		});
		return await ctx.db.get(id);
	},
});

// 3. Delete a child
export const deleteChild = mutation({
	args: {
		childId: v.id('children'),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const child = await ctx.db.get(args.childId);
		if (!child || child.userId !== userId) {
			throw new Error('Child profile not found or unauthorized access');
		}

		// Delete child
		await ctx.db.delete(args.childId);

		// Clean up logs associated with this child
		const childLogs = await ctx.db
			.query('logs')
			.withIndex('by_childId', (q) => q.eq('childId', args.childId))
			.collect();
		for (const log of childLogs) {
			await ctx.db.delete(log._id);
		}

		// Clean up custom items associated with this child
		const customItems = await ctx.db
			.query('custom_items')
			.withIndex('by_childId', (q) => q.eq('childId', args.childId))
			.collect();
		for (const item of customItems) {
			await ctx.db.delete(item._id);
		}

		return { success: true };
	},
});

// 4. Central recordAction mutation - Heart of the points system
export const recordAction = mutation({
	args: {
		childId: v.id('children'),
		entryId: v.string(), // E.g., 'namoz-bomdod', 'harf-1', custom ID, or test code
		title: v.string(),
		value: v.number(), // +10, -15, etc.
		dateStr: v.string(), // YYYY-MM-DD
		isUnlock: v.optional(v.boolean()),
		isClaim: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const child = await ctx.db.get(args.childId);
		if (!child || child.userId !== userId) {
			throw new Error('Bolaning profili topilmadi yoki ruxsat yo’q.');
		}

		// If it's a one-off unlock task
		if (args.isUnlock) {
			if (child.unlocked?.includes(args.entryId)) {
				return { success: false, message: 'Bu vazifa allaqachon bajarilgan!' };
			}
		}

		// If it's a reward claim
		if (args.isClaim) {
			const cost = Math.abs(args.value);
			if (child.score < cost) {
				return { success: false, message: 'Ballar yetarli emas! 😢' };
			}
		}

		// Calculate new score. absolute floor is 0 as per Section 4: "ball hech qachon noldan pastga tushmaydi"
		const updatedScore = Math.max(0, child.score + args.value);

		// Prepare updates
		const unlockedList = [...(child.unlocked || [])];
		if (args.isUnlock && !unlockedList.includes(args.entryId)) {
			unlockedList.push(args.entryId);
		}

		const claimedList = [...(child.claimed || [])];
		if (args.isClaim && !claimedList.includes(args.entryId)) {
			claimedList.push(args.entryId);
		}

		// Update child document
		await ctx.db.patch(args.childId, {
			score: updatedScore,
			unlocked: unlockedList,
			claimed: claimedList,
		});

		// Record the log entry
		await ctx.db.insert('logs', {
			userId,
			childId: args.childId,
			entryId: args.entryId,
			title: args.title,
			value: args.value,
			timestamp: Date.now(),
			dateStr: args.dateStr,
		});

		return {
			success: true,
			score: updatedScore,
			message: args.value > 0 ? `+${args.value} ball! 🎉` : `${args.value} ball! ⚠️`,
		};
	},
});

// 5. Add custom task, penalty, or reward
export const addCustomItem = mutation({
	args: {
		childId: v.id('children'),
		type: v.string(), // "task" | "reward" | "penalty"
		title: v.string(),
		value: v.number(),
		emoji: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const child = await ctx.db.get(args.childId);
		if (!child || child.userId !== userId) {
			throw new Error('Child profile not found');
		}

		const itemId = await ctx.db.insert('custom_items', {
			userId,
			childId: args.childId,
			type: args.type,
			title: args.title,
			value: args.value,
			emoji: args.emoji || '✨',
			timestamp: Date.now(),
		});

		return await ctx.db.get(itemId);
	},
});

// 6. Delete a custom item
export const deleteCustomItem = mutation({
	args: {
		itemId: v.id('custom_items'),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const item = await ctx.db.get(args.itemId);
		if (!item || item.userId !== userId) {
			throw new Error('Custom item not found or unauthorized');
		}

		await ctx.db.delete(args.itemId);
		return { success: true };
	},
});

// 7. Get custom items for child
export const getCustomItems = query({
	args: {
		childId: v.id('children'),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		return await ctx.db
			.query('custom_items')
			.withIndex('by_childId', (q) => q.eq('childId', args.childId))
			.collect();
	},
});

// 8. Get daily logs grouped and sorted by date
export const getDailyLogs = query({
	args: {
		childId: v.id('children'),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const logs = await ctx.db
			.query('logs')
			.withIndex('by_childId_timestamp', (q) => q.eq('childId', args.childId))
			.order('desc')
			.collect();

		// Group logs by dateStr
		const groups: { [key: string]: { logs: typeof logs; positiveSum: number; negativeSum: number } } = {};

		for (const log of logs) {
			const date = log.dateStr;
			if (!groups[date]) {
				groups[date] = {
					logs: [],
					positiveSum: 0,
					negativeSum: 0,
				};
			}

			groups[date].logs.push(log);
			if (log.value > 0) {
				groups[date].positiveSum += log.value;
			} else {
				groups[date].negativeSum += log.value; // Keeps negative value e.g. -15
			}
		}

		// Format as sorted list
		const result = Object.keys(groups)
			.sort((a, b) => b.localeCompare(a)) // Sort dateStr descending (newest first)
			.map((date) => ({
				dateStr: date,
				logs: groups[date].logs,
				positiveSum: groups[date].positiveSum,
				negativeSum: groups[date].negativeSum,
			}));

		return result;
	},
});
