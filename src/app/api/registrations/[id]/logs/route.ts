import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { listPinLogs, NotFoundError } from "@/lib/registration-repo";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // 1. Role Guard: Admin only
  const { errorResponse } = await requireRole(request, "admin");
  if (errorResponse) {
    return errorResponse;
  }

  // 2. Parse ID param
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json(
      { error: "รหัสการลงทะเบียนไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // 3. Query Pin Logs
  try {
    const result = await listPinLogs(id);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 404 }
      );
    }

    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการดึงข้อมูลประวัติหมุด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
