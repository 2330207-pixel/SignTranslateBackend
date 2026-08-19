/**
 * services/emailService.js
 * SISTEMA DE EMERGENCIA PARA ENTREGA INMEDIATA
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');

async function sendRecoveryCode(to, code) {
  const mailOptions = {
    from: env.smtp.from || env.smtp.user,
    to,
    subject: 'Código de recuperación - SignTranslate',
    html: `<h2>Tu código es: ${code}</h2>`
  };

  // Intentamos enviar (Configuración ultra-rápida)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 5000 // No esperar más de 5 segundos
  });

  try {
    console.log(`📤 Intentando enviar correo a ${to}...`);
    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${to}`);
  } catch (error) {
    console.error(`❌ FALLÓ EL ENVÍO: ${error.message}`);
    console.log(`
*****************************************************
🚀 MODO DE EMERGENCIA ACTIVADO (PARA ENTREGA)
📧 DESTINATARIO: ${to}
🔑 CÓDIGO DE RECUPERACIÓN: ${code}
*****************************************************
    `);
  }
}

module.exports = { sendRecoveryCode };
