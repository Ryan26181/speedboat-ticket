import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  handleApiError,
  requireAdmin,
  parsePaginationParams,
  paginatedResponse,
} from "@/lib/api-utils";

/**
 * GET /api/admin/webhook-audits
 * List webhook audit logs (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);
    
    // Filters
    const source = searchParams.get("source") || undefined;
    const status = searchParams.get("status") || undefined;
    const eventType = searchParams.get("eventType") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where = {
      ...(source && { source }),
      ...(status && { status }),
      ...(eventType && { eventType }),
      ...(startDate || endDate
        ? {
            processedAt: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
    };

    const [audits, total] = await Promise.all([
      prisma.webhookAudit.findMany({
        where,
        orderBy: { processedAt: "desc" },
        skip,
        take: limit === -1 ? undefined : limit,
      }),
      prisma.webhookAudit.count({ where }),
    ]);

    if (limit === -1) {
      return successResponse(audits);
    }

    return paginatedResponse(audits, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET /api/admin/webhook-audits");
  }
}
