import { convexAuth, getAuthUserId } from '@convex-dev/auth/server';
import { Anonymous } from '@convex-dev/auth/providers/Anonymous';
import { Password } from '@convex-dev/auth/providers/Password';
import { query } from './_generated/server';
import { AndromoResetOTP, AndromoVerifyOTP } from './email/AndromoOTP';
import { validatePasswordRequirements } from '../shared/auth';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Password({
			verify: AndromoVerifyOTP,
			reset: AndromoResetOTP,
			validatePasswordRequirements,
		}),
		Anonymous,
	],
});

export const loggedInUser = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return null;
		}

		const user = await ctx.db.get(userId);
		return user ?? null;
	},
});
