import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";

const BREVO_API_KEY = process.env.AUTH_BREVO_KEY;

// SHA-256 Hashing helper using Web Crypto API (supported natively in Convex runtime)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "wpu_salt_123");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google,
    Email({
      id: "resend-otp",
      apiKey: BREVO_API_KEY,
      maxAge: 60 * 15, // 15 mins

      // Generate a clean 6-digit numeric OTP (100000 - 999999)
      generateVerificationToken() {
        return String(Math.floor(100000 + Math.random() * 900000));
      },

      async sendVerificationRequest({ identifier: email, token }) {
        try {
          // Send email via Brevo REST API v3 (300 free emails/day to any recipient address)
          const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "accept": "application/json",
              "api-key": BREVO_API_KEY,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              sender: { name: "MIT WPU Lost & Found Portal", email: "mithya.connect@gmail.com" },
              to: [{ email }],
              subject: `Your MIT WPU Verification Code: ${token}`,
              htmlContent: `<div style="font-family: -apple-system, sans-serif; padding: 28px; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; color: #1d2b56; border: 2px solid #1d2b56;">
                <h2 style="color: #1d2b56; margin-bottom: 8px; font-weight: 700;">MIT WPU Lost & Found Portal</h2>
                <p style="font-size: 15px; color: #475569;">Here is your official 6-digit verification code to sign in:</p>
                <div style="background: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #cbd5e1;">
                  <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1d2b56;">${token}</span>
                </div>
                <p style="font-size: 13px; color: #64748b;">This code expires in 15 minutes. If you did not request this, please ignore this email.</p>
              </div>`,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: response.statusText }));
            console.warn(`[Brevo Email Warning for ${email}]: ${errData.message || response.statusText}`);
            console.log(`[VERIFICATION OTP CODE FOR ${email}]: ${token}`);
          } else {
            console.log(`Successfully sent Brevo OTP email to ${email}`);
          }
        } catch (err: any) {
          console.warn(`[Brevo Exception for ${email}]: ${err.message}`);
          console.log(`[VERIFICATION OTP CODE FOR ${email}]: ${token}`);
        }
      },
    }),
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
          prn: params.prn as string,
        };
      },
      crypto: {
        async hashSecret(password) {
          return await hashPassword(password);
        },
        async verifySecret(password, hash) {
          const incomingHash = await hashPassword(password);
          return incomingHash === hash;
        }
      }
    }),
  ],
});
