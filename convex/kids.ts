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
			{ name: 'Zaynab', emoji: '👶', score: 50, unlocked: [] },
			{ name: 'Ibrohim', emoji: '👶', score: 30, unlocked: [] },
		];

		const seeded = [];
		for (const kid of defaults) {
			const id = await ctx.db.insert('children', {
				userId,
				name: kid.name,
				emoji: kid.emoji,
				score: kid.score,
				claimed: [],
				unlocked: kid.unlocked || [],
				createdAt: Date.now(),
			});
			const doc = await ctx.db.get(id);
			if (doc) seeded.push(doc);
		}

		// Also seed default parent settings PIN as "1234"
		const existingSettings = await ctx.db
			.query('parent_settings')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.first();
		if (!existingSettings) {
			await ctx.db.insert('parent_settings', {
				userId,
				pin: '1234',
			});
		}

		return seeded;
	},
});

// Get parent settings (PIN code)
export const getParentSettings = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuth(ctx);
		const settings = await ctx.db
			.query('parent_settings')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.first();

		if (!settings) {
			return { pin: '1234' };
		}
		return settings;
	},
});

// Update parent protection PIN
export const updatePIN = mutation({
	args: {
		newPin: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		if (args.newPin.length !== 4 || isNaN(parseInt(args.newPin, 10))) {
			throw new Error('PIN kod ro’ppa-rost 4 ta raqamdan iborat bo’lishi kerak!');
		}

		const settings = await ctx.db
			.query('parent_settings')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.first();

		if (settings) {
			await ctx.db.patch(settings._id, { pin: args.newPin });
		} else {
			await ctx.db.insert('parent_settings', {
				userId,
				pin: args.newPin,
			});
		}
		return { success: true };
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

		// Clean up pending requests
		const requests = await ctx.db
			.query('pending_requests')
			.withIndex('by_childId', (q) => q.eq('childId', args.childId))
			.collect();
		for (const req of requests) {
			await ctx.db.delete(req._id);
		}

		return { success: true };
	},
});

// 4. Central recordAction mutation - Heart of the points system (Direct Parent updates)
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

// 9. CHILD REQUEST SYSTEM mutations & queries (Section 6)
// Child submits a request
export const createPendingRequest = mutation({
	args: {
		childId: v.id('children'),
		type: v.string(), // "task" | "unlock" | "reward"
		entryId: v.string(),
		title: v.string(),
		value: v.number(),
		emoji: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const child = await ctx.db.get(args.childId);
		if (!child || child.userId !== userId) {
			throw new Error('Bolaning profili topilmadi.');
		}

		// Pre-validations for requesting reward
		if (args.type === 'reward') {
			const cost = Math.abs(args.value);
			if (child.score < cost) {
				return { success: false, message: 'Kechirasiz, sizda ushbu mukofot uchun yetarli ball mavjud emas!' };
			}
			if (child.claimed?.includes(args.entryId)) {
				return { success: false, message: 'Ushbu mukofot allaqachon olingan!' };
			}
		}

		// Pre-validations for lesson unlock
		if (args.type === 'unlock') {
			if (child.unlocked?.includes(args.entryId)) {
				return { success: false, message: 'Bu darslik allaqachon dars o’zlashtirilgan!' };
			}
		}

		// Check for duplicate pending requests to avoid spamming parents
		const existing = await ctx.db
			.query('pending_requests')
			.withIndex('by_childId', (q) => q.eq('childId', args.childId))
			.collect();
		
		const isDuplicated = existing.some((r) => r.entryId === args.entryId && r.type === args.type);
		if (isDuplicated) {
			return { success: false, message: 'Ushbu so’rov allaqachon ota-onaga yuborilgan! ⏳' };
		}

		await ctx.db.insert('pending_requests', {
			userId,
			childId: args.childId,
			type: args.type,
			entryId: args.entryId,
			title: args.title,
			value: args.value,
			emoji: args.emoji,
			timestamp: Date.now(),
		});

		return { success: true, message: 'So’rovingiz ota-onangizga yuborildi! Tasdiqlashlarini kuting. 🙏' };
	},
});

// List all pending requests
export const listPendingRequests = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuth(ctx);
		return await ctx.db
			.query('pending_requests')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.order('desc')
			.collect();
	},
});

// Approve child request (Parent Action)
export const approveRequest = mutation({
	args: {
		requestId: v.id('pending_requests'),
		dateStr: v.string(), // "YYYY-MM-DD"
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request || request.userId !== userId) {
			throw new Error('So’rov topilmadi yoki ruxsat yo’q.');
		}

		const child: any = await ctx.db.get(request.childId as any);
		if (!child || child.userId !== userId) {
			throw new Error('Tegishli bola profili topilmadi.');
		}

		// Apply the logic according to the request type
		const value = request.value;
		let updatedScore = child.score;
		const unlockedList = [...(child.unlocked || [])];
		const claimedList = [...(child.claimed || [])];

		if (request.type === 'reward') {
			const cost = Math.abs(value);
			if (child.score < cost) {
				// Child might have lost points since request
				await ctx.db.delete(args.requestId);
				return { success: false, message: 'Bolaning ballari yetarli emasligi sababli rad etildi.' };
			}
			updatedScore = Math.max(0, child.score - cost);
			if (!claimedList.includes(request.entryId)) {
				claimedList.push(request.entryId);
			}
		} else if (request.type === 'unlock') {
			if (!unlockedList.includes(request.entryId)) {
				unlockedList.push(request.entryId);
				updatedScore = child.score + value;
			}
		} else {
			// Standard Repeatable task
			updatedScore = Math.max(0, child.score + value);
		}

		// Update child profile
		await ctx.db.patch(child._id, {
			score: updatedScore,
			unlocked: unlockedList,
			claimed: claimedList,
		});

		// Insert into history log
		await ctx.db.insert('logs', {
			userId,
			childId: child._id,
			entryId: request.entryId,
			title: request.type === 'reward' ? `Sotib olindi: ${request.title}` : `Tasdiqlandi: ${request.title}`,
			value: request.type === 'reward' ? -Math.abs(value) : value,
			timestamp: Date.now(),
			dateStr: args.dateStr,
		});

		// Delete request from queue
		await ctx.db.delete(args.requestId);

		return { success: true, message: 'Muvaffaqiyatli tasdiqlandi! 👍' };
	},
});

// Reject child request (Parent Action)
export const rejectRequest = mutation({
	args: {
		requestId: v.id('pending_requests'),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request || request.userId !== userId) {
			throw new Error('So’rov topilmadi yoki ruxsat yo’q.');
		}

		await ctx.db.delete(args.requestId);
		return { success: true, message: 'So’rov rad etildi va o’chirildi.' };
	},
});
