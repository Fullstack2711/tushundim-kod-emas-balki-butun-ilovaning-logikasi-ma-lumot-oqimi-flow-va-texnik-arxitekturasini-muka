export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;

export function validatePasswordRequirements(password: string) {
	if (!password || password.length < PASSWORD_MIN_LENGTH) {
		throw new Error(PASSWORD_TOO_SHORT_MESSAGE);
	}
}
