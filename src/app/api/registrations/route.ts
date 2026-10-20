import { NextRequest, NextResponse } from 'next/server';
import { registrationSchema } from '@/lib/schemas';
import { createRegistration, DuplicateUidError } from '@/lib/registration-repo';
import messages from '@/lib/messages';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parseResult = registrationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const registration = await createRegistration(parseResult.data);
    return NextResponse.json(registration, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof DuplicateUidError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: messages.register.unknownError },
      { status: 500 }
    );
  }
}
