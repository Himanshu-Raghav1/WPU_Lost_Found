import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const BREVO_API_KEY = process.env.AUTH_BREVO_KEY || "";
const SENDER_EMAIL = "mithya.connect@gmail.com";
const SENDER_NAME = "MIT WPU Lost & Found Portal";

// ─── Shared Brevo email sender ────────────────────────────────────────────────
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    htmlContent: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
          to: [{ email: args.to }],
          subject: args.subject,
          htmlContent: args.htmlContent,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: response.statusText }));
        console.warn(`[Brevo] Failed to send to ${args.to}: ${err.message}`);
        return { success: false, error: err.message };
      }

      console.log(`[Brevo] Email sent successfully to ${args.to}`);
      return { success: true };
    } catch (err: any) {
      console.warn(`[Brevo] Exception sending to ${args.to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  },
});

// ─── Email HTML templates ─────────────────────────────────────────────────────

export function buildMatchNotificationForLostReporter(
  lostReporterName: string,
  itemTitle: string,
  finderName: string,
  finderEmail: string,
  finderPhone: string,
) {
  return `
<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#1d2b56;margin-bottom:4px;font-weight:700;">🎉 Great News, ${lostReporterName}!</h2>
  <p style="font-size:15px;color:#475569;margin-bottom:20px;">
    Your lost item <strong>"${itemTitle}"</strong> appears to have been found on the MIT WPU campus. 
    Campus Admin has verified and matched your report with a found item.
  </p>
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:12px;">📞 Finder's Contact Details</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Name:</strong> ${finderName}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> <a href="mailto:${finderEmail}" style="color:#1d2b56;">${finderEmail}</a></p>
    <p style="margin:4px 0;font-size:14px;"><strong>Phone:</strong> ${finderPhone || "Not provided"}</p>
  </div>
  <p style="font-size:13px;color:#64748b;">
    Please reach out to the finder directly to collect your item. 
    This message was sent by MIT WPU Lost &amp; Found Portal Admin.
  </p>
</div>`;
}

export function buildMatchNotificationForFoundReporter(
  finderName: string,
  itemTitle: string,
  ownerName: string,
  ownerEmail: string,
  ownerPhone: string,
) {
  return `
<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#1d2b56;margin-bottom:4px;font-weight:700;">✅ Item Owner Identified, ${finderName}!</h2>
  <p style="font-size:15px;color:#475569;margin-bottom:20px;">
    Campus Admin has identified the owner of the item <strong>"${itemTitle}"</strong> that you found and reported. 
    Thank you for your honesty!
  </p>
  <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:12px;">📞 Owner's Contact Details</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Name:</strong> ${ownerName}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> <a href="mailto:${ownerEmail}" style="color:#1d2b56;">${ownerEmail}</a></p>
    <p style="margin:4px 0;font-size:14px;"><strong>Phone:</strong> ${ownerPhone || "Not provided"}</p>
  </div>
  <p style="font-size:13px;color:#64748b;">
    Please arrange to hand over the item to its rightful owner. 
    Thank you for helping keep the MIT WPU campus safe and honest!
  </p>
</div>`;
}

export function buildAdminNewItemNotification(
  itemTitle: string,
  itemType: string,
  reporterName: string,
  reporterPrn: string,
  category: string,
  location: string,
) {
  return `
<div style="font-family:-apple-system,sans-serif;padding:32px;max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;color:#1d2b56;border:2px solid #1d2b56;">
  <h2 style="color:#1d2b56;margin-bottom:4px;font-weight:700;">🔔 New Item Report Pending Approval</h2>
  <p style="font-size:15px;color:#475569;margin-bottom:20px;">
    A new <strong>${itemType.toUpperCase()}</strong> item report has been submitted and is waiting for your review.
  </p>
  <div style="background:#fefce8;border:1px solid #fde047;border-radius:12px;padding:20px;margin-bottom:20px;">
    <p style="margin:4px 0;font-size:14px;"><strong>Item:</strong> ${itemTitle}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Category:</strong> ${category}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Location:</strong> ${location}</p>
    <p style="margin:4px 0;font-size:14px;"><strong>Reporter:</strong> ${reporterName} (PRN: ${reporterPrn})</p>
  </div>
  <a href="https://wpu-lost-found.netlify.app/admin" 
     style="display:inline-block;background:#1d2b56;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
    Review in Admin Panel →
  </a>
</div>`;
}
