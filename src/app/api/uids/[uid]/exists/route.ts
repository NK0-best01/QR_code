import { NextRequest, NextResponse } from 'next/server';
import { findByUid } from '@/lib/registration-repo';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid: rawUid } = await context.params;
    const uid = decodeURIComponent(rawUid).trim();

    if (!uid) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const existing = await findByUid(uid);
    return NextResponse.json({ exists: !!existing }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error checking UID existence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
