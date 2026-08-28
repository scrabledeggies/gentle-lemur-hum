import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://etjkljrlffjolrsuwlrn.supabase.co";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";

  // Never intercept the Vercel deployment domain or local dev.
  if (host.endsWith(".vercel.app") || host.startsWith("localhost")) {
    return NextResponse.next();
  }

  const parts = host.split(".");
  if (parts.length < 3) {
    // No subdomain label present (e.g. "example.com")
    return NextResponse.next();
  }

  const rootDomain = parts.slice(1).join(".");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/domains?domain_name=eq.${encodeURIComponent(rootDomain)}&select=id`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      },
    );
    const matches = res.ok ? await res.json() : [];

    if (Array.isArray(matches) && matches.length > 0) {
      const url = req.nextUrl.clone();
      url.pathname = "/router";
      url.search = "";
      url.searchParams.set("s", parts[0]);
      return NextResponse.rewrite(url);
    }
  } catch {
    // If the lookup fails, serve the app normally instead of breaking the request.
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};