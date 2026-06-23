import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webStorage: TokenStorage = {
	getItem(key) {
		if (typeof localStorage === 'undefined') {
			return null;
		}
		return localStorage.getItem(key);
	},
	setItem(key, value) {
		if (typeof localStorage === 'undefined') {
			return;
		}
		localStorage.setItem(key, value);
	},
	removeItem(key) {
		if (typeof localStorage === 'undefined') {
			return;
		}
		localStorage.removeItem(key);
	},
};

const secureStoreStorage: TokenStorage = {
	getItem(key) {
		return SecureStore.getItemAsync(key);
	},
	setItem(key, value) {
		return SecureStore.setItemAsync(key, value);
	},
	removeItem(key) {
		return SecureStore.deleteItemAsync(key);
	},
};

export const authStorage =
	Platform.OS === 'web' ? webStorage : secureStoreStorage;
