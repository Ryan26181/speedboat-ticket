/**
 * File Upload API Route
 * 
 * POST /api/upload
 * 
 * Handles image uploads to the public/images directory.
 * Supports port images, ship images, etc.
 * 
 * Security measures:
 * - Admin-only access
 * - File type validation (MIME type + extension)
 * - File size limit (5MB)
 * - Unique filename generation (prevents overwrite)
 * - Category whitelist (prevents path traversal)
 * - Magic bytes validation for images
 */

import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { successResponse, errorResponse, handleApiError, requireAdmin } from "@/lib/api-utils";

// Allowed image types with their magic bytes signatures
const ALLOWED_TYPES: Record<string, { mimeTypes: string[]; extensions: string[]; magicBytes: number[][] }> = {
  jpeg: {
    mimeTypes: ["image/jpeg"],
    extensions: [".jpg", ".jpeg"],
    magicBytes: [[0xFF, 0xD8, 0xFF]], // JPEG signature
  },
  png: {
    mimeTypes: ["image/png"],
    extensions: [".png"],
    magicBytes: [[0x89, 0x50, 0x4E, 0x47]], // PNG signature
  },
  webp: {
    mimeTypes: ["image/webp"],
    extensions: [".webp"],
    magicBytes: [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP container)
  },
  gif: {
    mimeTypes: ["image/gif"],
    extensions: [".gif"],
    magicBytes: [[0x47, 0x49, 0x46, 0x38]], // GIF87a or GIF89a
  },
};

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Valid upload categories (whitelist prevents path traversal)
const VALID_CATEGORIES = ["ports", "ships", "routes", "general"] as const;
type UploadCategory = typeof VALID_CATEGORIES[number];

/**
 * Validate file magic bytes to ensure it's a real image
 */
function validateMagicBytes(buffer: Buffer): boolean {
  for (const type of Object.values(ALLOWED_TYPES)) {
    for (const signature of type.magicBytes) {
      if (buffer.length >= signature.length) {
        const matches = signature.every((byte, index) => buffer[index] === byte);
        if (matches) return true;
      }
    }
  }
  return false;
}

/**
 * Validate file extension matches MIME type
 */
function validateExtension(filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  for (const type of Object.values(ALLOWED_TYPES)) {
    if (type.mimeTypes.includes(mimeType) && type.extensions.includes(ext)) {
      return true;
    }
  }
  return false;
}

/**
 * Get allowed MIME types as flat array
 */
function getAllowedMimeTypes(): string[] {
  return Object.values(ALLOWED_TYPES).flatMap(t => t.mimeTypes);
}

/**
 * Generate a secure unique filename (no user input in filename)
 */
function generateSecureFilename(originalName: string): string {
  // Only take the extension, sanitize it
  let ext = path.extname(originalName).toLowerCase();
  // Ensure extension is valid
  const validExtensions = Object.values(ALLOWED_TYPES).flatMap(t => t.extensions);
  if (!validExtensions.includes(ext)) {
    ext = ".jpg"; // Default to jpg if invalid
  }
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}${ext}`;
}

/**
 * POST /api/upload
 * Upload a file
 * Requires ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    await requireAdmin();

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";

    // Validate category (whitelist - prevents path traversal)
    if (!VALID_CATEGORIES.includes(category as UploadCategory)) {
      return errorResponse(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`, 400);
    }

    // Validate file exists
    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate MIME type
    const allowedMimeTypes = getAllowedMimeTypes();
    if (!allowedMimeTypes.includes(file.type)) {
      return errorResponse(`Invalid file type. Allowed types: JPG, PNG, WebP, GIF`, 400);
    }

    // Validate extension matches MIME type (prevents extension spoofing)
    if (!validateExtension(file.name, file.type)) {
      return errorResponse("File extension does not match file type", 400);
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return errorResponse(`File too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB`, 400);
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate magic bytes (ensures file is actually an image)
    if (!validateMagicBytes(buffer)) {
      return errorResponse("Invalid file content. File does not appear to be a valid image.", 400);
    }

    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "public", "images", category);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate secure unique filename (no user input)
    const filename = generateSecureFilename(file.name);
    const filepath = path.join(uploadDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Return the public URL
    const publicUrl = `/images/${category}/${filename}`;

    return successResponse(
      {
        url: publicUrl,
        filename,
        size: file.size,
        type: file.type,
      },
      "File uploaded successfully"
    );
  } catch (error) {
    return handleApiError(error, "UPLOAD_FILE");
  }
}
