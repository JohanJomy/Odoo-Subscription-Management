import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { SESSION_COOKIE_NAME, type UserRole } from "@/lib/constants";

const rawSecret =
  process.env.JWT_SECRET ??
  process.env.SESSION_SECRET ??
  "dev-jwt-secret-loopledger-32bytes-long";
const secret = new TextEncoder().encode(rawSecret);

interface TokenPayload {
  sub: string;
  role: UserRole;
  customerId: string | null;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return {
      sub: payload.sub as string,
      role: payload.role as UserRole,
      customerId: (payload.customerId as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

const PUBLIC_AUTH_PATHS = ["/login", "/signup", "/forgot", "/reset"];
const ADMIN_ONLY_PATHS = ["/team", "/audit"];
const STAFF_ADMIN_PATHS = [
  "/dashboard",
  "/inbox",
  "/customers",
  "/subscriptions",
  "/invoices",
  "/payments",
  "/billing",
  "/catalog",
  "/pricing",
  "/team",
  "/audit",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next internal files, public files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // APIs do their own authorization with HTTP status codes (401/403)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  const isPublicAuthPage = PUBLIC_AUTH_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  // If visiting public auth page with valid session, redirect to home workspace
  if (isPublicAuthPage) {
    if (session) {
      const destination =
        session.role === "CUSTOMER" ? "/my/subscriptions" : "/dashboard";
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  // Root path routing
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const destination =
      session.role === "CUSTOMER" ? "/my/subscriptions" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // Customer portal routes
  if (pathname.startsWith("/my")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Admin/Staff routes
  const isStaffAdminPath = STAFF_ADMIN_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isStaffAdminPath) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Customers cannot access admin/staff routes
    if (session.role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/my/subscriptions", request.url));
    }

    // Admin-only paths
    const isAdminOnly = ADMIN_ONLY_PATHS.some((path) =>
      pathname.startsWith(path)
    );
    if (isAdminOnly && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
