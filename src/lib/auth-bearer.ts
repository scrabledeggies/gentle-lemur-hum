import { NextRequest, NextResponse } from "next/server";
import { getPalApiKey } from "./pal-keys";

/** Validates x-pal-key or Authorization: Bearer against the key stored in pal_setup. */
export async function requireBearer(req: NextRequest): Promise<NextResponse | null> {
  const palKey = req.headers.get("x-pal-key");
  const authHeader = req.headers.get("authorization");
  const token = palKey || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!token) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }

  const key = await getPalApiKey();
  if (!key || key !== token) {
    return NextResponse.json({ error: "nope" }, { status: 401 });
  }
  return null;
}