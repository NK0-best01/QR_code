import { NextRequest, NextResponse } from 'next/server';
import { registrationSchema } from '@/lib/schemas';
import { createRegistration, DuplicateUidError } from '@/lib/registration-repo';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import messages from '@/lib/messages';

const MAX_BODY_BYTES = 64 * 1024; // 64 KB limit

export async function POST(request: NextRequest) {
  // 1. Rate Limiting Check (30 requests/min per IP)
  const clientIp = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientIp, { limit: 30, windowMs: 60_000 });

  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(rateLimit.reset),
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: messages.api.rateLimitExceeded },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          'Retry-After': String(rateLimit.retryAfter),
        },
      }
    );
  }

  // 2. Request Payload Size Guard
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: messages.api.payloadTooLarge },
        { status: 413, headers: rateLimitHeaders }
      );
    }
  }

  try {
    let rawText: string;
    try {
      rawText = await request.text();
    } catch {
      return NextResponse.json(
        { error: messages.api.invalidJson },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    if (rawText.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: messages.api.payloadTooLarge },
        { status: 413, headers: rateLimitHeaders }
      );
    }

    let body;
    try {
      body = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: messages.api.invalidJson },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const parseResult = registrationSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.format(),
        },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const registration = await createRegistration(parseResult.data);
    return NextResponse.json(registration, {
      status: 201,
      headers: rateLimitHeaders,
    });
  } catch (error: unknown) {
    if (error instanceof DuplicateUidError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409, headers: rateLimitHeaders }
      );
    }

    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: messages.register.unknownError },
      { status: 500, headers: rateLimitHeaders }
    );
  }
}

