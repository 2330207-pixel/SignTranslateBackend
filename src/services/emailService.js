/**
 * services/emailService.js
 * -----------------------------------------------------------------------
 * Servicio para envío de correos electrónicos mediante Nodemailer.
 * -----------------------------------------------------------------------
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  // Opciones adicionales para evitar timeouts y mejorar compatibilidad
  connectionTimeout: 10000, // 10 segundos
  greetingTimeout: 10000,
  socketTimeout: 15000,
  tls: {
    // No fallar si el certificado es auto-firmado (común en algunos SMTP)
    rejectUnauthorized: false
  }
});

async function sendRecoveryCode(to, code) {
  // Si no hay configuración SMTP
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    const errorMsg = '❌ ERROR: El servicio de correo no está configurado (faltan variables SMTP).';
    console.error(errorMsg);
    console.log(`🔑 CÓDIGO DE EMERGENCIA (solo consola): ${code}`);

    if (env.nodeEnv === 'production') {
      throw new Error('Servicio de correo no configurado.');
    }
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

  await transporter.sendMail(mailOptions);
}

module.exports = { sendRecoveryCode };
