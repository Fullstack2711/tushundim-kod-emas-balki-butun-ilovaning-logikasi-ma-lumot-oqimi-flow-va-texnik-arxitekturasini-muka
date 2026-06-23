import { defineSchema, defineTable } from 'convex/server';
import { authTables } from '@convex-dev/auth/server';
import { v } from 'convex/values';

export default defineSchema({
	...authTables,
	
	children: defineTable({
		userId: v.string(),
		name: v.string(),
		emoji: v.string(),
		score: v.number(),
		claimed: v.array(v.string()), // ID list of claimed rewards
		unlocked: v.array(v.string()), // ID list of one-off completed tasks
		createdAt: v.number(),
	}).index('by_userId', ['userId']),

	logs: defineTable({
		userId: v.string(),
		childId: v.string(),
		entryId: v.string(), // ID of task/penalty/reward
		title: v.string(),
		value: v.number(), // positive or negative points
		timestamp: v.number(),
		dateStr: v.string(), // "YYYY-MM-DD"
	})
	.index('by_userId', ['userId'])
	.index('by_childId', ['childId'])
	.index('by_childId_date', ['childId', 'dateStr'])
	.index('by_childId_timestamp', ['childId', 'timestamp']),

	custom_items: defineTable({
		userId: v.string(),
		childId: v.string(),
		type: v.string(), // "task" | "reward" | "penalty"
		title: v.string(),
		value: v.number(), // positive for tasks, negative for penalties, positive cost for rewards
		emoji: v.string(),
		timestamp: v.number(),
	})
	.index('by_userId', ['userId'])
	.index('by_childId', ['childId']),
});
