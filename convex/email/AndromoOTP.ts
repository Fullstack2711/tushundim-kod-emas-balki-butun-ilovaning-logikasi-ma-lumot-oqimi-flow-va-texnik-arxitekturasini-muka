import { Email } from '@convex-dev/auth/providers/Email';
import { alphabet, generateRandomString } from 'oslo/crypto';

export const AndromoVerifyOTP = Email({
	id: 'andromo-verify-otp',
	maxAge: 60 * 20,
	async generateVerificationToken() {
		return generateRandomString(6, alphabet('0-9'));
	},
	async sendVerificationRequest({ identifier: email, token }) {
		const smtpUrl = process.env.ANDROMO_SMTP_URL;
		const smtpKey = process.env.ANDROMO_SMTP_API_KEY;
		if (!smtpUrl || !smtpKey) {
			throw new Error(
				'Email service not configured (ANDROMO_SMTP_URL or ANDROMO_SMTP_API_KEY missing)',
			);
		}

		const response = await fetch(`${smtpUrl}/api/andromo-smtp/send-otp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${smtpKey}`,
			},
			body: JSON.stringify({
				template: 'confirm-email',
				to: email,
				otp: token,
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(
				`Failed to send verification email: ${response.status} ${body}`,
			);
		}
	},
});

export const AndromoResetOTP = Email({
	id: 'andromo-reset-otp',
	maxAge: 60 * 20,
	async generateVerificationToken() {
		return generateRandomString(6, alphabet('0-9'));
	},
	async sendVerificationRequest({ identifier: email, token }) {
		const smtpUrl = process.env.ANDROMO_SMTP_URL;
		const smtpKey = process.env.ANDROMO_SMTP_API_KEY;
		if (!smtpUrl || !smtpKey) {
			throw new Error(
				'Email service not configured (ANDROMO_SMTP_URL or ANDROMO_SMTP_API_KEY missing)',
			);
		}

		const response = await fetch(`${smtpUrl}/api/andromo-smtp/send-otp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${smtpKey}`,
			},
			body: JSON.stringify({
				template: 'password-reset',
				to: email,
				otp: token,
			}),
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(
				`Failed to send password reset email: ${response.status} ${body}`,
			);
		}
	},
});
