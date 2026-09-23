export const isValidPassword = (password: string) =>
  password.trim().length >= 8 && /[A-ZÁÉÍÓÚÜÑ]/.test(password.trim());
export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
