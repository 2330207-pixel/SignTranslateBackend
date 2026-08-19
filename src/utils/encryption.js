/**
 * utils/encryption.js
 * -----------------------------------------------------------------------
 * Cifrado simétrico (AES-256-GCM) para datos sensibles en reposo,
 * como biometría o información personal identificable.
 * -----------------------------------------------------------------------
 */

const crypto = require('crypto');
const env = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function encrypt(text) {
  if (!env.facialEncryptionKey) {
    throw new Error('FACIAL_ENCRYPTION_KEY no está configurada.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derivamos una clave a partir de la master key y el salt aleatorio
  const key = crypto.pbkdf2Sync(env.facialEncryptionKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Estructura: salt (64) + iv (16) + tag (16) + data
  return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
}

function decrypt(cipherText) {
  if (!env.facialEncryptionKey) {
    throw new Error('FACIAL_ENCRYPTION_KEY no está configurada.');
  }

  const buffer = Buffer.from(cipherText, 'base64');

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  const key = crypto.pbkdf2Sync(env.facialEncryptionKey, salt, ITERATIONS, KEY_LENGTH, 'sha512');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
