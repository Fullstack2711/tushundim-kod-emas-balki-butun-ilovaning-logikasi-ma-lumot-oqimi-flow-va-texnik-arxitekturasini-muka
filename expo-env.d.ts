/// <reference types="expo/types" />

declare namespace NodeJS {
	interface ProcessEnv {
		EXPO_PUBLIC_CONVEX_URL?: string;
		VITE_CONVEX_URL?: string;
		CONVEX_URL?: string;
	}
}
