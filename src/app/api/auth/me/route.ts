import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { messages } from "@/lib/messages";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { authenticated: false, error: messages.auth.unauthorized },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.sub,
        username: session.username,
        role: session.role,
      },
    },
    { status: 200 }
  );
}
