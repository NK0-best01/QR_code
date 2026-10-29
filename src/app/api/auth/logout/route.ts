import { NextResponse } from "next/server";
import { buildClearCookieHeader } from "@/lib/auth/session";

export async function POST() {
  const clearCookieHeader = buildClearCookieHeader();

  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );

  response.headers.set("Set-Cookie", clearCookieHeader);
  return response;
}
