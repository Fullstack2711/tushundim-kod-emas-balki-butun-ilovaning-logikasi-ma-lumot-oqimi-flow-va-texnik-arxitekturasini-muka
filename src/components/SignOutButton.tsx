import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth } from 'convex/react';
import { colors, spacing } from '@/theme';

export function SignOutButton() {
	const { isAuthenticated } = useConvexAuth();
	const { signOut } = useAuthActions();
	const [submitting, setSubmitting] = useState(false);

	if (!isAuthenticated) {
		return null;
	}

	const handleSignOut = async () => {
		setSubmitting(true);
		try {
			await signOut();
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Pressable
			accessibilityRole="button"
			disabled={submitting}
			onPress={() => void handleSignOut()}
			style={({ pressed }) => [
				styles.button,
				pressed ? styles.buttonPressed : null,
				submitting ? styles.buttonDisabled : null,
			]}
		>
			<Text style={styles.buttonText}>
				{submitting ? 'Signing out...' : 'Sign out'}
			</Text>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		alignItems: 'center',
		alignSelf: 'flex-start',
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 14,
		borderWidth: 1,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	buttonPressed: {
		opacity: 0.75,
	},
	buttonDisabled: {
		opacity: 0.55,
	},
	buttonText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
});
