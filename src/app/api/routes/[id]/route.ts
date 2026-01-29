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
import { updateRouteSchema } from "@/validations/route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/routes/[id]
 * Get single route by ID with port details
 * Public access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const route = await prisma.route.findUnique({
      where: { id },
      include: {
        departurePort: true,
        arrivalPort: true,
        _count: {
          select: { schedules: true },
        },
        schedules: {
          where: {
            departureTime: { gte: new Date() },
            status: "SCHEDULED",
          },
          take: 10,
          orderBy: { departureTime: "asc" },
          include: {
            ship: {
              select: { id: true, name: true, code: true, capacity: true },
            },
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundError("Route");
    }

    return successResponse(route);
  } catch (error) {
    return handleApiError(error, "GET_ROUTE");
  }
}

/**
 * PUT /api/routes/[id]
 * Update a route
 * Requires ADMIN role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if route exists
    const existingRoute = await prisma.route.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      throw new NotFoundError("Route");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(updateRouteSchema, body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.errors);
    }

    const { distance, estimatedDuration, basePrice, status } = validation.data;

    // Update route
    const route = await prisma.route.update({
      where: { id },
      data: {
        ...(distance !== undefined && { distance }),
        ...(estimatedDuration !== undefined && { estimatedDuration }),
        ...(basePrice !== undefined && { basePrice }),
        ...(status !== undefined && { status }),
      },
      include: {
        departurePort: {
          select: { id: true, name: true, code: true, city: true },
        },
        arrivalPort: {
          select: { id: true, name: true, code: true, city: true },
        },
        _count: {
          select: { schedules: true },
        },
      },
    });

    return successResponse(route, "Route updated successfully");
  } catch (error) {
    return handleApiError(error, "UPDATE_ROUTE");
  }
}

/**
 * DELETE /api/routes/[id]
 * Delete a route
 * Requires ADMIN role
 * Prevents deletion if route has future schedules
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if route exists and has future schedules
    const existingRoute = await prisma.route.findUnique({
      where: { id },
      include: {
        departurePort: { select: { name: true } },
        arrivalPort: { select: { name: true } },
        _count: {
          select: {
            schedules: {
              where: {
                departureTime: { gte: new Date() },
              },
            },
          },
        },
      },
    });

    if (!existingRoute) {
      throw new NotFoundError("Route");
    }

    // Check for future schedules
    if (existingRoute._count.schedules > 0) {
      throw new ConflictError(
        `Cannot delete route with ${existingRoute._count.schedules} upcoming schedule(s). Please cancel or delete them first.`
      );
    }

    // Delete route
    await prisma.route.delete({
      where: { id },
    });

    return successResponse(null, "Route deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE_ROUTE");
  }
}
