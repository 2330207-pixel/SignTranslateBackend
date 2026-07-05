/**
 * utils/validators.js
 * -----------------------------------------------------------------------
 * Validaciones simples y reutilizables para las rutas de autenticación.
 * -----------------------------------------------------------------------
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

function validateRegisterInput({ name, email, password }) {
  const errors = [];
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres.');
  }
  if (!isValidEmail(email)) {
    errors.push('El correo electrónico no es válido.');
  }
  if (!isValidPassword(password)) {
    errors.push('La contraseña debe tener al menos 6 caracteres.');
  }
  return errors;
}

function validateLoginInput({ email, password }) {
  const errors = [];
  if (!isValidEmail(email)) errors.push('El correo electrónico no es válido.');
  if (!password) errors.push('La contraseña es obligatoria.');
  return errors;
}

module.exports = { isValidEmail, isValidPassword, validateRegisterInput, validateLoginInput };
