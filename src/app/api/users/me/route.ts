import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { 
  successResponse, 
  errorResponse, 
  handleApiError,
  requireAuthUser,
} from "@/lib/api-utils";

// Update profile schema
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^(\+62|62|0)?[0-9]{9,13}$/).nullable().optional(),
});

/**
 * GET /api/users/me
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuthUser();
    
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse(user, "User profile retrieved");
  } catch (error) {
    return handleApiError(error, "GET /api/users/me");
  }
}

/**
 * PATCH /api/users/me
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthUser();
    const body = await request.json();

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);
    if (!validationResult.success) {
      return errorResponse(
        "Validation failed",
        400,
        validationResult.error.flatten().fieldErrors
      );
    }

    const { name, phone } = validationResult.data;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(updatedUser, "Profile updated successfully");
  } catch (error) {
    return handleApiError(error, "PATCH /api/users/me");
  }
}
