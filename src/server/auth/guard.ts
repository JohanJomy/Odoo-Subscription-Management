import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, type UserRole } from "@/lib/constants";
import { HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { verifySessionToken, type SessionPayload } from "./session";

export interface AuthSessionUser {
  id: string;
  email: string;
  role: UserRole;
  customerId: string | null;
  name: string;
  active: boolean;
}

export async function getSession(request?: Request): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (match) {
        token = match.substring(SESSION_COOKIE_NAME.length + 1);
      }
    }
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Ignore context where cookies() is not available
    }
  }

  if (!token) return null;
  return await verifySessionToken(token);
}

export async function requireAuth(request?: Request): Promise<AuthSessionUser> {
  const session = await getSession(request);
  if (!session) {
    throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { customer: true },
  });

  if (!user || !user.active) {
    throw new HttpError(401, "UNAUTHORIZED", "Account is deactivated or does not exist");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role as UserRole,
    customerId: user.customerId,
    name: user.customer?.name ?? user.email.split("@")[0],
    active: user.active,
  };
}

export async function requireRole(
  allowedRoles: UserRole[],
  request?: Request
): Promise<AuthSessionUser> {
  const user = await requireAuth(request);

  if (!allowedRoles.includes(user.role)) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to access this resource");
  }

  return user;
}

/**
 * Helper to enforce customer data isolation.
 * For CUSTOMER role, automatically scopes query to their customerId.
 * For ADMIN / STAFF, returns an empty object (unrestricted).
 */
export function scopeToCustomer(session: { role: UserRole; customerId: string | null }) {
  if (session.role === "CUSTOMER") {
    if (!session.customerId) {
      throw new HttpError(403, "FORBIDDEN", "Customer profile not linked");
    }
    return { customerId: session.customerId };
  }
  return {};
}
