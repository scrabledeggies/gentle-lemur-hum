import { NextRequest } from "next/server";
import { getPalApiKey } from "@/lib/pal-keys";

export async function requirePalKey(req: NextRequest): Promise<boolean> {
  const key = req.headers.get("x-pal-key");
  if (!key) return false;

  try {
    const validKey = await getPalApiKey();
    return key === validKey;
  } catch (err) {
    console.error(
      "[require-pal-key] Failed to load API key:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}