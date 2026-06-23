import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import {
	PASSWORD_MIN_LENGTH,
	PASSWORD_TOO_SHORT_MESSAGE,
} from '@shared/auth';
import { colors, spacing } from '@/theme';

type FormStep =
	| 'signIn'
	| 'signUp'
	| 'verifyEmail'
	| 'forgotPassword'
	| 'resetPassword';
type FieldErrorKey = 'email' | 'password' | 'newPassword' | 'otp';
type FieldErrors = Partial<Record<FieldErrorKey, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStepTitle(step: FormStep) {
	switch (step) {
		case 'signIn':
			return 'Welcome back';
		case 'signUp':
			return 'Create account';
		case 'verifyEmail':
			return 'Verify your email';
		case 'forgotPassword':
			return 'Reset password';
		case 'resetPassword':
			return 'Choose a new password';
	}
}

function getSubmitLabel(step: FormStep) {
	switch (step) {
		case 'signIn':
			return 'Sign in';
		case 'signUp':
			return 'Sign up';
		case 'verifyEmail':
			return 'Verify';
		case 'forgotPassword':
			return 'Send reset code';
		case 'resetPassword':
			return 'Reset password';
	}
}

function normalizeAuthError(error: unknown, step: FormStep) {
	const message = error instanceof Error ? error.message : String(error);
	const lowerMessage = message.toLowerCase();

	if (
		lowerMessage.includes('rate_limit') ||
		message.includes('429') ||
		lowerMessage.includes('toomanyfailedattempts')
	) {
		return 'Too many attempts. Please wait a few minutes before trying again.';
	}

	if (
		lowerMessage.includes('invalid password') ||
		lowerMessage.includes('password requirement') ||
		lowerMessage.includes('password must be at least')
	) {
		return PASSWORD_TOO_SHORT_MESSAGE;
	}

	if (
		lowerMessage.includes('verify code') ||
		lowerMessage.includes('verification code') ||
		lowerMessage.includes('invalid code') ||
		lowerMessage.includes('expired')
	) {
		return 'Invalid or expired code. Please try again or request a new one.';
	}

	if (
		lowerMessage.includes('already exists') ||
		lowerMessage.includes('unique') ||
		lowerMessage.includes('duplicate')
	) {
		return 'An account with this email already exists. Please sign in instead.';
	}

	if (message.includes('Failed to send')) {
		return 'Could not send email. Please try again later.';
	}

	if (
		lowerMessage.includes('not configured') ||
		message.includes('SITE_URL') ||
		lowerMessage.includes('not enabled')
	) {
		return 'Email service is not available yet. Please try again later.';
	}

	if (step === 'signIn') {
		return 'Could not sign in. Please check your credentials.';
	}

	if (step === 'signUp') {
		return 'Could not create account. Please try again.';
	}

	return message || 'Something went wrong. Please try again.';
}

export function SignInForm() {
	const { signIn } = useAuthActions();
	const [step, setStep] = useState<FormStep>('signUp');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [otp, setOtp] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [formMessage, setFormMessage] = useState<string | null>(null);

	useEffect(() => {
		if (resendCooldown <= 0) {
			return;
		}

		const timer = setTimeout(() => {
			setResendCooldown((current) => Math.max(0, current - 1));
		}, 1000);

		return () => clearTimeout(timer);
	}, [resendCooldown]);

	const clearFieldError = useCallback((field: FieldErrorKey) => {
		setFieldErrors((current) =>
			current[field] ? { ...current, [field]: undefined } : current,
		);
		setFormError(null);
	}, []);

	const resetSensitiveFields = useCallback(() => {
		setPassword('');
		setNewPassword('');
		setOtp('');
		setSubmitting(false);
		setFieldErrors({});
		setFormError(null);
	}, []);

	const switchStep = useCallback(
		(nextStep: FormStep) => {
			resetSensitiveFields();
			setFormMessage(null);
			setStep(nextStep);
		},
		[resetSensitiveFields],
	);

	const validateCurrentStep = useCallback(() => {
		const nextErrors: FieldErrors = {};
		const normalizedEmail = email.trim();

		if (step === 'signIn' || step === 'signUp' || step === 'forgotPassword') {
			if (!normalizedEmail) {
				nextErrors.email = 'Email is required.';
			} else if (!EMAIL_PATTERN.test(normalizedEmail)) {
				nextErrors.email = 'Enter a valid email address.';
			}
		}

		if (step === 'signIn' || step === 'signUp') {
			if (!password) {
				nextErrors.password = 'Password is required.';
			} else if (step === 'signUp' && password.length < PASSWORD_MIN_LENGTH) {
				nextErrors.password = PASSWORD_TOO_SHORT_MESSAGE;
			}
		}

		if (step === 'verifyEmail' || step === 'resetPassword') {
			if (otp.length !== 6) {
				nextErrors.otp = 'Enter the 6-digit code from your email.';
			}
		}

		if (step === 'resetPassword') {
			if (!newPassword) {
				nextErrors.newPassword = 'New password is required.';
			} else if (newPassword.length < PASSWORD_MIN_LENGTH) {
				nextErrors.newPassword = PASSWORD_TOO_SHORT_MESSAGE;
			}
		}

		setFieldErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}, [email, newPassword, otp, password, step]);

	const handleSubmit = useCallback(async () => {
		if (!validateCurrentStep()) {
			return;
		}

		setSubmitting(true);
		setFormError(null);
		setFormMessage(null);
		const normalizedEmail = email.trim();

		try {
			switch (step) {
				case 'signIn':
					await signIn('password', {
						email: normalizedEmail,
						password,
						flow: 'signIn',
					});
					break;

				case 'signUp':
					await signIn('password', {
						email: normalizedEmail,
						password,
						flow: 'signUp',
					});
					resetSensitiveFields();
					setEmail(normalizedEmail);
					setStep('verifyEmail');
					setResendCooldown(60);
					setFormMessage('Check your email for a verification code.');
					return;

				case 'verifyEmail':
					await signIn('password', {
						email: normalizedEmail,
						code: otp,
						flow: 'email-verification',
					});
					resetSensitiveFields();
					setFormMessage('Email verified.');
					break;

				case 'forgotPassword':
					await signIn('password', {
						email: normalizedEmail,
						flow: 'reset',
					});
					resetSensitiveFields();
					setEmail(normalizedEmail);
					setStep('resetPassword');
					setResendCooldown(60);
					setFormMessage('Check your email for a reset code.');
					return;

				case 'resetPassword':
					await signIn('password', {
						email: normalizedEmail,
						code: otp,
						newPassword,
						flow: 'reset-verification',
					});
					resetSensitiveFields();
					setStep('signIn');
					setFormMessage('Password reset successfully. Sign in to continue.');
					return;
			}
		} catch (error) {
			const message = normalizeAuthError(error, step);
			if (message === PASSWORD_TOO_SHORT_MESSAGE) {
				setFieldErrors((current) => ({
					...current,
					[step === 'resetPassword' ? 'newPassword' : 'password']: message,
				}));
			} else if (
				message.includes('code') ||
				message.includes('verification')
			) {
				setFieldErrors((current) => ({ ...current, otp: message }));
			} else {
				setFormError(message);
			}
		} finally {
			setSubmitting(false);
		}
	}, [
		email,
		newPassword,
		otp,
		password,
		resetSensitiveFields,
		signIn,
		step,
		validateCurrentStep,
	]);

	const handleResendCode = useCallback(async () => {
		if (resendCooldown > 0 || submitting) {
			return;
		}

		setSubmitting(true);
		setFormError(null);
		setFormMessage(null);

		try {
			await signIn('password', {
				email: email.trim(),
				flow: step === 'verifyEmail' ? 'email-verification' : 'reset',
			});
			setResendCooldown(60);
			setFormMessage('New code sent to your email.');
		} catch (error) {
			setFormError(normalizeAuthError(error, step));
		} finally {
			setSubmitting(false);
		}
	}, [email, resendCooldown, signIn, step, submitting]);

	const handleAnonymousSignIn = useCallback(async () => {
		setSubmitting(true);
		setFormError(null);
		setFormMessage(null);

		try {
			await signIn('anonymous');
		} catch (error) {
			setFormError(normalizeAuthError(error, step));
		} finally {
			setSubmitting(false);
		}
	}, [signIn, step]);

	const showEmail =
		step === 'signIn' || step === 'signUp' || step === 'forgotPassword';
	const showPassword = step === 'signIn' || step === 'signUp';
	const showOtp = step === 'verifyEmail' || step === 'resetPassword';
	const showNewPassword = step === 'resetPassword';

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<Text style={styles.title} selectable>
					{getStepTitle(step)}
				</Text>
				<Text style={styles.subtitle} selectable>
					{step === 'verifyEmail'
						? 'Enter the 6-digit code sent to your email.'
						: step === 'resetPassword'
							? 'Enter your reset code and choose a new password.'
							: 'Use your email and password, or continue as a guest.'}
				</Text>
			</View>

			{showEmail ? (
				<View style={styles.field}>
					<TextInput
						autoCapitalize="none"
						autoComplete="email"
						autoCorrect={false}
						editable={!submitting}
						inputMode="email"
						keyboardType="email-address"
						onChangeText={(value) => {
							setEmail(value);
							clearFieldError('email');
						}}
						onSubmitEditing={() => void handleSubmit()}
						placeholder="Email"
						placeholderTextColor={colors.muted}
						style={[styles.input, fieldErrors.email ? styles.inputError : null]}
						value={email}
					/>
					{fieldErrors.email ? (
						<Text style={styles.errorText} selectable>
							{fieldErrors.email}
						</Text>
					) : null}
				</View>
			) : null}

			{showPassword ? (
				<View style={styles.field}>
					<TextInput
						autoComplete={step === 'signUp' ? 'new-password' : 'password'}
						editable={!submitting}
						onChangeText={(value) => {
							setPassword(value);
							clearFieldError('password');
						}}
						onSubmitEditing={() => void handleSubmit()}
						placeholder="Password"
						placeholderTextColor={colors.muted}
						secureTextEntry
						style={[
							styles.input,
							fieldErrors.password ? styles.inputError : null,
						]}
						value={password}
					/>
					{fieldErrors.password ? (
						<Text style={styles.errorText} selectable>
							{fieldErrors.password}
						</Text>
					) : step === 'signUp' ? (
						<Text style={styles.helperText} selectable>
							Minimum {PASSWORD_MIN_LENGTH} characters
						</Text>
					) : null}
				</View>
			) : null}

			{showOtp ? (
				<View style={styles.field}>
					<TextInput
						editable={!submitting}
						inputMode="numeric"
						keyboardType="number-pad"
						maxLength={6}
						onChangeText={(value) => {
							setOtp(value.replace(/\D/g, '').slice(0, 6));
							clearFieldError('otp');
						}}
						onSubmitEditing={() => void handleSubmit()}
						placeholder="000000"
						placeholderTextColor={colors.muted}
						style={[styles.input, styles.otpInput, fieldErrors.otp ? styles.inputError : null]}
						value={otp}
					/>
					{fieldErrors.otp ? (
						<Text style={styles.errorText} selectable>
							{fieldErrors.otp}
						</Text>
					) : null}
				</View>
			) : null}

			{showNewPassword ? (
				<View style={styles.field}>
					<TextInput
						autoComplete="new-password"
						editable={!submitting}
						onChangeText={(value) => {
							setNewPassword(value);
							clearFieldError('newPassword');
						}}
						onSubmitEditing={() => void handleSubmit()}
						placeholder="New password"
						placeholderTextColor={colors.muted}
						secureTextEntry
						style={[
							styles.input,
							fieldErrors.newPassword ? styles.inputError : null,
						]}
						value={newPassword}
					/>
					{fieldErrors.newPassword ? (
						<Text style={styles.errorText} selectable>
							{fieldErrors.newPassword}
						</Text>
					) : (
						<Text style={styles.helperText} selectable>
							Minimum {PASSWORD_MIN_LENGTH} characters
						</Text>
					)}
				</View>
			) : null}

			{formError ? (
				<Text style={styles.formError} selectable>
					{formError}
				</Text>
			) : null}
			{formMessage ? (
				<Text style={styles.formMessage} selectable>
					{formMessage}
				</Text>
			) : null}

			<Pressable
				accessibilityRole="button"
				disabled={submitting}
				onPress={() => void handleSubmit()}
				style={({ pressed }) => [
					styles.primaryButton,
					pressed ? styles.buttonPressed : null,
					submitting ? styles.buttonDisabled : null,
				]}
			>
				{submitting ? (
					<ActivityIndicator color="#ffffff" />
				) : (
					<Text style={styles.primaryButtonText}>{getSubmitLabel(step)}</Text>
				)}
			</Pressable>

			{showOtp ? (
				<Pressable
					accessibilityRole="button"
					disabled={submitting || resendCooldown > 0}
					onPress={() => void handleResendCode()}
					style={({ pressed }) => [
						styles.secondaryButton,
						pressed ? styles.buttonPressed : null,
						submitting || resendCooldown > 0 ? styles.buttonDisabled : null,
					]}
				>
					<Text style={styles.secondaryButtonText}>
						{resendCooldown > 0
							? `Resend code (${resendCooldown}s)`
							: 'Resend code'}
					</Text>
				</Pressable>
			) : null}

			{step === 'signIn' || step === 'signUp' ? (
				<View style={styles.linkRow}>
					<Text style={styles.mutedText}>
						{step === 'signIn'
							? "Don't have an account?"
							: 'Already have an account?'}
					</Text>
					<Pressable
						accessibilityRole="button"
						disabled={submitting}
						onPress={() => switchStep(step === 'signIn' ? 'signUp' : 'signIn')}
					>
						<Text style={styles.linkText}>
							{step === 'signIn' ? 'Sign up' : 'Sign in'}
						</Text>
					</Pressable>
				</View>
			) : null}

			{step === 'signIn' ? (
				<Pressable
					accessibilityRole="button"
					disabled={submitting}
					onPress={() => switchStep('forgotPassword')}
				>
					<Text style={styles.linkText}>Forgot password?</Text>
				</Pressable>
			) : null}

			{step === 'forgotPassword' ||
			step === 'verifyEmail' ||
			step === 'resetPassword' ? (
				<Pressable
					accessibilityRole="button"
					disabled={submitting}
					onPress={() => switchStep('signIn')}
				>
					<Text style={styles.linkText}>Back to sign in</Text>
				</Pressable>
			) : null}

			{step === 'signIn' || step === 'signUp' ? (
				<>
					<View style={styles.divider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>or</Text>
						<View style={styles.dividerLine} />
					</View>
					<Pressable
						accessibilityRole="button"
						disabled={submitting}
						onPress={() => void handleAnonymousSignIn()}
						style={({ pressed }) => [
							styles.guestButton,
							pressed ? styles.buttonPressed : null,
							submitting ? styles.buttonDisabled : null,
						]}
					>
						<Text style={styles.guestButtonText}>Continue as guest</Text>
					</Pressable>
				</>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 24,
		borderWidth: 1,
		gap: spacing.md,
		maxWidth: 440,
		padding: spacing.lg,
		width: '100%',
	},
	header: {
		gap: spacing.xs,
	},
	title: {
		color: colors.text,
		fontSize: 26,
		fontWeight: '800',
		lineHeight: 32,
		textAlign: 'center',
	},
	subtitle: {
		color: colors.muted,
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
	},
	field: {
		gap: spacing.xs,
	},
	input: {
		backgroundColor: colors.background,
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1,
		color: colors.text,
		fontSize: 16,
		minHeight: 52,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	inputError: {
		borderColor: '#dc2626',
	},
	otpInput: {
		fontSize: 22,
		fontVariant: ['tabular-nums'],
		fontWeight: '800',
		textAlign: 'center',
	},
	helperText: {
		color: colors.muted,
		fontSize: 13,
		lineHeight: 18,
	},
	errorText: {
		color: '#dc2626',
		fontSize: 13,
		lineHeight: 18,
	},
	formError: {
		backgroundColor: '#fef2f2',
		borderColor: '#fecaca',
		borderCurve: 'continuous',
		borderRadius: 14,
		borderWidth: 1,
		color: '#991b1b',
		fontSize: 14,
		lineHeight: 20,
		padding: spacing.sm,
	},
	formMessage: {
		backgroundColor: '#eefdf6',
		borderColor: '#bbf7d0',
		borderCurve: 'continuous',
		borderRadius: 14,
		borderWidth: 1,
		color: '#166534',
		fontSize: 14,
		lineHeight: 20,
		padding: spacing.sm,
	},
	primaryButton: {
		alignItems: 'center',
		backgroundColor: colors.accent,
		borderCurve: 'continuous',
		borderRadius: 16,
		justifyContent: 'center',
		minHeight: 52,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '800',
	},
	secondaryButton: {
		alignItems: 'center',
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1,
		justifyContent: 'center',
		minHeight: 48,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	guestButton: {
		alignItems: 'center',
		backgroundColor: colors.background,
		borderColor: colors.border,
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1,
		justifyContent: 'center',
		minHeight: 50,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
	},
	guestButtonText: {
		color: colors.text,
		fontSize: 15,
		fontWeight: '700',
	},
	buttonPressed: {
		opacity: 0.76,
	},
	buttonDisabled: {
		opacity: 0.55,
	},
	linkRow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
		justifyContent: 'center',
	},
	mutedText: {
		color: colors.muted,
		fontSize: 14,
	},
	linkText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '800',
		textAlign: 'center',
	},
	divider: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.sm,
	},
	dividerLine: {
		backgroundColor: colors.border,
		flex: 1,
		height: 1,
	},
	dividerText: {
		color: colors.muted,
		fontSize: 13,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
});
