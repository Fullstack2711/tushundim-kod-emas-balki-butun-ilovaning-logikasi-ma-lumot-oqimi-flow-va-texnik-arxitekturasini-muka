import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { authStorage } from '@/lib/auth-storage';
import { convex } from '@/lib/convex';

function AppStack() {
	return (
		<>
			<Stack
				screenOptions={{
					headerLargeTitle: true,
					contentStyle: { backgroundColor: '#f7f8fb' },
				}}
			/>
			<StatusBar style="auto" />
		</>
	);
}

export default function RootLayout() {
	if (!convex) {
		return <AppStack />;
	}

	return (
		<ConvexAuthProvider client={convex} storage={authStorage}>
			<AppStack />
		</ConvexAuthProvider>
	);
}
