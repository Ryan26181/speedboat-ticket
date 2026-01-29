import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  paginatedResponse,
  handleApiError,
  requireAdmin,
  validateRequest,
  parsePaginationParams,
  parseSearchParam,
  parseStatusParam,
} from "@/lib/api-utils";
import { createShipSchema } from "@/validations/ship";
import type { ShipStatus } from "@prisma/client";

const VALID_STATUSES: ShipStatus[] = ["ACTIVE", "MAINTENANCE", "INACTIVE"];

/**
 * GET /api/ships
 * Get paginated list of ships
 * Public access (for search)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);
    const search = parseSearchParam(searchParams);
    const status = parseStatusParam(searchParams, VALID_STATUSES);

    // Build where clause
    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { code: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status && { status }),
    };

    // If limit is -1, return all ships (useful for dropdowns)
    if (limit === -1) {
      const ships = await prisma.ship.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { schedules: true },
          },
        },
      });

      return successResponse(ships);
    }

    // Get paginated ships
    const [ships, total] = await Promise.all([
      prisma.ship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { schedules: true },
          },
        },
      }),
      prisma.ship.count({ where }),
    ]);

    return paginatedResponse(ships, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET_SHIPS");
  }
}

/**
 * POST /api/ships
 * Create a new ship
 * Requires ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    await requireAdmin();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createShipSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_SHIP"
      );
    }

    const { name, code, capacity, description, facilities, imageUrl, status } = validation.data;

    // Create ship
    const ship = await prisma.ship.create({
      data: {
        name,
        code,
        capacity,
        description: description || null,
        facilities: facilities || [],
        imageUrl: imageUrl || null,
        status: status || "ACTIVE",
      },
      include: {
        _count: {
          select: { schedules: true },
        },
      },
    });

    return successResponse(ship, "Ship created successfully", 201);
  } catch (error) {
    return handleApiError(error, "CREATE_SHIP");
  }
}
