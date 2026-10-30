import { NextRequest, NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/lib/auth/session";

export async function POST(request?: NextRequest) {
  const clearCookieHeader = buildClearCookieHeader();
  const acceptHeader = request?.headers.get("accept") || "";

  // If submitted via standard HTML <form action="/api/auth/logout" method="POST">, redirect to /login
  if (acceptHeader.includes("text/html") && request) {
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto");

    let redirectBase: URL;
    try {
      redirectBase = new URL(request.url);
      if (hostHeader) {
        redirectBase.host = hostHeader;
      }
      if (proto) {
        redirectBase.protocol = proto.endsWith(":") ? proto : `${proto}:`;
      }
      if (redirectBase.hostname === "0.0.0.0") {
        redirectBase.hostname = "localhost";
      }
    } catch {
      redirectBase = new URL("http://localhost:3000");
    }

    const loginUrl = new URL("/login", redirectBase);
    const response = NextResponse.redirect(loginUrl, 303);
    response.headers.set("Set-Cookie", clearCookieHeader);
    return response;
  }

  // If requested via fetch/ajax or directly invoked in test, respond with JSON
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );

  response.headers.set("Set-Cookie", clearCookieHeader);
  return response;
}
