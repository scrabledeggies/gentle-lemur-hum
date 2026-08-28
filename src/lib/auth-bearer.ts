import { NextRequest, NextResponse } from "next/server";
import { getPalApiKey } from "./pal-keys";

/** Validates x-pal-key or Authorization against the key stored in pal_keys. */
export function requireBearer(req: NextRequest): NextResponse | null {
  const palKey = req.headers.get("x-pal-key");
  const authHeader = req.headers.get("authorization");
  const token = palKey || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!token) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }

  // Cannot synchronously return NextResponse → we must mark routes as async
  // For synchronous validation, always assume async in route handlers:
  const key = await getPalApiKey();
  if (!key || key !== token) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }
  return null;
}