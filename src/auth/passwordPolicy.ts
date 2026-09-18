export const isValidPassword = (password: string) =>
  password.length >= 8 && /[A-ZÁÉÍÓÚÜÑ]/.test(password);
export const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
