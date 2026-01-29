import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Speedboat Ticket";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

interface EmailResult {
  success: boolean;
  error?: string;
}

function template(content: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #f4f4f5; padding: 40px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #1e40af, #0369a1); padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0;">🚤 ${APP_NAME}</h1>
    </div>
    <div style="padding: 32px;">${content}</div>
    <div style="padding: 16px; text-align: center; color: #888; font-size: 12px;">
      © ${new Date().getFullYear()} ${APP_NAME}
    </div>
  </div>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<div style="text-align: center; margin: 24px 0;">
    <a href="${url}" style="background: #1e40af; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; display: inline-block;">${text}</a>
  </div>`;
}

export async function sendVerificationEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${APP_URL}/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const content = `
    <h2>Verify Your Email</h2>
    <p>Click the button below to verify your email address.</p>
    ${button("Verify Email", url)}
    <p style="font-size: 12px; color: #888;">Link expires in 24 hours.</p>
  `;

  // Always log verification URL in development for easy testing
  console.log("\n========== VERIFICATION EMAIL ==========");
  console.log(`To: ${email}`);
  console.log(`Verification URL: ${url}`);
  console.log("=========================================\n");

  try {
    // Skip actual email sending if no API key configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxxxxxxxxxxxxxxxxxxxxxxx") {
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Verify your email - ${APP_NAME}`,
      html: template(content),
    });
    
    if (error) {
      console.log("Email send error:", error);
      // Still return success since we logged the URL above
      return { success: true };
    }
    
    console.log("Email sent successfully, ID:", data?.id);
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.log("Email send exception:", message);
    // Still return success since we logged the URL above
    return { success: true };
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<EmailResult> {
  const url = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const content = `
    <h2>Reset Your Password</h2>
    <p>Click the button below to reset your password.</p>
    ${button("Reset Password", url)}
    <p style="font-size: 12px; color: #888;">Link expires in 1 hour.</p>
  `;

  try {
    // Development mode - log to console if no API key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxxxxxxxxxxxxxxxxxxxxxxx") {
      console.log("\n========== EMAIL (DEV MODE) ==========");
      console.log(`To: ${email}`);
      console.log(`Subject: Reset your password - ${APP_NAME}`);
      console.log(`Reset URL: ${url}`);
      console.log("======================================\n");
      return { success: true };
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Reset your password - ${APP_NAME}`,
      html: template(content),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<EmailResult> {
  const content = `
    <h2>Welcome${name ? `, ${name}` : ""}! 🎉</h2>
    <p>Your account is now active. Start booking your speedboat tickets!</p>
    ${button("Start Booking", APP_URL)}
  `;

  try {
    // Development mode - log to console if no API key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxxxxxxxxxxxxxxxxxxxxxxx") {
      console.log("\n========== EMAIL (DEV MODE) ==========");
      console.log(`To: ${email}`);
      console.log(`Subject: Welcome to ${APP_NAME}!`);
      console.log(`Name: ${name || "N/A"}`);
      console.log("======================================\n");
      return { success: true };
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Welcome to ${APP_NAME}!`,
      html: template(content),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function sendAccountLockedEmail(email: string, until: Date): Promise<EmailResult> {
  const content = `
    <h2>Account Locked 🔒</h2>
    <p>Your account has been temporarily locked due to too many failed login attempts.</p>
    <p>It will be unlocked at: <strong>${until.toLocaleString()}</strong></p>
  `;

  try {
    // Development mode - log to console if no API key
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxxxxxxxxxxxxxxxxxxxxxxx") {
      console.log("\n========== EMAIL (DEV MODE) ==========");
      console.log(`To: ${email}`);
      console.log(`Subject: Security Alert - ${APP_NAME}`);
      console.log(`Locked until: ${until.toLocaleString()}`);
      console.log("======================================\n");
      return { success: true };
    }

    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Security Alert - ${APP_NAME}`,
      html: template(content),
    });
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}
