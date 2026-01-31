import QRCode from "qrcode";
import { createHmac } from "crypto";

/**
 * QR Code HMAC Secret
 * Used to sign QR codes to prevent tampering
 * MUST be set in production environment
 */
const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || "dev-qr-secret-change-in-production";

/**
 * Data structure for ticket QR code
 */
export interface TicketQRData {
  ticketCode: string;
  bookingCode: string;
  passengerName: string;
  scheduleId: string;
  departureTime: string;
  version: number;
}

/**
 * Data structure with signature (internal use)
 */
interface SignedPayload {
  t: string;  // ticketCode
  b: string;  // bookingCode
  p: string;  // passengerName
  s: string;  // scheduleId
  d: string;  // departureTime
  v: number;  // version
  sig: string; // HMAC signature
}

/**
 * Options for QR code generation
 */
export interface QROptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  color?: {
    dark?: string;
    light?: string;
  };
}

const DEFAULT_OPTIONS: QROptions = {
  width: 200,
  margin: 2,
  errorCorrectionLevel: "M",
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
};

/**
 * Generate QR code as data URL (for display in browser)
 */
export async function generateQRDataURL(
  data: TicketQRData,
  options: QROptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const qrString = encodeQRData(data);

  return await QRCode.toDataURL(qrString, {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: opts.color,
  });
}

/**
 * Generate QR code as buffer (for PDF generation or file saving)
 */
export async function generateQRBuffer(
  data: TicketQRData,
  options: QROptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const qrString = encodeQRData(data);

  return await QRCode.toBuffer(qrString, {
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: opts.color,
  });
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRSVG(
  data: TicketQRData,
  options: QROptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const qrString = encodeQRData(data);

  return await QRCode.toString(qrString, {
    type: "svg",
    width: opts.width,
    margin: opts.margin,
    errorCorrectionLevel: opts.errorCorrectionLevel,
    color: opts.color,
  });
}

/**
 * Generate HMAC signature for QR payload
 * Creates a SHA-256 HMAC of the essential ticket data
 */
function generateQRSignature(data: TicketQRData): string {
  // Create deterministic string from essential fields
  const signatureData = `${data.ticketCode}|${data.bookingCode}|${data.scheduleId}|${data.departureTime}|${data.version}`;
  
  return createHmac("sha256", QR_HMAC_SECRET)
    .update(signatureData)
    .digest("base64")
    .substring(0, 16); // Truncate to 16 chars to keep QR compact
}

/**
 * Verify HMAC signature of QR data
 * Returns true if signature is valid, false otherwise
 */
export function verifyQRSignature(data: TicketQRData, signature: string): boolean {
  const expectedSignature = generateQRSignature(data);
  
  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Encode QR data to string with HMAC signature
 * Uses a compact format: SPB:{base64}
 * The payload includes an HMAC signature to prevent tampering
 */
export function encodeQRData(data: TicketQRData): string {
  const signature = generateQRSignature(data);
  
  const payload: SignedPayload = {
    t: data.ticketCode,
    b: data.bookingCode,
    p: data.passengerName,
    s: data.scheduleId,
    d: data.departureTime,
    v: data.version || 1,
    sig: signature,
  };

  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString("base64");

  return `SPB:${base64}`;
}

/**
 * Decode QR data from string and verify signature
 * Returns null if invalid or signature verification fails
 * 
 * @param qrString - The QR code string to decode
 * @param validateSignature - Whether to verify HMAC signature (default: true)
 */
export function decodeQRData(qrString: string, validateSignature = true): TicketQRData | null {
  try {
    // Check for SPB prefix (our format)
    if (qrString.startsWith("SPB:")) {
      const base64 = qrString.substring(4);
      const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonStr) as SignedPayload;

      const data: TicketQRData = {
        ticketCode: payload.t,
        bookingCode: payload.b,
        passengerName: payload.p,
        scheduleId: payload.s,
        departureTime: payload.d,
        version: payload.v || 1,
      };
      
      // Verify HMAC signature if present and validation is enabled
      if (validateSignature && payload.sig) {
        if (!verifyQRSignature(data, payload.sig)) {
          console.warn("[QR_SIGNATURE_INVALID]", { ticketCode: data.ticketCode });
          return null; // Invalid signature - tampered QR code
        }
      } else if (validateSignature && !payload.sig) {
        // Modern QR codes should have signatures
        // Allow legacy codes without signatures in non-strict mode
        console.warn("[QR_SIGNATURE_MISSING]", { ticketCode: data.ticketCode });
        // Return data but log warning - can enable strict mode later
      }

      return data;
    }

    // Try parsing as plain JSON (legacy format - no signature validation)
    const data = JSON.parse(qrString);
    return {
      ticketCode: data.ticketCode || data.t,
      bookingCode: data.bookingCode || data.b,
      passengerName: data.passengerName || data.p,
      scheduleId: data.scheduleId || data.s,
      departureTime: data.departureTime || data.d,
      version: data.version || data.v || 1,
    };
  } catch {
    return null;
  }
}

/**
 * Validate QR data structure
 */
export function isValidQRData(data: unknown): data is TicketQRData {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.ticketCode === "string" &&
    typeof d.bookingCode === "string" &&
    typeof d.passengerName === "string" &&
    typeof d.scheduleId === "string" &&
    typeof d.departureTime === "string"
  );
}

/**
 * Create TicketQRData from ticket and booking info
 */
export function createTicketQRData(
  ticketCode: string,
  bookingCode: string,
  passengerName: string,
  scheduleId: string,
  departureTime: Date | string
): TicketQRData {
  return {
    ticketCode,
    bookingCode,
    passengerName,
    scheduleId,
    departureTime:
      departureTime instanceof Date
        ? departureTime.toISOString()
        : departureTime,
    version: 1,
  };
}
