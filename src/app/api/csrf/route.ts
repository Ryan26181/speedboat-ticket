import { NextResponse } from 'next/server';
import { getClientCsrfToken } from '@/lib/csrf';

/**
 * GET /api/csrf
 * 
 * Returns a CSRF token for client-side use.
 * The token should be included in all mutation requests.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const token = await getClientCsrfToken();
    
    return NextResponse.json({ token });
  } catch (error) {
    console.error('[CSRF_TOKEN_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
