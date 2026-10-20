export const DEVICE_TYPES = [
  { code: 'KSK', label: 'Kiosk (KSK)' },
  { code: 'KPD', label: 'Keypad (KPD)' },
  { code: 'MNU', label: 'Main (MNU)' },
] as const;

export type DeviceTypeCode = (typeof DEVICE_TYPES)[number]['code'];

export const DEVICE_TYPE_CODES: [DeviceTypeCode, ...DeviceTypeCode[]] = [
  'KSK',
  'KPD',
  'MNU',
];

export function isValidDeviceType(code: string): code is DeviceTypeCode {
  return DEVICE_TYPE_CODES.includes(code as DeviceTypeCode);
}
