import QRCode from "qrcode";

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
 * Encode QR data to string
 * Uses a compact format: SPB:{base64}
 */
export function encodeQRData(data: TicketQRData): string {
  const payload = {
    t: data.ticketCode,
    b: data.bookingCode,
    p: data.passengerName,
    s: data.scheduleId,
    d: data.departureTime,
    v: data.version || 1,
  };

  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString("base64");

  return `SPB:${base64}`;
}

/**
 * Decode QR data from string
 */
export function decodeQRData(qrString: string): TicketQRData | null {
  try {
    // Check for SPB prefix (our format)
    if (qrString.startsWith("SPB:")) {
      const base64 = qrString.substring(4);
      const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
      const payload = JSON.parse(jsonStr);

      return {
        ticketCode: payload.t,
        bookingCode: payload.b,
        passengerName: payload.p,
        scheduleId: payload.s,
        departureTime: payload.d,
        version: payload.v || 1,
      };
    }

    // Try parsing as plain JSON (legacy format)
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
