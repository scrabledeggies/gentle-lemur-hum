import { NextRequest, NextResponse } from "next/server";

/**
 * Validates Authorization: Bearer [EMAIL_API_KEY].
 * Returns NextResponse with 401 if invalid, or null if valid.
 */
export function requireBearer(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }
  const token = auth.slice(7);
  if (token !== process.env.EMAIL_API_KEY) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }
  return null;
}