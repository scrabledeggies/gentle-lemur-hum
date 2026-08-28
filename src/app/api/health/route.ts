import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";

export async function GET(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  return NextResponse.json({ status: "ok" });
}