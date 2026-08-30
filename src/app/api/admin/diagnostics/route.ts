import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const deploymentInfo = {
    vercelEnv: process.env.VERCEL_ENV ?? "unknown",
    commitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown (enable 'Automatically expose System Environment Variables' in Vercel Project Settings to see this)",
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? "unknown",
  };

  if (!rawKey) {
    return NextResponse.json({
      exists: false,
      message: "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment at all.",
      ...deploymentInfo,
    });
  }

  const trimmed = rawKey.trim().replace(/^['"]|['"]$/g, "");
  const hasWhitespaceOrQuotes = trimmed !== rawKey;

  const looksLegacyJwt = trimmed.startsWith("eyJ");
  const looksNewSecret = trimmed.startsWith("sb_secret_");
  const looksPublishable = trimmed.startsWith("sb_publishable");

  return NextResponse.json({
    exists: true,
    length: rawKey.length,
    prefixPreview: trimmed.slice(0, 12) + "...",
    hasWhitespaceOrQuotes,
    looksLegacyJwt,
    looksNewSecret,
    looksPublishable,
    ...deploymentInfo,
  });
}