import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import {
  updatePin,
  NotFoundError,
  NotRegisteredError,
  PinOutsideProvinceError,
} from "@/lib/registration-repo";

const coordsSchema = z.object({
  latitude: z
    .number({ message: "กรุณาระบุละติจูด" })
    .min(-90, "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90")
    .max(90, "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90"),
  longitude: z
    .number({ message: "กรุณาระบุลองจิจูด" })
    .min(-180, "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180")
    .max(180, "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180"),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // 1. Role Guard: Admin only
  const { session, errorResponse } = await requireRole(request, "admin");
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

  // 3. Parse Body JSON
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูล JSON ไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const parseResult = coordsSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const errorMsg =
      parseResult.error.issues?.[0]?.message || "พิกัดละติจูดหรือลองจิจูดไม่ถูกต้อง";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { latitude, longitude } = parseResult.data;
  const actorId = parseInt(session.sub, 10);

  // 4. Update Pin Execution
  try {
    const record = await updatePin(id, { latitude, longitude }, actorId);
    return NextResponse.json(record, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 404 }
      );
    }
    if (error instanceof PinOutsideProvinceError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 400 }
      );
    }
    if (error instanceof NotRegisteredError) {
      return NextResponse.json(
        { code: error.code, error: error.message },
        { status: 409 }
      );
    }

    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการแก้ไขพิกัดหมุด";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
