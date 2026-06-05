const nodemailer = require('nodemailer');

function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const from = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@crmapp.com';

async function sendPasswordReset(toEmail, toName, resetUrl) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[DEV] Password reset for ${toEmail}: ${resetUrl}`);
    return;
  }
  await transporter.sendMail({
    from:    `"CRM Pro" <${from()}>`,
    to:      toEmail,
    subject: 'Recupera tu contraseña — CRM Pro',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="font-size:20px;font-weight:700;color:#1e1b4b;margin-bottom:8px">Recuperar contraseña</h2>
        <p style="color:#6b7280;font-size:14px;margin-bottom:24px">
          Hola ${toName}, recibimos una solicitud para restablecer tu contraseña.
          El enlace expira en <strong>1 hora</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#7c3aed;color:#fff;font-size:14px;font-weight:600;
                  padding:12px 24px;border-radius:8px;text-decoration:none">
          Restablecer contraseña
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Si no solicitaste esto, ignora este email. Tu contraseña no cambiará.
        </p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#d1d5db;font-size:11px">CRM Pro · ${resetUrl}</p>
      </div>
    `,
    text: `Recuperar contraseña CRM Pro\n\nEnlace: ${resetUrl}\n\nExpira en 1 hora.`,
  });
}

module.exports = { sendPasswordReset };
