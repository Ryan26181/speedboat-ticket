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
import { updateShipSchema } from "@/validations/ship";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/ships/[id]
 * Get single ship by ID
 * Public access
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const ship = await prisma.ship.findUnique({
      where: { id },
      include: {
        _count: {
          select: { schedules: true },
        },
        schedules: {
          where: {
            departureTime: { gte: new Date() },
          },
          take: 5,
          orderBy: { departureTime: "asc" },
          include: {
            route: {
              include: {
                departurePort: true,
                arrivalPort: true,
              },
            },
          },
        },
      },
    });

    if (!ship) {
      throw new NotFoundError("Ship");
    }

    return successResponse(ship);
  } catch (error) {
    return handleApiError(error, "GET_SHIP");
  }
}

/**
 * PUT /api/ships/[id]
 * Update a ship
 * Requires ADMIN role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if ship exists
    const existingShip = await prisma.ship.findUnique({
      where: { id },
    });

    if (!existingShip) {
      throw new NotFoundError("Ship");
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(updateShipSchema, body);

    if (!validation.success) {
      return errorResponse("Validation failed", 400, validation.errors);
    }

    const { name, code, capacity, description, facilities, imageUrl, status } = validation.data;

    // Update ship
    const ship = await prisma.ship.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(capacity !== undefined && { capacity }),
        ...(description !== undefined && { description }),
        ...(facilities !== undefined && { facilities }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(status !== undefined && { status }),
      },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
    });

    return successResponse(ship, "Ship updated successfully");
  } catch (error) {
    return handleApiError(error, "UPDATE_SHIP");
  }
}

/**
 * DELETE /api/ships/[id]
 * Delete a ship
 * Requires ADMIN role
 * Prevents deletion if ship has future schedules
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check admin authorization
    await requireAdmin();

    const { id } = await params;

    // Check if ship exists
    const existingShip = await prisma.ship.findUnique({
      where: { id },
      include: {
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

    if (!existingShip) {
      throw new NotFoundError("Ship");
    }

    // Check for future schedules
    if (existingShip._count.schedules > 0) {
      throw new ConflictError(
        `Cannot delete ship with ${existingShip._count.schedules} upcoming schedule(s). Please cancel or reassign them first.`
      );
    }

    // Delete ship
    await prisma.ship.delete({
      where: { id },
    });

    return successResponse(null, "Ship deleted successfully");
  } catch (error) {
    return handleApiError(error, "DELETE_SHIP");
  }
}
