import { NextRequest, NextResponse } from "next/server";

/** Next.js middleware: CORS headers for extension requests + basic security */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // CORS for Chrome extension
  const origin = request.headers.get("origin");
  if (origin?.startsWith("chrome-extension://")) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
