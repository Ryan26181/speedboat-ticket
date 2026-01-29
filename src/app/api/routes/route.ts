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
  ConflictError,
} from "@/lib/api-utils";
import { createRouteSchema } from "@/validations/route";
import type { RouteStatus } from "@prisma/client";

const VALID_STATUSES: RouteStatus[] = ["ACTIVE", "INACTIVE"];

/**
 * GET /api/routes
 * Get paginated list of routes with port details
 * Public access
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);
    const search = parseSearchParam(searchParams);
    const status = parseStatusParam(searchParams, VALID_STATUSES);
    const departurePortId = searchParams.get("departurePortId");
    const arrivalPortId = searchParams.get("arrivalPortId");

    // Build where clause
    const where = {
      ...(status && { status }),
      ...(departurePortId && { departurePortId }),
      ...(arrivalPortId && { arrivalPortId }),
      ...(search && {
        OR: [
          { departurePort: { name: { contains: search, mode: "insensitive" as const } } },
          { departurePort: { city: { contains: search, mode: "insensitive" as const } } },
          { arrivalPort: { name: { contains: search, mode: "insensitive" as const } } },
          { arrivalPort: { city: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };

    // If limit is -1, return all routes (useful for dropdowns)
    if (limit === -1) {
      const routes = await prisma.route.findMany({
        where,
        orderBy: { createdAt: "desc" },
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

      return successResponse(routes);
    }

    // Get paginated routes
    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
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
      }),
      prisma.route.count({ where }),
    ]);

    return paginatedResponse(routes, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET_ROUTES");
  }
}

/**
 * POST /api/routes
 * Create a new route
 * Requires ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    await requireAdmin();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createRouteSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_ROUTE"
      );
    }

    const { departurePortId, arrivalPortId, distance, estimatedDuration, basePrice, status } = validation.data;

    // Check if both ports exist
    const [departurePort, arrivalPort] = await Promise.all([
      prisma.port.findUnique({ where: { id: departurePortId } }),
      prisma.port.findUnique({ where: { id: arrivalPortId } }),
    ]);

    if (!departurePort) {
      throw new ConflictError("Departure port not found");
    }

    if (!arrivalPort) {
      throw new ConflictError("Arrival port not found");
    }

    // Check if route already exists (unique constraint)
    const existingRoute = await prisma.route.findUnique({
      where: {
        departurePortId_arrivalPortId: {
          departurePortId,
          arrivalPortId,
        },
      },
    });

    if (existingRoute) {
      throw new ConflictError(
        `Route from ${departurePort.name} to ${arrivalPort.name} already exists`
      );
    }

    // Create route
    const route = await prisma.route.create({
      data: {
        departurePortId,
        arrivalPortId,
        distance,
        estimatedDuration,
        basePrice,
        status: status || "ACTIVE",
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

    return successResponse(route, "Route created successfully", 201);
  } catch (error) {
    return handleApiError(error, "CREATE_ROUTE");
  }
}
