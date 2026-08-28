import { NextRequest, NextResponse } from "next/server";
import { getPalApiKey } from "@/lib/pal-keys";

export async function POST() {
  const key = await getPalApiKey();
  return NextResponse.json({ palApiKey: key });
}