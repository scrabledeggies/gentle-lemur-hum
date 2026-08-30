import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getAdminClient } from "@/lib/db-admin";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = getAdminClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build admin client";
    return NextResponse.json({ success: false, stage: "key-format", message });
  }

  const { error } = await admin.from("pal_setup").select("id").limit(1);

  if (error) {
    console.error("[test-connection] Supabase rejected the request:", error.message);
    return NextResponse.json({
      success: false,
      stage: "supabase-request",
      message: error.message,
      code: error.code ?? null,
    });
  }

  return NextResponse.json({
    success: true,
    message: "The key works. Supabase accepted the request.",
  });
}