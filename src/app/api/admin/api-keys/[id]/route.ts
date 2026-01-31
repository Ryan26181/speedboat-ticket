import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAdmin,
} from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/api-keys/[id]
 * Get single API key details (admin only)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!apiKey) {
      return errorResponse("API key not found", 404);
    }

    return successResponse(apiKey);
  } catch (error) {
    return handleApiError(error, "GET /api/admin/api-keys/[id]");
  }
}

/**
 * PATCH /api/admin/api-keys/[id]
 * Update API key (name, permissions) (admin only)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const body = await request.json();
    const { name, permissions } = body;

    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("API key not found", 404);
    }

    if (existing.revokedAt) {
      return errorResponse("Cannot update a revoked key", 400);
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "API key updated");
  } catch (error) {
    return handleApiError(error, "PATCH /api/admin/api-keys/[id]");
  }
}

/**
 * DELETE /api/admin/api-keys/[id]
 * Revoke API key (admin only)
 * Note: We don't actually delete - we revoke for audit purposes
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("API key not found", 404);
    }

    if (existing.revokedAt) {
      return errorResponse("API key is already revoked", 400);
    }

    await prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return successResponse(null, "API key revoked successfully");
  } catch (error) {
    return handleApiError(error, "DELETE /api/admin/api-keys/[id]");
  }
}
