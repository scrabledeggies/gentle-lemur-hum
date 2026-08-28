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
  const authError = requireBearer(req);
  if (authError) return authError;

  const admin = getAdminClient();
  const created: string[] = [];

  // Create bucket if missing
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (!listErr && buckets && !buckets.some((b) => b.name === "portals")) {
    const { error: bucketErr } = await admin.storage.createBucket("portals", { public: true });
    if (!bucketErr) created.push("portals");
  }

  // Create tables via RPC stubs you will manually implement once
  for (const table of PORTAL_TABLES) {
    const { error } = await admin.rpc(`create_${table}_table_if_not_exists`);
    if (!error) created.push(table);
  }

  return NextResponse.json({ created });
}