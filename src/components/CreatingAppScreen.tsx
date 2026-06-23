import { useEffect, useRef } from 'react';
import {
	Animated,
	Easing,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { colors, spacing } from '@/theme';

export function CreatingAppScreen() {
	const spin = useRef(new Animated.Value(0)).current;
	const pulse = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const spinAnimation = Animated.loop(
			Animated.timing(spin, {
				toValue: 1,
				duration: 4200,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		const pulseAnimation = Animated.loop(
			Animated.sequence([
				Animated.timing(pulse, {
					toValue: 1,
					duration: 1200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulse, {
					toValue: 0,
					duration: 1200,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);

		spinAnimation.start();
		pulseAnimation.start();

		return () => {
			spinAnimation.stop();
			pulseAnimation.stop();
		};
	}, [pulse, spin]);

	const rotation = spin.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg'],
	});
	const scale = pulse.interpolate({
		inputRange: [0, 1],
		outputRange: [0.94, 1.04],
	});

	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			contentContainerStyle={styles.content}
		>
			<View style={styles.card}>
				<View style={styles.logoShell}>
					<Animated.View
						style={[
							styles.logo,
							{
								transform: [{ rotate: rotation }, { scale }],
							},
						]}
					>
						<View style={styles.logoTile} />
						<View style={[styles.logoTile, styles.logoTileAccent]} />
					</Animated.View>
				</View>

				<View style={styles.copy}>
					<Text style={styles.title} selectable>
						Creating your app
					</Text>
					<Text style={styles.subtitle} selectable>
						Your application will be ready soon.
					</Text>
				</View>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	content: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: spacing.lg,
		paddingBottom: spacing.xxl,
	},
	card: {
		alignItems: 'center',
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 28,
		borderWidth: 1,
		gap: spacing.lg,
		maxWidth: 440,
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.xxl,
		width: '100%',
	},
	logoShell: {
		alignItems: 'center',
		backgroundColor: colors.softAccent,
		borderCurve: 'continuous',
		borderRadius: 26,
		height: 80,
		justifyContent: 'center',
		width: 80,
	},
	logo: {
		height: 44,
		position: 'relative',
		width: 44,
	},
	logoTile: {
		backgroundColor: colors.accent,
		borderCurve: 'continuous',
		borderRadius: 12,
		height: 30,
		left: 2,
		position: 'absolute',
		top: 2,
		width: 30,
	},
	logoTileAccent: {
		backgroundColor: colors.accentSecondary,
		left: 12,
		opacity: 0.88,
		top: 12,
	},
	copy: {
		alignItems: 'center',
		gap: spacing.sm,
	},
	title: {
		color: colors.text,
		fontSize: 34,
		fontWeight: '800',
		lineHeight: 40,
		textAlign: 'center',
	},
	subtitle: {
		color: colors.muted,
		fontSize: 16,
		lineHeight: 24,
		textAlign: 'center',
	},
});
