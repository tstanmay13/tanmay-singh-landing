import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "blog_admin_session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

/**
 * Create an HMAC-SHA256 signed session token.
 * Format: {timestamp}.{hmac_hex}
 */
export function createSessionToken(): string {
  const secret = process.env.BLOG_ADMIN_SECRET;
  if (!secret) throw new Error("BLOG_ADMIN_SECRET is not set");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const hmac = createHmac("sha256", secret).update(timestamp).digest("hex");
  return `${timestamp}.${hmac}`;
}

/**
 * Build a Set-Cookie header value for the session cookie.
 */
export function buildSessionCookie(token: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=${token}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=${SESSION_MAX_AGE}`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Build a Set-Cookie header value that clears the session cookie.
 */
export function buildClearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const parts = [
    `${COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    `Max-Age=0`,
  ];
  if (isProduction) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Verify the admin session cookie from a request.
 * Returns true if the cookie contains a valid, non-expired HMAC token.
 */
export function verifyAdminSession(request: Request): boolean {
  const secret = process.env.BLOG_ADMIN_SECRET;
  if (!secret) return false;

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return false;

  // Parse the session cookie
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!sessionCookie) return false;

  const token = sessionCookie.substring(COOKIE_NAME.length + 1);
  if (!token) return false;

  // Split into timestamp and hmac
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return false;

  const timestamp = token.substring(0, dotIndex);
  const providedHmac = token.substring(dotIndex + 1);

  if (!timestamp || !providedHmac) return false;

  // Recompute the HMAC
  const expectedHmac = createHmac("sha256", secret)
    .update(timestamp)
    .digest("hex");

  // Constant-time comparison of HMACs
  try {
    const providedBuf = Buffer.from(providedHmac, "hex");
    const expectedBuf = Buffer.from(expectedHmac, "hex");
    if (providedBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(providedBuf, expectedBuf)) return false;
  } catch {
    return false;
  }

  // Check expiration
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - tokenTime > SESSION_MAX_AGE) return false;

  return true;
}

/**
 * Compare a password against the stored admin password using constant-time comparison.
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.BLOG_ADMIN_PASSWORD;
  if (!adminPassword) return false;

  try {
    const providedBuf = Buffer.from(password, "utf-8");
    const expectedBuf = Buffer.from(adminPassword, "utf-8");

    if (providedBuf.length !== expectedBuf.length) {
      // Still do a comparison to avoid timing leaks on length
      timingSafeEqual(expectedBuf, expectedBuf);
      return false;
    }

    return timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
