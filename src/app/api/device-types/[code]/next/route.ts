import { NextRequest, NextResponse } from 'next/server';
import { isValidDeviceType, DeviceTypeCode } from '@/data/device-types';
import { peekNextDeviceId } from '@/lib/registration-repo';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const upperCode = code.toUpperCase();

    if (!isValidDeviceType(upperCode)) {
      return NextResponse.json(
        { error: 'Invalid device type code' },
        { status: 404 }
      );
    }

    const deviceId = await peekNextDeviceId(upperCode as DeviceTypeCode);
    return NextResponse.json({ deviceId }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error peeking next device ID:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
