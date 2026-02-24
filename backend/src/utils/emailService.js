import nodemailer from 'nodemailer';

const buildTransporter = () => {
  // Allow local/dev flows to proceed without SMTP; skip sending quietly
  if (process.env.SMTP_DISABLE === 'true') {
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

// Strip the "data:image/png;base64," prefix to get raw base64 for CID attachment
const extractBase64 = (dataUrl) => {
  if (!dataUrl) return { base64: null, mimeType: 'image/png' };
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], base64: match[2] };
  return { base64: dataUrl, mimeType: 'image/png' }; // already raw base64
};

const renderTicketHtml = ({ eventName, eventDate, ticketId, participantName, participantEmail }) => `
  <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(90deg, #111827, #1f2937); color: #fff; padding: 16px 20px;">
      <h2 style="margin: 0; font-size: 20px;">Felicity Fest Ticket</h2>
      <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.85;">Your entry pass</p>
    </div>
    <div style="padding: 20px; color: #111827;">
      <p style="margin: 0 0 8px; font-size: 15px;">Event</p>
      <h3 style="margin: 0 0 12px; font-size: 22px;">${eventName}</h3>
      ${eventDate ? `<p style="margin: 0 0 12px; font-size: 15px;">Date &amp; time: <strong>${eventDate}</strong></p>` : ''}
      ${participantName ? `<p style="margin: 0 0 8px; font-size: 15px;">Name: <strong>${participantName}</strong></p>` : ''}
      ${participantEmail ? `<p style="margin: 0 0 12px; font-size: 15px;">Email: <strong>${participantEmail}</strong></p>` : ''}
      <p style="margin: 0 0 16px; font-size: 15px;">Ticket ID: <strong>${ticketId}</strong></p>
      <div style="text-align: center; margin: 12px 0;">
        <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px; object-fit: contain;" />
        <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Show this QR at entry</p>
      </div>
    </div>
  </div>
`;

export const sendTicketEmail = async ({ to, eventName, eventDate, ticketId, qrData, participantName, participantEmail }) => {
  const transporter = buildTransporter();
  if (!transporter) return; // SMTP disabled — skip silently

  const subject = `Your ticket for ${eventName}`;
  const html = renderTicketHtml({ eventName, eventDate, ticketId, participantName, participantEmail });
  const displayDate = eventDate || '';
  const text = `Ticket for ${eventName}\nDate: ${displayDate}\nName: ${participantName || ''}\nEmail: ${participantEmail || ''}\nTicket ID: ${ticketId}`;

  const { base64, mimeType } = extractBase64(qrData);

  const payload = {
    from: process.env.SMTP_EMAIL,
    to,
    subject,
    text,
    html,
    attachments: base64
      ? [{ filename: 'qr.png', content: base64, encoding: 'base64', contentType: mimeType, cid: 'qrcode' }]
      : [],
  };

  try {
    await transporter.sendMail(payload);
  } catch (err) {
    try {
      await transporter.sendMail(payload);
    } catch (err2) {
      const retryError = new Error(`Ticket email delivery failed after retry: ${err2.message}`);
      retryError.cause = err2;
      throw retryError;
    }
  }
};
