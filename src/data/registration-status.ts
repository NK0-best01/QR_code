import { z } from "zod";

export const REGISTRATION_STATUSES = ["UNREGISTERED", "REGISTERED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const registrationStatusSchema = z.enum(["UNREGISTERED", "REGISTERED"], {
  message: "สถานะการลงทะเบียนไม่ถูกต้อง",
});

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  UNREGISTERED: "ยังไม่ลงทะเบียน",
  REGISTERED: "ลงทะเบียน",
};

export const REGISTRATION_STATUS_BADGES: Record<RegistrationStatus, string> = {
  UNREGISTERED:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60",
  REGISTERED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
};

export const REGISTRATION_STATUS_BADGE_CLASSES: Record<
  RegistrationStatus,
  { bg: string; text: string; dot: string }
> = {
  UNREGISTERED: {
    bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  REGISTERED: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export function isValidRegistrationStatus(
  status: string
): status is RegistrationStatus {
  return (REGISTRATION_STATUSES as readonly string[]).includes(status);
}

export const PIN_LOG_ACTIONS = ["CONFIRM", "UPDATE"] as const;
export type PinLogAction = (typeof PIN_LOG_ACTIONS)[number];
