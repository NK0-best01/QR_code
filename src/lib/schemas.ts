import { z } from 'zod';
import { REGION_NAMES, isProvinceInRegion } from '@/data/thai-regions';
import { DEVICE_TYPE_CODES } from '@/data/device-types';
import messages from './messages';

export const MAX_UID_LENGTH = 128;

// Regular expression to check for control characters (\x00-\x1F and \x7F)
export const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/;

export const uidSchema = z
  .string()
  .trim()
  .min(1, messages.validation.uidRequired)
  .max(MAX_UID_LENGTH, messages.manualInput.tooLongError)
  .refine(
    (val) => !CONTROL_CHARS_REGEX.test(val),
    messages.manualInput.invalidCharsError
  );

export const registrationSchema = z
  .object({
    uid: uidSchema,
    region: z.enum(REGION_NAMES),
    province: z
      .string()
      .trim()
      .min(1, messages.validation.provinceRequired),
    deviceType: z.enum(DEVICE_TYPE_CODES),
  })
  .refine((data) => isProvinceInRegion(data.region, data.province), {
    message: messages.validation.provinceNotInRegion,
    path: ['province'],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
