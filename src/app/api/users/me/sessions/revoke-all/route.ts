import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAuthUser,
} from "@/lib/api-utils";

/**
 * POST /api/users/me/sessions/revoke-all
 * Revoke all sessions for the current user (logout from all devices)
 * 
 * Security Features:
 * - Updates passwordChangedAt timestamp to invalidate all existing JWTs
 * - Deletes all database sessions (for OAuth users)
 * - Requires authentication
 */
export async function POST() {
  try {
    const user = await requireAuthUser();

    // Update passwordChangedAt to invalidate all JWT tokens
    // This works because the auth.ts session callback checks if
    // passwordChangedAt > tokenIssuedAt and invalidates the session
    const now = new Date();
    
    await prisma.$transaction([
      // Update passwordChangedAt to invalidate all JWTs
      prisma.user.update({
        where: { id: user.id },
        data: { passwordChangedAt: now },
      }),
      // Delete all database sessions (for database session strategy / OAuth)
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return successResponse({
      success: true,
      message: "All sessions have been revoked. Please sign in again.",
      revokedAt: now.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, "REVOKE_ALL_SESSIONS");
  }
}
