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

export async function processScannedUid(
  rawUid: string,
  router: { push: (url: string) => void },
  options?: {
    onError?: (msg: string) => void;
  }
): Promise<boolean> {
  const localCheck = validateUidLocally(rawUid);
  if (!localCheck.isValid || !localCheck.trimmedUid) {
    options?.onError?.(localCheck.error || messages.manualInput.invalidCharsError);
    return false;
  }

  const trimmed = localCheck.trimmedUid;
  try {
    const exists = await checkUidExists(trimmed);
    if (exists) {
      options?.onError?.(messages.register.uidAlreadyRegistered);
      return false;
    }

    router.push(buildRegisterUrl(trimmed));
    return true;
  } catch {
    options?.onError?.(messages.register.unknownError);
    return false;
  }
}

