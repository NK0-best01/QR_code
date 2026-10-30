import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/guards';
import { extractCoordinatesFromText } from '@/lib/google-maps';

const resolveSchema = z.object({
  url: z.string().url('กรุณาระบุ URL ที่ถูกต้อง'),
});

export async function POST(request: NextRequest) {
  // 1. Guard: Admin only
  const { errorResponse } = await requireRole(request, 'admin');
  if (errorResponse) {
    return errorResponse;
  }

  // 2. Parse Body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง' }, { status: 400 });
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues?.[0]?.message || 'URL ไม่ถูกต้อง' },
      { status: 400 }
    );
  }

  const { url } = parsed.data;

  // 3. Security Check: Only allow Google Maps domains or subdomains
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const isGoogleDomain =
      hostname === 'maps.app.goo.gl' ||
      hostname === 'goo.gl' ||
      hostname === 'maps.google.com' ||
      hostname.endsWith('.google.com') ||
      hostname.endsWith('.google.co.th');

    if (!isGoogleDomain) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะลิงก์แชร์จาก Google Maps เท่านั้น' },
        { status: 400 }
      );
    }

    // 4. Follow redirect to resolve destination URL
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const finalUrl = response.url;

    // Check if coordinates exist in the resolved URL
    let coords = extractCoordinatesFromText(finalUrl);

    // If not in URL string, inspect HTML response content
    if (!coords) {
      const html = await response.text();
      coords = extractCoordinatesFromText(html);
    }

    if (!coords) {
      return NextResponse.json(
        {
          code: 'CANNOT_EXTRACT_COORDINATES',
          error: 'ไม่สามารถดึงพิกัดจากลิงก์ Google Maps นี้ได้ กรุณาตรวจสอบลิงก์อีกครั้ง',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        resolvedUrl: finalUrl,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบลิงก์';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
