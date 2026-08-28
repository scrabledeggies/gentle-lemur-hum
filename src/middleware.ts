import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const root = process.env.ROOT_DOMAIN;

  // Only route to the portal renderer when ROOT_DOMAIN is configured
  // and the request host is a strict subdomain of it (not the naked domain).
  if (root && host !== root && host.endsWith(`.${root}`)) {
    const url = req.nextUrl.clone();
    url.pathname = `/router${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}