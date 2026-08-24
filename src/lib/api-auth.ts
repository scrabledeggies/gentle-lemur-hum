import { NextRequest } from "next/server";

/**
 * Verifies the `x-api-key` header against the EMAIL_API_KEY secret.
 * Used to protect server-to-server endpoints (e.g. called by KittyConsole).
 */
export function isValidApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key");
  return !!apiKey && apiKey === process.env.EMAIL_API_KEY;
}