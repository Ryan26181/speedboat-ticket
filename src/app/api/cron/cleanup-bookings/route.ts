import { NextRequest } from "next/server";
import { successResponse, errorResponse, handleApiError } from "@/lib/api-utils";
import { cleanupExpiredBookings, getCleanupStats } from "@/lib/booking-cleanup";

// Secret key for cron job authentication
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cleanup-bookings
 * Trigger expired bookings cleanup
 * Protected with secret key in header
 * For use with external cron service (e.g., Vercel Cron, GitHub Actions)
 * 
 * Headers required:
 * - Authorization: Bearer <CRON_SECRET>
 * 
 * Query params:
 * - dryRun: "true" to only get stats without cleanup
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("Authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    // In development, allow without secret for testing
    const isDevelopment = process.env.NODE_ENV === "development";
    
    if (!isDevelopment && CRON_SECRET && providedSecret !== CRON_SECRET) {
      return errorResponse("Unauthorized: Invalid cron secret", 401);
    }

    // Check for dry run mode
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";

    if (dryRun) {
      // Just return stats without cleanup
      const stats = await getCleanupStats();
      return successResponse({
        dryRun: true,
        stats,
        message: `Found ${stats.pendingExpired} expired bookings that would be cleaned up`,
      });
    }

    // Run cleanup
    const result = await cleanupExpiredBookings();

    // Log results for monitoring
    console.log("[CRON] Booking cleanup completed:", {
      processed: result.processedCount,
      expired: result.expiredBookingIds.length,
      errors: result.errors.length,
      timestamp: new Date().toISOString(),
    });

    return successResponse({
      success: true,
      result,
      message: `Cleanup completed. Processed ${result.processedCount} bookings, expired ${result.expiredBookingIds.length}, errors: ${result.errors.length}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "CRON_CLEANUP_BOOKINGS");
  }
}

/**
 * POST /api/cron/cleanup-bookings
 * Alternative method for webhooks/cron services that prefer POST
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
