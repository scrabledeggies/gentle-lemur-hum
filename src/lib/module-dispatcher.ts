import { NextRequest, NextResponse } from "next/server";
import { requirePalKey } from "@/lib/require-pal-key";

export async function handleGenericModule(req: NextRequest, moduleName: string) {
  const authorized = await requirePalKey(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  console.log(`[module-dispatcher] ${moduleName} received request`, body);

  return NextResponse.json({ ok: true, module: moduleName });
}