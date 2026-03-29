import { NextRequest, NextResponse } from 'next/server';

// Global middleware for basic request handling and cache optimization
// Note: Middleware runs in the Edge Runtime. Node.js specific modules like 'crypto', 'net', 'tls' are not available here.
// Rate limiting and token budgeting are handled within the API routes (Node.js runtime)
// using the withRateLimit and withTokenBudget wrappers.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets, public files, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.includes('.') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  const response = NextResponse.next();
  
  // Add cache optimization headers for static-like content
  if (pathname.startsWith('/api/health') || pathname.startsWith('/api/cache/health')) {
    // Health endpoints can be cached for 1 minute
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  } else if (pathname.includes('/tmdb/cache/health')) {
    // TMDB cache health can be cached for 30 seconds
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
  } else if (pathname.startsWith('/api/trending') || pathname.startsWith('/api/gallery')) {
    // Gallery and trending can be cached for 5 minutes at edge
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
  } else if (pathname.startsWith('/api/fusion/')) {
    // Fusion share endpoints can be cached for 1 hour
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200');
  } else if (pathname === '/accessibility') {
    // Static pages can be cached for 24 hours
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, immutable');
  } else if (pathname.startsWith('/api/')) {
    // Default API caching - conservative
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    // Pages - allow edge caching with revalidation
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=900');
  }
  
  // Add comprehensive security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Add performance hints
  response.headers.set('Vary', 'Accept-Encoding, Accept');
  
  return response;
}

// Configure middleware matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
