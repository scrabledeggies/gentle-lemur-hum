import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/db-admin";
import { requireBearer } from "@/lib/auth-bearer";

const PORTAL_TABLES = [
  "domains",
  "subdomains",
  "html_sites",
  "sessions",
  "presets",
  "bans",
] as const;

export async function POST(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const admin = getAdminClient();
  const status: Record<string, string> = {};

  for (const table of PORTAL_TABLES) {
    const { error } = await admin.from(table).select("id").limit(1);
    status[table] = error ? `missing: ${error.message}` : "ok";
  }

  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    status["portals bucket"] = `error: ${listErr.message}`;
  } else {
    const exists = buckets?.some((b) => b.name === "portals");
    if (exists) {
      status["portals bucket"] = "already existed";
    } else {
      const { error: createErr } = await admin.storage.createBucket("portals", { public: true });
      status["portals bucket"] = createErr ? `error: ${createErr.message}` : "created";
    }
  }

  const created = Object.entries(status)
    .filter(([, v]) => v === "ok" || v === "created" || v === "already existed")
    .map(([k]) => k);

  return NextResponse.json({ created, status });
}