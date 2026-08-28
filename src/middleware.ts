import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  // Subdomain routing: root domain from first label
  const rootDomain = host.split(".").slice(1).join(".") || host;
  if (rootDomain && host.endsWith(`.${rootDomain}`) && host !== rootDomain) {
    const url = req.nextUrl.clone();
    url.pathname = `/router${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}