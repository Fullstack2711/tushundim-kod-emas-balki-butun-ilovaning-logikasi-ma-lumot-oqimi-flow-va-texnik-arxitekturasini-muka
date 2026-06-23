import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	TouchableOpacity,
} from 'react-native';
import { useAuthActions } from '@convex-dev/auth/react';
import {
	PASSWORD_MIN_LENGTH,
	PASSWORD_TOO_SHORT_MESSAGE,
} from '@shared/auth';
import { colors, spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

type FormStep =
	| 'intro' // Splash screen first
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
		case 'intro':
			return 'Kids Points Tizimi';
		case 'signIn':
			return 'Xush kelibsiz';
		case 'signUp':
			return 'Hisob yaratish';
		case 'verifyEmail':
			return 'Emailni tasdiqlang';
		case 'forgotPassword':
			return 'Parolni tiklash';
		case 'resetPassword':
			return 'Yangi parol tanlang';
	}
}

function getSubmitLabel(step: FormStep) {
	switch (step) {
		case 'signIn':
			return 'Kirish';
		case 'signUp':
			return 'Ro’yxatdan o’tish';
		case 'verifyEmail':
			return 'Kodni tasdiqlash';
		case 'forgotPassword':
			return 'Tiklash kodini yuborish';
		case 'resetPassword':
			return 'Parolni yangilash';
		default:
			return 'Davom etish';
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
		return 'Urinishlar ko’payib ketdi. Iltimos, bir necha daqiqa kutib qaytadan urining.';
	}

	if (
		lowerMessage.includes('invalid password') ||
		lowerMessage.includes('password requirement') ||
		lowerMessage.includes('password must be at least')
	) {
		return `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgidan iborat bo’lishi shart!`;
	}

	if (
		lowerMessage.includes('verify code') ||
		lowerMessage.includes('verification code') ||
		lowerMessage.includes('invalid code') ||
		lowerMessage.includes('expired')
	) {
		return 'Xato yoki muddati o’tgan tasdiqlash kodi. Iltimos, qayta urining.';
	}

	if (
		lowerMessage.includes('already exists') ||
		lowerMessage.includes('unique') ||
		lowerMessage.includes('duplicate')
	) {
		return 'Ushbu email bilan hisob allaqachon mavjud. Kirish bo’limiga o’ting.';
	}

	if (message.includes('Failed to send')) {
		return 'Email jo’natishda xatolik yuz berdi. Tarmoqni tekshiring.';
	}

	if (step === 'signIn') {
		return 'Email yoki parol xato kiritildi.';
	}

	if (step === 'signUp') {
		return 'Hisob yaratib bo’lmadi. Ma’lumotlarni tekshiring.';
	}

	return 'Tizimda kutilmagan xatolik. Iltimos, keyinroq qayta urining.';
}

export function SignInForm() {
	const { signIn } = useAuthActions();
	const [step, setStep] = useState<FormStep>('intro'); // Default to intro splash
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
			current[field] ? { ...current, [field]: undefined } : current
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
		[resetSensitiveFields]
	);

	const validateCurrentStep = useCallback(() => {
		const nextErrors: FieldErrors = {};
		const normalizedEmail = email.trim();

		if (step === 'signIn' || step === 'signUp' || step === 'forgotPassword') {
			if (!normalizedEmail) {
				nextErrors.email = 'Email manzili kiritilishi shart.';
			} else if (!EMAIL_PATTERN.test(normalizedEmail)) {
				nextErrors.email = 'To’g’ri email manzili kiriting.';
			}
		}

		if (step === 'signIn' || step === 'signUp') {
			if (!password) {
				nextErrors.password = 'Parol kiritilishi shart.';
			} else if (step === 'signUp' && password.length < PASSWORD_MIN_LENGTH) {
				nextErrors.password = `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgidan iborat bo’lishi shart.`;
			}
		}

		if (step === 'verifyEmail' || step === 'resetPassword') {
			if (otp.length !== 6) {
				nextErrors.otp = 'Emailingizga yuborilgan 6 xonali tasdiqlash kodini kiriting.';
			}
		}

		if (step === 'resetPassword') {
			if (!newPassword) {
				nextErrors.newPassword = 'Yangi parol kiritilishi shart.';
			} else if (newPassword.length < PASSWORD_MIN_LENGTH) {
				nextErrors.newPassword = `Parol kamida ${PASSWORD_MIN_LENGTH} ta belgidan iborat bo’lishi shart.`;
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
					setFormMessage('Tasdiqlash kodi email manzilingizga yuborildi.');
					return;

				case 'verifyEmail':
					await signIn('password', {
						email: normalizedEmail,
						code: otp,
						flow: 'email-verification',
					});
					resetSensitiveFields();
					setFormMessage('Hisobingiz muvaffaqiyatli tasdiqlandi!');
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
					setFormMessage('Parolni tiklash kodi email manzilingizga yuborildi.');
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
					setFormMessage('Parol yangilandi. Tizimga kirishingiz mumkin.');
					return;
			}
		} catch (error) {
			const message = normalizeAuthError(error, step);
			if (message.includes('belgidan iborat')) {
				setFieldErrors((current) => ({
					...current,
					[step === 'resetPassword' ? 'newPassword' : 'password']: message,
				}));
			} else if (
				message.includes('kod') ||
				message.includes('tasdiqlash')
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
			setFormMessage('Yangi tasdiqlash kodi email manzilingizga yuborildi.');
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

	// Render Splash Intro screen (Section 1 of request)
	if (step === 'intro') {
		return (
			<View style={styles.introContainer}>
				<ScrollView contentContainerStyle={styles.introScroll}>
					<View style={styles.introCard}>
						{/* Illustrative big emoji icon */}
						<View style={styles.introIconContainer}>
							<Text style={styles.introIconEmoji}>🏆</Text>
							<View style={styles.sparkleDecoration}>
								<Ionicons name="sparkles" size={24} color="#f59e0b" />
							</View>
						</View>

						<Text style={styles.introTitle}>Kids Points</Text>
						<Text style={styles.introSubtitle}>
							Bolalar uchun Islomiy va Kundalik odatlar ball tizimi
						</Text>

						<Text style={styles.introDescription}>
							Farzandlaringizni yaxshi amallarga, darsliklar va namozga qiziqtiring. Har bir yaxshi amal uchun ball bering, to’plangan ballarni esa real mukofotlarga almashtiring!
						</Text>

						{/* Highlights */}
						<View style={styles.highlightRow}>
							<View style={styles.highlightDot}>
								<Ionicons name="checkmark-circle" size={16} color="#10b981" />
							</View>
							<Text style={styles.highlightText}>Oila a’zolari uchun rollar tizimi</Text>
						</View>

						<View style={styles.highlightRow}>
							<View style={styles.highlightDot}>
								<Ionicons name="checkmark-circle" size={16} color="#10b981" />
							</View>
							<Text style={styles.highlightText}>Namoz, Alifbo va Tajvid bo’limlari</Text>
						</View>

						<View style={styles.highlightRow}>
							<View style={styles.highlightDot}>
								<Ionicons name="checkmark-circle" size={16} color="#10b981" />
							</View>
							<Text style={styles.highlightText}>Ota-ona tasdiqlash paneli va PIN-kod</Text>
						</View>

						{/* Action Buttons */}
						<TouchableOpacity
							onPress={() => switchStep('signUp')}
							style={[styles.primaryButton, { marginTop: spacing.md }]}
						>
							<Text style={styles.primaryButtonText}>Boshlash 🚀</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => switchStep('signIn')}
							style={styles.introSecondaryButton}
						>
							<Text style={styles.introSecondaryButtonText}>Menda allaqachon hisob bor</Text>
						</TouchableOpacity>

						<View style={styles.divider}>
							<View style={styles.dividerLine} />
							<Text style={styles.dividerText}>Yoki</Text>
							<View style={styles.dividerLine} />
						</View>

						<TouchableOpacity
							onPress={handleAnonymousSignIn}
							style={styles.guestButton}
						>
							<Text style={styles.guestButtonText}>Mehmon bo’lib davom etish 👤</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			</View>
		);
	}

	const showEmail =
		step === 'signIn' || step === 'signUp' || step === 'forgotPassword';
	const showPassword = step === 'signIn' || step === 'signUp';
	const showOtp = step === 'verifyEmail' || step === 'resetPassword';
	const showNewPassword = step === 'resetPassword';

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.avoidingContainer}
		>
			<ScrollView contentContainerStyle={styles.authScroll}>
				<View style={styles.card}>
					<View style={styles.header}>
						<Text style={styles.title} selectable>
							{getStepTitle(step)}
						</Text>
						<Text style={styles.subtitle} selectable>
							{step === 'verifyEmail'
								? 'Emailingizga yuborilgan 6 xonali tasdiqlash kodini kiriting.'
								: step === 'resetPassword'
									? 'Tiklash kodini hamda yangi parolni kiriting.'
									: step === 'forgotPassword'
										? 'Hisob emailingizni kiriting. Biz sizga tiklash kodini yuboramiz.'
										: 'Ota-ona yoki farzand sifatida davom etish uchun hisobingizga kiring.'}
						</Text>
					</View>

					{showEmail ? (
						<View style={styles.field}>
							<Text style={styles.inputLabelText}>Email Manzili</Text>
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
								placeholder="Masalan: salom@bolajon.uz"
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
							<Text style={styles.inputLabelText}>Parol</Text>
							<TextInput
								autoComplete={step === 'signUp' ? 'new-password' : 'password'}
								editable={!submitting}
								onChangeText={(value) => {
									setPassword(value);
									clearFieldError('password');
								}}
								onSubmitEditing={() => void handleSubmit()}
								placeholder="Parol"
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
									Kamida {PASSWORD_MIN_LENGTH} ta belgi kiriting
								</Text>
							) : null}
						</View>
					) : null}

					{showOtp ? (
						<View style={styles.field}>
							<Text style={styles.inputLabelText}>Tasdiqlash kodi</Text>
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
							<Text style={styles.inputLabelText}>Yangi parol</Text>
							<TextInput
								autoComplete="new-password"
								editable={!submitting}
								onChangeText={(value) => {
									setNewPassword(value);
									clearFieldError('newPassword');
								}}
								onSubmitEditing={() => void handleSubmit()}
								placeholder="Yangi parol"
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
									Kamida {PASSWORD_MIN_LENGTH} ta belgi kiriting
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
									? `Kodni qayta yuborish (${resendCooldown}s)`
									: 'Kodni qayta yuborish'}
							</Text>
						</Pressable>
					) : null}

					{step === 'signIn' || step === 'signUp' ? (
						<View style={styles.linkRow}>
							<Text style={styles.mutedText}>
								{step === 'signIn'
									? 'Sizda hali hisob yo’qmi?'
									: 'Hisobingiz allaqachon bormi?'}
							</Text>
							<Pressable
								accessibilityRole="button"
								disabled={submitting}
								onPress={() => switchStep(step === 'signIn' ? 'signUp' : 'signIn')}
							>
								<Text style={styles.linkText}>
									{step === 'signIn' ? 'Ro’yxatdan o’tish' : 'Tizimga kirish'}
								</Text>
							</Pressable>
						</View>
					) : null}

					{step === 'signIn' ? (
						<Pressable
							accessibilityRole="button"
							disabled={submitting}
							onPress={() => switchStep('forgotPassword')}
							style={{ alignSelf: 'center', marginTop: spacing.xs }}
						>
							<Text style={styles.linkText}>Parolni unutdingizmi?</Text>
						</Pressable>
					) : null}

					{step === 'forgotPassword' ||
					step === 'verifyEmail' ||
					step === 'resetPassword' ? (
						<Pressable
							accessibilityRole="button"
							disabled={submitting}
							onPress={() => switchStep('signIn')}
							style={{ alignSelf: 'center', marginTop: spacing.xs }}
						>
							<Text style={styles.linkText}>Orqaga qaytish</Text>
						</Pressable>
					) : null}

					<View style={styles.divider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>Yoki</Text>
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
						<Text style={styles.guestButtonText}>Mehmon bo’lib davom etish 👤</Text>
					</Pressable>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	avoidingContainer: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	authScroll: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: spacing.md,
	},
	introContainer: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	introScroll: {
		flexGrow: 1,
		justifyContent: 'center',
		padding: spacing.md,
	},
	introCard: {
		backgroundColor: colors.surface,
		borderRadius: 28,
		padding: spacing.xl,
		alignItems: 'center',
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.08,
		shadowRadius: 20,
		elevation: 5,
		borderWidth: 1,
		borderColor: '#e2e8f0',
		width: '100%',
		maxWidth: 440,
		alignSelf: 'center',
	},
	introIconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		backgroundColor: '#fffbeb',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: spacing.md,
		position: 'relative',
		shadowColor: '#f59e0b',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
		elevation: 2,
	},
	introIconEmoji: {
		fontSize: 54,
	},
	sparkleDecoration: {
		position: 'absolute',
		top: -4,
		right: -4,
	},
	introTitle: {
		fontSize: 28,
		fontWeight: '900',
		color: colors.text,
		letterSpacing: -0.5,
	},
	introSubtitle: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.muted,
		textAlign: 'center',
		marginTop: 4,
		paddingHorizontal: spacing.sm,
	},
	introDescription: {
		fontSize: 13,
		color: colors.muted,
		textAlign: 'center',
		lineHeight: 18,
		marginVertical: spacing.lg,
		backgroundColor: '#f8fafc',
		padding: spacing.md,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#f1f5f9',
	},
	highlightRow: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		marginBottom: 8,
		paddingHorizontal: spacing.xs,
	},
	highlightDot: {
		marginRight: 8,
	},
	highlightText: {
		fontSize: 13,
		color: colors.text,
		fontWeight: '600',
	},
	introSecondaryButton: {
		paddingVertical: 12,
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.sm,
	},
	introSecondaryButtonText: {
		color: colors.accent,
		fontSize: 14,
		fontWeight: '700',
	},
	card: {
		alignSelf: 'center',
		backgroundColor: colors.surface,
		borderColor: '#e2e8f0',
		borderCurve: 'continuous',
		borderRadius: 28,
		borderWidth: 1,
		gap: spacing.md,
		maxWidth: 440,
		padding: spacing.xl,
		width: '100%',
		shadowColor: '#0f172a',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.08,
		shadowRadius: 20,
		elevation: 5,
	},
	header: {
		gap: spacing.xs,
		marginBottom: spacing.xs,
	},
	title: {
		color: colors.text,
		fontSize: 24,
		fontWeight: '900',
		lineHeight: 30,
		textAlign: 'center',
	},
	subtitle: {
		color: colors.muted,
		fontSize: 13,
		lineHeight: 18,
		textAlign: 'center',
	},
	field: {
		gap: spacing.xs,
	},
	inputLabelText: {
		fontSize: 12,
		fontWeight: '700',
		color: colors.text,
		marginBottom: 2,
		marginLeft: 2,
	},
	input: {
		backgroundColor: '#f8fafc',
		borderColor: '#e2e8f0',
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1.5,
		color: colors.text,
		fontSize: 14,
		minHeight: 52,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	inputError: {
		borderColor: '#ef4444',
	},
	otpInput: {
		fontSize: 24,
		fontVariant: ['tabular-nums'],
		fontWeight: '900',
		letterSpacing: 4,
		textAlign: 'center',
		backgroundColor: '#eff6ff',
		borderColor: colors.accent,
	},
	helperText: {
		color: colors.muted,
		fontSize: 12,
		lineHeight: 16,
		marginLeft: 2,
	},
	errorText: {
		color: '#ef4444',
		fontSize: 12,
		lineHeight: 16,
		marginLeft: 2,
		fontWeight: '500',
	},
	formError: {
		backgroundColor: '#fef2f2',
		borderColor: '#fca5a5',
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1.5,
		color: '#b91c1c',
		fontSize: 13,
		lineHeight: 18,
		padding: spacing.md,
		fontWeight: '600',
	},
	formMessage: {
		backgroundColor: '#ecfdf5',
		borderColor: '#a7f3d0',
		borderCurve: 'continuous',
		borderRadius: 16,
		borderWidth: 1.5,
		color: '#047857',
		fontSize: 13,
		lineHeight: 18,
		padding: spacing.md,
		fontWeight: '600',
	},
	primaryButton: {
		alignItems: 'center',
		backgroundColor: colors.accent,
		borderCurve: 'continuous',
		borderRadius: 18,
		justifyContent: 'center',
		minHeight: 52,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		width: '100%',
		shadowColor: '#2563eb',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 6,
		elevation: 3,
	},
	primaryButtonText: {
		color: '#ffffff',
		fontSize: 15,
		fontWeight: '800',
	},
	secondaryButton: {
		alignItems: 'center',
		borderColor: '#cbd5e1',
		borderCurve: 'continuous',
		borderRadius: 18,
		borderWidth: 1.5,
		justifyContent: 'center',
		minHeight: 52,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		width: '100%',
	},
	secondaryButtonText: {
		color: colors.text,
		fontSize: 14,
		fontWeight: '700',
	},
	guestButton: {
		alignItems: 'center',
		backgroundColor: '#f1f5f9',
		borderColor: '#e2e8f0',
		borderCurve: 'continuous',
		borderRadius: 18,
		borderWidth: 1,
		justifyContent: 'center',
		minHeight: 52,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		width: '100%',
	},
	guestButtonText: {
		color: '#334155',
		fontSize: 14,
		fontWeight: '700',
	},
	buttonPressed: {
		opacity: 0.8,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	linkRow: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: spacing.xs,
		justifyContent: 'center',
		marginTop: spacing.sm,
	},
	mutedText: {
		color: colors.muted,
		fontSize: 13,
		fontWeight: '500',
	},
	linkText: {
		color: colors.accent,
		fontSize: 13,
		fontWeight: '800',
		textAlign: 'center',
	},
	divider: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: spacing.sm,
		marginVertical: spacing.sm,
		width: '100%',
	},
	dividerLine: {
		backgroundColor: '#e2e8f0',
		flex: 1,
		height: 1.5,
	},
	dividerText: {
		color: colors.muted,
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
	},
});
