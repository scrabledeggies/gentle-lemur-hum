import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the API key against EMAIL_API_KEY.
 * Accepts either `x-pal-key: <key>` or `Authorization: Bearer <key>`.
 * Returns a 401 NextResponse if invalid, or null if valid.
 */
export function requireBearer(req: NextRequest): NextResponse | null {
  const palKey = req.headers.get("x-pal-key");
  if (palKey && palKey === process.env.EMAIL_API_KEY) {
    return null;
  }

  const auth = req.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ") && auth.slice(7) === process.env.EMAIL_API_KEY) {
    return null;
  }

  return NextResponse.json({ error: "nope" }, { status: 401 });
}