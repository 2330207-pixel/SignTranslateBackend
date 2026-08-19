/**
 * services/emailService.js
 * -----------------------------------------------------------------------
 * Servicio para envío de correos electrónicos mediante Nodemailer.
 * -----------------------------------------------------------------------
 */

const nodemailer = require('nodemailer');
const dns = require('dns');
const env = require('../config/env');

// Forzar a Node.js a preferir IPv4 para evitar errores ENETUNREACH en Railway
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendRecoveryCode(to, code) {
  // Si no hay configuración SMTP, logueamos el código en consola pero no dejamos que rompa el flujo
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    console.warn(`⚠️  SMTP no configurado. Código para ${to}: ${code}`);
    return;
  }

  const mailOptions = {
    from: env.smtp.from,
    to,
    subject: 'Código de recuperación - SignTranslate',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4A90E2; text-align: center;">Recuperación de Contraseña</h2>
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña en SignTranslate. Usa el siguiente código para continuar:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px;">
          ${code}
        </div>
        <p>Este código es válido por 15 minutos. Si no solicitaste esto, puedes ignorar este correo con seguridad.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777; text-align: center;">
          Este es un correo automático, por favor no respondas.
        </p>
      </div>
    `,
  };

  console.log(`📤 Enviando correo via SMTP (${env.smtp.host}:${env.smtp.port})...`);
  await transporter.sendMail(mailOptions);
  console.log(`✅ Correo enviado exitosamente a ${to}`);
}

module.exports = { sendRecoveryCode };
