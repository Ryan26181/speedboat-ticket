import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, handleApiError } from "@/lib/api-utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateRoleSchema = z.object({
  role: z.enum(["USER", "ADMIN", "OPERATOR"], {
    error: "Invalid role. Must be USER, ADMIN, or OPERATOR",
  }),
});

// PUT /api/admin/users/[id]/role - Update user role
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAdmin();
    const { id } = await context.params;

    // Prevent changing own role
    if (currentUser.id === id) {
      return NextResponse.json(
        { success: false, message: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { role } = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser,
    });
  } catch (error) {
    return handleApiError(error, "Failed to update user role");
  }
}
