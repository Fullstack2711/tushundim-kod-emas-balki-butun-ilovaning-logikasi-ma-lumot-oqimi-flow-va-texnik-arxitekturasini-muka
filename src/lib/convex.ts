import { ConvexReactClient } from 'convex/react';

const convexUrl =
	process.env.EXPO_PUBLIC_CONVEX_URL ??
	process.env.VITE_CONVEX_URL ??
	process.env.CONVEX_URL;

export const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function hasConvexConfig(): boolean {
	return Boolean(convexUrl);
}
