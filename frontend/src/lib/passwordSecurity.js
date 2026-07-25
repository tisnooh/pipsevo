export const PASSWORD_MIN_LENGTH = 8;

export function passwordValidation(password) {
  const checks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    digit: /\d/.test(password),
  };
  return {
    checks,
    valid: Object.values(checks).every(Boolean),
    message: `Utilise au moins ${PASSWORD_MIN_LENGTH} caractères, une majuscule et un chiffre.`,
  };
}
