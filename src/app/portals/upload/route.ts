import { NextRequest } from "next/server";
import { handleGenericModule } from "@/lib/module-dispatcher";

export async function POST(req: NextRequest) {
  return handleGenericModule(req, "portals-upload");
}