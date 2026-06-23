import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useConvexAuth } from 'convex/react';
import { colors, spacing } from '@/theme';
import { SignInForm } from './SignInForm';

interface AuthGateProps {
	children: ReactNode;
	fallback?: ReactNode;
	loadingFallback?: ReactNode;
}

export function AuthGate({
	children,
	fallback,
	loadingFallback,
}: AuthGateProps) {
	const { isAuthenticated, isLoading } = useConvexAuth();

	if (isLoading) {
		return loadingFallback ?? <AuthLoading />;
	}

	if (!isAuthenticated) {
		return fallback ?? <SignInForm />;
	}

	return <>{children}</>;
}

function AuthLoading() {
	return (
		<View style={styles.loading}>
			<ActivityIndicator color={colors.accent} />
			<Text style={styles.loadingText} selectable>
				Checking session
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	loading: {
		alignItems: 'center',
		flex: 1,
		gap: spacing.sm,
		justifyContent: 'center',
		padding: spacing.lg,
	},
	loadingText: {
		color: colors.muted,
		fontSize: 15,
	},
});
