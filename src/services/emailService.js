/**
 * services/emailService.js
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

// Configuración ultra-compatible para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  }
});

async function sendRecoveryCode(to, code) {
  if (!env.smtp.user || !env.smtp.pass) {
    console.warn(`⚠️  SMTP no configurado. Código para ${to}: ${code}`);
    return;
  }

  const mailOptions = {
    from: env.smtp.from || env.smtp.user,
    to,
    subject: 'Código de recuperación - SignTranslate',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">Recuperación de Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Tu código es:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px;">
          ${code}
        </div>
        <p>Válido por 15 minutos.</p>
      </div>
    `,
  };

  try {
    console.log(`📤 Intentando enviar correo a ${to}...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${to}`);
  } catch (error) {
    console.error(`❌ Error REAL en sendMail para ${to}:`, error.message);
  }
}

module.exports = { sendRecoveryCode };
