import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  paginatedResponse,
  handleApiError,
  requireAdmin,
  validateRequest,
  ConflictError,
} from "@/lib/api-utils";
import { createPortSchema } from "@/validations/port";
import { memoryCache, CACHE_KEYS, CACHE_TTL } from "@/lib/memory-cache";

/**
 * GET /api/ports
 * Get paginated list of ports
 * Public access (for search/dropdowns)
 * OPTIMIZED: Uses in-memory caching for frequent requests
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search")?.trim();

    // Build where clause
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    // If limit is -1, return all ports (useful for dropdowns) - CACHED
    if (limitParam === "-1" && !search) {
      const ports = await memoryCache.getOrSet(
        CACHE_KEYS.PORTS_ALL,
        async () => {
          const allPorts = await prisma.port.findMany({
            where: {},
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: {
                  departureRoutes: true,
                  arrivalRoutes: true,
                },
              },
            },
          });
          return allPorts.map((port) => ({
            ...port,
            routesCount: port._count.departureRoutes + port._count.arrivalRoutes,
          }));
        },
        CACHE_TTL.PORTS
      );
      return successResponse(ports);
    }

    // Non-cached path for search/pagination
    if (limitParam === "-1") {
      const ports = await prisma.port.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              departureRoutes: true,
              arrivalRoutes: true,
            },
          },
        },
      });

      const portsWithCount = ports.map((port) => ({
        ...port,
        routesCount: port._count.departureRoutes + port._count.arrivalRoutes,
      }));

      return successResponse(portsWithCount);
    }

    const limit = Math.min(100, Math.max(1, parseInt(limitParam || "10", 10)));
    const skip = (page - 1) * limit;

    // Get paginated ports
    const [ports, total] = await Promise.all([
      prisma.port.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              departureRoutes: true,
              arrivalRoutes: true,
            },
          },
        },
      }),
      prisma.port.count({ where }),
    ]);

    // Add computed routesCount
    const portsWithCount = ports.map((port) => ({
      ...port,
      routesCount: port._count.departureRoutes + port._count.arrivalRoutes,
    }));

    return paginatedResponse(portsWithCount, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET_PORTS");
  }
}

/**
 * POST /api/ports
 * Create a new port
 * Requires ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    await requireAdmin();

    // Parse and validate request body
    const body = await request.json();
    const validation = await validateRequest(createPortSchema, body);

    if (!validation.success) {
      return handleApiError(
        { name: "ValidationError", message: "Validation failed", errors: validation.errors },
        "CREATE_PORT"
      );
    }

    const { name, code, city, province, address, latitude, longitude, imageUrl } = validation.data;

    // Check if port code already exists
    const existingPort = await prisma.port.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (existingPort) {
      throw new ConflictError(`Port with code "${code.toUpperCase()}" already exists`);
    }

    // Create port
    const port = await prisma.port.create({
      data: {
        name,
        code: code.toUpperCase(),
        city,
        province,
        address: address || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        imageUrl: imageUrl || null,
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
      "Port created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, "CREATE_PORT");
  }
}
