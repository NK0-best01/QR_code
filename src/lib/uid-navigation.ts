import { uidSchema } from './schemas';
import messages from './messages';

export async function checkUidExists(uid: string): Promise<boolean> {
  const trimmed = uid.trim();
  const encoded = encodeURIComponent(trimmed);
  const response = await fetch(`/api/uids/${encoded}/exists`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to verify UID existence');
  }

  const data = await response.json();
  return Boolean(data.exists);
}

export function buildRegisterUrl(uid: string): string {
  return `/register?uid=${encodeURIComponent(uid.trim())}`;
}

export interface ValidateUidResult {
  isValid: boolean;
  error?: string;
  trimmedUid?: string;
}

export function validateUidLocally(rawUid: string): ValidateUidResult {
  const result = uidSchema.safeParse(rawUid);
  if (!result.success) {
    const errorMsg =
      result.error.issues?.[0]?.message ?? messages.manualInput.emptyError;
    return {
      isValid: false,
      error: errorMsg,
    };
  }

  return {
    isValid: true,
    trimmedUid: result.data,
  };
}
