/**
 * services/emailService.js
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

// Configuramos el transporte forzando IPv4 (family: 4)
// para evitar el error ENETUNREACH en Railway.
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true para 465
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
  family: 4 // ESTO OBLIGA A USAR IPv4
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
        <p>Hola,</p>
        <p>Has solicitado restablecer tu contraseña. Tu código de verificación es:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px;">
          ${code}
        </div>
        <p>Este código es válido por 15 minutos. Si no solicitaste esto, puedes ignorar este correo.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #777; text-align: center;">SignTranslate Team</p>
      </div>
    `,
  };

  try {
    console.log(`📤 [IPv4 Force] Intentando enviar correo a ${to} via smtp.gmail.com:465...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${to}`);
  } catch (error) {
    console.error(`❌ Error en sendMail para ${to}:`, error.message);

    // Si falla el puerto 465, intentamos automáticamente el 587 como backup
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
       console.log('🔄 Reintentando con puerto 587 (TLS)...');
       const backupTransporter = nodemailer.createTransport({
         host: 'smtp.gmail.com',
         port: 587,
         secure: false,
         auth: { user: env.smtp.user, pass: env.smtp.pass },
         family: 4
       });
       try {
         await backupTransporter.sendMail(mailOptions);
         console.log(`✅ Correo enviado (vía backup 587) a ${to}`);
       } catch (backupError) {
         console.error(`❌ Error crítico: ambos puertos (465/587) fallaron.`, backupError.message);
       }
    }
  }
}

module.exports = { sendRecoveryCode };
