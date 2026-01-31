import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
} from "@/lib/api-utils";
import { requireApiKey, API_PERMISSIONS, ApiKeyError } from "@/lib/api-key";

/**
 * GET /api/external/bookings
 * External API for fetching bookings
 * Requires API key with bookings:read permission
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API key with required permission
    const apiKey = await requireApiKey(request, [API_PERMISSIONS.BOOKINGS_READ]);

    const { searchParams } = new URL(request.url);
    const bookingCode = searchParams.get("bookingCode");
    const status = searchParams.get("status");
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const page = parseInt(searchParams.get("page") || "1", 10);
    const skip = (page - 1) * limit;

    // Build query
    const where = {
      ...(bookingCode && { bookingCode }),
      ...(status && { status: status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          bookingCode: true,
          status: true,
          totalAmount: true,
          totalPassengers: true,
          createdAt: true,
          schedule: {
            select: {
              id: true,
              departureTime: true,
              arrivalTime: true,
              route: {
                select: {
                  departurePort: { select: { name: true, code: true } },
                  arrivalPort: { select: { name: true, code: true } },
                },
              },
              ship: { select: { name: true, code: true } },
            },
          },
          passengers: {
            select: {
              id: true,
              name: true,
              identityType: true,
            },
          },
          tickets: {
            select: {
              id: true,
              ticketCode: true,
              status: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return successResponse({
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        apiKeyName: apiKey.name,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiKeyError) {
      return errorResponse(error.message, error.status);
    }
    return handleApiError(error, "GET /api/external/bookings");
  }
}
