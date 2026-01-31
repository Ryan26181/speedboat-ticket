import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-utils";
import { requireApiKey, API_PERMISSIONS, ApiKeyError } from "@/lib/api-key";

/**
 * GET /api/external/schedules
 * External API for fetching schedules
 * Requires API key with schedules:read permission
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API key with required permission
    const apiKey = await requireApiKey(request, [API_PERMISSIONS.SCHEDULES_READ]);

    const { searchParams } = new URL(request.url);
    const departurePortId = searchParams.get("departurePortId");
    const arrivalPortId = searchParams.get("arrivalPortId");
    const date = searchParams.get("date");
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));

    // Build query
    const where = {
      status: "SCHEDULED" as const,
      departureTime: date
        ? {
            gte: new Date(`${date}T00:00:00`),
            lt: new Date(`${date}T23:59:59`),
          }
        : { gte: new Date() },
      ...(departurePortId || arrivalPortId
        ? {
            route: {
              ...(departurePortId && { departurePortId }),
              ...(arrivalPortId && { arrivalPortId }),
            },
          }
        : {}),
    };

    const schedules = await prisma.schedule.findMany({
      where,
      take: limit,
      orderBy: { departureTime: "asc" },
      select: {
        id: true,
        departureTime: true,
        arrivalTime: true,
        price: true,
        availableSeats: true,
        status: true,
        route: {
          select: {
            id: true,
            departurePort: {
              select: { id: true, name: true, code: true, city: true },
            },
            arrivalPort: {
              select: { id: true, name: true, code: true, city: true },
            },
          },
        },
        ship: {
          select: { id: true, name: true, code: true, capacity: true },
        },
      },
    });

    return successResponse({
      schedules,
      meta: {
        apiKeyName: apiKey.name,
        count: schedules.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return errorResponse(error.message, error.status);
    }
    return handleApiError(error, "GET /api/external/schedules");
  }
}
