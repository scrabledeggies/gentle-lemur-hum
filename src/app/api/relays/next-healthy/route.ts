import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { requireBearer } from "@/lib/auth-bearer";

interface PublicRelay {
  id: string;
  host: string;
  port: number;
  username: string;
}

export async function GET(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  const { data, error } = await supabaseAdmin.rpc("get_next_healthy_relay_public");

  if (error) {
    console.error("[relays-next-healthy] Failed to fetch relay:", error.message);
    return NextResponse.json({ error: "Failed to look up a healthy relay" }, { status: 500 });
  }

  const relay = (data as PublicRelay[] | null)?.[0];

  if (!relay) {
    return NextResponse.json(
      { error: "No healthy relay available with remaining daily capacity" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    id: relay.id,
    host: relay.host,
    port: relay.port,
    username: relay.username,
  });
}