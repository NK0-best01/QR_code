import { NextRequest, NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/lib/auth/session";

export async function POST(request?: NextRequest) {
  const clearCookieHeader = buildClearCookieHeader();
  const acceptHeader = request?.headers.get("accept") || "";

  // If submitted via standard HTML <form action="/api/auth/logout" method="POST">, redirect to /login
  if (acceptHeader.includes("text/html") && request?.url) {
    const loginUrl = new URL("/login", request.url);
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
