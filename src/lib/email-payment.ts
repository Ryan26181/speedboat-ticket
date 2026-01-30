/**
 * Payment Email Notifications
 * 
 * Sends email notifications for payment events
 */

import { Resend } from "resend";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@example.com";
const APP_NAME = "SpeedBoat Tickets";

interface TripDetails {
  from: string;
  to: string;
  date: string;
  time: string;
  ship: string;
}

/**
 * Send payment success email with booking confirmation
 */
export async function sendPaymentSuccessEmail(
  email: string,
  bookingCode: string,
  passengerNames: string[],
  tripDetails: TripDetails,
  totalAmount: number
): Promise<boolean> {
  if (!resend) {
    console.log("[EMAIL] Resend not configured, skipping email:", {
      to: email,
      bookingCode,
      type: "payment_success",
    });
    return false;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmed - ${bookingCode}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                🎉 Payment Successful!
              </h1>
              <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">
                Your booking has been confirmed
              </p>
            </td>
          </tr>
          
          <!-- Booking Code -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase; letter-spacing: 1px;">
                      Booking Code
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: 700; color: #15803d; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                      ${bookingCode}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Trip Details -->
          <tr>
            <td style="padding: 16px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                🚢 Trip Details
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Route</span><br>
                    <span style="color: #1f2937; font-size: 16px; font-weight: 500;">
                      ${tripDetails.from} → ${tripDetails.to}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Date</span><br>
                    <span style="color: #1f2937; font-size: 16px; font-weight: 500;">
                      ${tripDetails.date}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Departure Time</span><br>
                    <span style="color: #1f2937; font-size: 16px; font-weight: 500;">
                      ${tripDetails.time} WIB
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #6b7280; font-size: 14px;">Ship</span><br>
                    <span style="color: #1f2937; font-size: 16px; font-weight: 500;">
                      ${tripDetails.ship}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Passengers -->
          <tr>
            <td style="padding: 16px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1f2937;">
                👥 Passengers (${passengerNames.length})
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${passengerNames
                  .map(
                    (name, index) => `
                <tr>
                  <td style="padding: 8px 0; ${index < passengerNames.length - 1 ? "border-bottom: 1px solid #e5e7eb;" : ""}">
                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #dbeafe; color: #2563eb; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600; margin-right: 8px;">
                      ${index + 1}
                    </span>
                    <span style="color: #1f2937; font-size: 15px;">${name}</span>
                  </td>
                </tr>
                  `
                  )
                  .join("")}
              </table>
            </td>
          </tr>
          
          <!-- Total Paid -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Total Paid</td>
                        <td style="text-align: right; color: #15803d; font-size: 24px; font-weight: 700;">
                          ${formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; text-align: center;">
              <a href="${appUrl}/en/ticket/${bookingCode}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View E-Tickets
              </a>
              <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 13px;">
                You can also view your tickets in your account dashboard
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated email from ${APP_NAME}.<br>
                Please do not reply to this email.
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px;">
                If you have questions, contact our support team.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `✅ Payment Confirmed - ${bookingCode}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[EMAIL] Failed to send payment success email:", error);
      return false;
    }

    console.log("[EMAIL] Payment success email sent:", {
      to: email,
      bookingCode,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending payment success email:", error);
    return false;
  }
}

/**
 * Send payment failed email notification
 */
export async function sendPaymentFailedEmail(
  email: string,
  bookingCode: string,
  reason: string
): Promise<boolean> {
  if (!resend) {
    console.log("[EMAIL] Resend not configured, skipping email:", {
      to: email,
      bookingCode,
      type: "payment_failed",
    });
    return false;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - ${bookingCode}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Payment Failed
              </h1>
              <p style="margin: 8px 0 0 0; color: #fecaca; font-size: 14px;">
                We couldn't process your payment
              </p>
            </td>
          </tr>
          
          <!-- Booking Code -->
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #991b1b; text-transform: uppercase; letter-spacing: 1px;">
                      Booking Code
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #dc2626; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                      ${bookingCode}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Reason -->
          <tr>
            <td style="padding: 16px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1f2937;">
                What happened?
              </h2>
              <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                ${reason}
              </p>
            </td>
          </tr>
          
          <!-- What to do next -->
          <tr>
            <td style="padding: 16px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1f2937;">
                What you can do
              </h2>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.8;">
                <li>Try a different payment method</li>
                <li>Check your card details or bank balance</li>
                <li>Create a new booking and try again</li>
                <li>Contact our support if the issue persists</li>
              </ul>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; text-align: center;">
              <a href="${appUrl}/en/search" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Search New Trip
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated email from ${APP_NAME}.<br>
                Please do not reply to this email.
              </p>
              <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 12px;">
                If you need help, please contact our support team.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `❌ Payment Failed - ${bookingCode}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[EMAIL] Failed to send payment failed email:", error);
      return false;
    }

    console.log("[EMAIL] Payment failed email sent:", {
      to: email,
      bookingCode,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending payment failed email:", error);
    return false;
  }
}

/**
 * Send payment pending/reminder email
 */
export async function sendPaymentPendingEmail(
  email: string,
  bookingCode: string,
  tripDetails: TripDetails,
  totalAmount: number,
  expiresAt: Date
): Promise<boolean> {
  if (!resend) {
    console.log("[EMAIL] Resend not configured, skipping email:", {
      to: email,
      bookingCode,
      type: "payment_pending",
    });
    return false;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const expiryFormatted = expiresAt.toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Payment - ${bookingCode}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ⏳ Complete Your Payment
              </h1>
              <p style="margin: 8px 0 0 0; color: #fef3c7; font-size: 14px;">
                Your booking is waiting for payment
              </p>
            </td>
          </tr>
          
          <!-- Warning -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fcd34d;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; text-align: center;">
                      <strong>⚠️ Payment expires on:</strong><br>
                      <span style="font-size: 16px;">${expiryFormatted}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Booking Code -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #fef9c3; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #854d0e; text-transform: uppercase; letter-spacing: 1px;">
                      Booking Code
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 28px; font-weight: 700; color: #a16207; font-family: 'Courier New', monospace; letter-spacing: 2px;">
                      ${bookingCode}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Trip Summary -->
          <tr>
            <td style="padding: 16px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1f2937;">Trip Summary</h2>
              <p style="margin: 0; color: #4b5563; font-size: 15px;">
                <strong>${tripDetails.from}</strong> → <strong>${tripDetails.to}</strong><br>
                ${tripDetails.date} at ${tripDetails.time} WIB
              </p>
            </td>
          </tr>
          
          <!-- Amount -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">Amount Due</td>
                        <td style="text-align: right; color: #1f2937; font-size: 24px; font-weight: 700;">
                          ${formatCurrency(totalAmount)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 16px 32px 32px 32px; text-align: center;">
              <a href="${appUrl}/en/booking/${bookingCode}/payment" 
                 style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Complete Payment Now
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This is an automated email from ${APP_NAME}.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `⏳ Complete Your Payment - ${bookingCode}`,
      html: htmlContent,
    });

    if (error) {
      console.error("[EMAIL] Failed to send payment pending email:", error);
      return false;
    }

    console.log("[EMAIL] Payment pending email sent:", {
      to: email,
      bookingCode,
    });
    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending payment pending email:", error);
    return false;
  }
}
