import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAdmin,
  validateRequest,
  NotFoundError,
  ConflictError,
} from "@/lib/api-utils";
import { updatePortSchema } from "@/validations/port";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ports/[id]
 * Get single port by ID
 * Public access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const port = await prisma.port.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            departureRoutes: true,
            arrivalRoutes: true,
          },
        },
        departureRoutes: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            arrivalPort: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        arrivalRoutes: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            departurePort: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!port) {
      throw new NotFoundError("Port");
    }

    return successResponse({
      ...port,
      routesCount: port._count.departureRoutes + port._count.arrivalRoutes,
    });
  } catch (error) {
    return handleApiError(error, "GET_PORT");
  }
}

/**
 * PUT /api/ports/[id]
 * Update a port
 * Requires ADMIN role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if port exists
    const existingPort = await prisma.port.findUnique({
      where: { id },
    });

    if (!existingPort) {
      throw new NotFoundError("Port");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(updatePortSchema, body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.errors);
    }

    const { name, code, city, province, address, latitude, longitude, imageUrl } = validation.data;

    // Check if code is being changed and if new code already exists
    if (code && code.toUpperCase() !== existingPort.code) {
      const codeExists = await prisma.port.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (codeExists) {
        throw new ConflictError(`Port with code "${code.toUpperCase()}" already exists`);
      }
    }

    // Update port
    const port = await prisma.port.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code: code.toUpperCase() }),
        ...(city !== undefined && { city }),
        ...(province !== undefined && { province }),
        ...(address !== undefined && { address }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
      include: {
        _count: {
          select: {
            departureRoutes: true,
            arrivalRoutes: true,
          },
        },
      },
    });

    return successResponse(
      {
        ...port,
        routesCount: port._count.departureRoutes + port._count.arrivalRoutes,
      },
      "Port updated successfully"
    );
  } catch (error) {
    return handleApiError(error, "UPDATE_PORT");
  }
}

/**
 * DELETE /api/ports/[id]
 * Delete a port
 * Requires ADMIN role
 * Prevents deletion if port is used in routes
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if port exists and has routes
    const existingPort = await prisma.port.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            departureRoutes: true,
            arrivalRoutes: true,
          },
        },
      },
    });

    if (!existingPort) {
      throw new NotFoundError("Port");
    }

    // Check for existing routes
    const totalRoutes = existingPort._count.departureRoutes + existingPort._count.arrivalRoutes;
    if (totalRoutes > 0) {
      throw new ConflictError(
        `Cannot delete port used in ${totalRoutes} route(s). Please delete or update the routes first.`
      );
    }

    // Delete port
    await prisma.port.delete({
      where: { id },
    });

    return successResponse(null, "Port deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE_PORT");
  }
}
