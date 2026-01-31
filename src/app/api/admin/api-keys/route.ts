import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  handleApiError,
  requireAdmin,
  parsePaginationParams,
  paginatedResponse,
} from "@/lib/api-utils";
import { generateApiKey, API_PERMISSIONS } from "@/lib/api-key";
import { z } from "zod";

// Validation schema for creating API key
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).min(1),
  expiresInDays: z.number().optional(), // Optional expiration
});

/**
 * GET /api/admin/api-keys
 * List all API keys (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        select: {
          id: true,
          name: true,
          permissions: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit === -1 ? undefined : limit,
      }),
      prisma.apiKey.count(),
    ]);

    if (limit === -1) {
      return successResponse(keys);
    }

    return paginatedResponse(keys, total, page, limit);
  } catch (error) {
    return handleApiError(error, "GET /api/admin/api-keys");
  }
}

/**
 * POST /api/admin/api-keys
 * Create a new API key (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();

    const body = await request.json();
    const parsed = createApiKeySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 400, 
        parsed.error.flatten().fieldErrors as Record<string, string[]>
      );
    }

    const { name, permissions, expiresInDays } = parsed.data;

    // Validate permissions
    const validPermissions = Object.values(API_PERMISSIONS);
    const invalidPerms = permissions.filter(
      (p) => !validPermissions.includes(p as typeof validPermissions[number])
    );
    if (invalidPerms.length > 0) {
      return errorResponse(`Invalid permissions: ${invalidPerms.join(", ")}`, 400);
    }

    // Generate the API key
    const { plainKey, hashedKey } = generateApiKey();

    // Calculate expiration date
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Store in database
    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        hashedKey,
        permissions,
        userId: admin.id,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the plain key (ONLY TIME it's visible)
    return successResponse(
      {
        ...apiKey,
        key: plainKey, // This is the only time the user sees the plain key
      },
      "API key created successfully. Save the key now - it won't be shown again.",
      201
    );
  } catch (error) {
    return handleApiError(error, "POST /api/admin/api-keys");
  }
}
