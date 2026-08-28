import { NextRequest, NextResponse } from "next/server";
import { requireBearer } from "@/lib/auth-bearer";

interface DispatchBody {
  module?: string;
  action?: string;
  agent_id?: string;
  freestyle?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const authError = await requireBearer(req);
  if (authError) return authError;

  let body: DispatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const module = body.module ?? "freestyle";
  const action = body.action ?? "run";

  console.log("[dispatcher] call", {
    module,
    action,
    agent_id: body.agent_id ?? null,
  });

  return NextResponse.json({
    ok: true,
    module,
    action,
    received: {
      agent_id: body.agent_id ?? null,
      freestyle: body.freestyle ?? null,
      payload: body.payload ?? null,
    },
  });
}