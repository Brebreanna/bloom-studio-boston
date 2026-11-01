import nodemailer from "nodemailer";

const bool = (value) => String(value || "").toLowerCase() === "true";

export function emailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM_ADDRESS
  );
}

export function createTransporter() {
  if (!emailConfigured()) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: bool(process.env.SMTP_SECURE),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function verifyEmailTransport() {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      configured: false,
      verified: false,
      message: "Email transport is not configured yet.",
    };
  }

  try {
    await transporter.verify();

    return {
      configured: true,
      verified: true,
      message: "SMTP connection verified.",
    };
  } catch (error) {
    return {
      configured: true,
      verified: false,
      message: error.message,
    };
  }
}

export async function sendEmail({ to, subject, html, text }) {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      sent: false,
      skipped: true,
      reason: "SMTP is not configured.",
    };
  }

  const fromName = process.env.EMAIL_FROM_NAME || "Bloom Studio Boston";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    text,
    html,
  });

  return {
    sent: true,
    skipped: false,
    messageId: info.messageId,
  };
}

export function subscriptionConfirmationEmail({ email, categories }) {
  const categoryText = categories?.length ? categories.join(", ") : "All events";
  const siteUrl = process.env.SITE_URL || "http://localhost:5173";

  return {
    to: email,
    subject: "You're on the Bloom Studio event list 🌸",
    text:
      `You're subscribed to Bloom Studio Boston event notifications.\n\n` +
      `Preferences: ${categoryText}\n\n` +
      `Browse workshops: ${siteUrl}/workshops`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px;margin:auto">
        <h1 style="font-family:Georgia,serif;color:#F3A2B5">You're on the Bloom list 🌸</h1>
        <p>We'll email you when Bloom Studio posts new workshops and events that match your preferences.</p>
        <p><strong>Your preferences:</strong> ${categoryText}</p>
        <p>
          <a href="${siteUrl}/workshops"
             style="display:inline-block;background:#F3A2B5;color:#2B2438;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">
            Browse workshops
          </a>
        </p>
      </div>
    `,
  };
}

export function waitlistConfirmationEmail({ email, eventTitle }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:5173";

  return {
    to: email,
    subject: `You're on the ${eventTitle} interest list`,
    text:
      `Thanks for showing interest in "${eventTitle}". ` +
      `Bloom Studio will email you if Vicky decides to schedule it.\n\n` +
      `${siteUrl}/workshops`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px;margin:auto">
        <h1 style="font-family:Georgia,serif;color:#F3A2B5">You're on the waitlist 💗</h1>
        <p>Thanks for showing interest in <strong>${eventTitle}</strong>.</p>
        <p>It doesn't have a confirmed date or location yet. If Vicky turns it into a real event, we'll email you.</p>
        <p>
          <a href="${siteUrl}/workshops"
             style="display:inline-block;background:#F3A2B5;color:#2B2438;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">
            See Bloom Studio workshops
          </a>
        </p>
      </div>
    `,
  };
}

export function newEventEmail({ subscriber, event }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:5173";
  const eventUrl = event.slug
    ? `${siteUrl}/workshops/${event.slug}`
    : `${siteUrl}/workshops`;

  return {
    to: subscriber.email,
    subject: `New at Bloom: ${event.title}`,
    text:
      `${event.title}\n\n${event.description || ""}\n\n` +
      `See details: ${eventUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px;margin:auto">
        <div style="font-size:12px;letter-spacing:.1em;color:#F3A2B5;font-weight:bold">NEW AT BLOOM STUDIO</div>
        <h1 style="font-family:Georgia,serif">${event.title}</h1>
        <p>${event.description || "A new Bloom Studio event is available."}</p>
        <p>
          <a href="${eventUrl}"
             style="display:inline-block;background:#F3A2B5;color:#2B2438;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">
            View event
          </a>
        </p>
      </div>
    `,
  };
}


export function orderConfirmationEmail({ email, orderId, total, items = [] }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:5173";
  const itemText = items.map((item) => `${item.quantity}× ${item.title}`).join("\n");
  const itemHtml = items.map((item) => `<li>${item.quantity}× ${item.title}</li>`).join("");
  return {
    to: email,
    subject: "Your Bloom Studio order is confirmed 🌸",
    text: `Thank you for your Bloom Studio order.\n\n${itemText}\n\nTotal: $${Number(total).toFixed(2)}\nOrder: ${orderId}\n\n${siteUrl}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif;color:#306854">Your Bloom order is confirmed.</h1><p>Thank you for making something beautiful with us.</p><ul>${itemHtml}</ul><p><strong>Total: $${Number(total).toFixed(2)}</strong></p><p>Order ${orderId}</p><p><a href="${siteUrl}" style="display:inline-block;background:#306854;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Visit Bloom Studio</a></p></div>`,
  };
}

export function inquiryConfirmationEmail({ email, name, celebrationType }) {
  const siteUrl = process.env.SITE_URL || "http://localhost:5173";
  return {
    to: email,
    subject: "We received your Bloom Studio private event inquiry",
    text: `Hi ${name},\n\nWe received your ${celebrationType} inquiry. Bloom Studio will follow up with you soon.\n\n${siteUrl}/private-events`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px;margin:auto"><h1 style="font-family:Georgia,serif;color:#306854">Thanks for reaching out, ${name}.</h1><p>We received your <strong>${celebrationType}</strong> inquiry and will follow up soon.</p><p><a href="${siteUrl}/private-events">Bloom Studio private events</a></p></div>`,
  };
}


export function privateEventOwnerEmail({ name, email, celebrationType, preferredDate, guestCount, notes }) {
  const owner = process.env.EMAIL_FROM_ADDRESS || "Contact@bloomstudioboston.com";
  return {
    to: owner,
    subject: `New Bloom private event inquiry — ${celebrationType}`,
    text: `Name: ${name}\nEmail: ${email}\nType: ${celebrationType}\nPreferred date: ${preferredDate || "Not specified"}\nGuests: ${guestCount || "Not specified"}\n\n${notes || "No additional notes."}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2B2438;max-width:600px"><h1>New private event inquiry</h1><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Type:</strong> ${celebrationType}</p><p><strong>Preferred date:</strong> ${preferredDate || "Not specified"}</p><p><strong>Guests:</strong> ${guestCount || "Not specified"}</p><p>${notes || "No additional notes."}</p></div>`,
  };
}
