import { DeviceTypeCode, isValidDeviceType } from '@/data/device-types';

export function formatDeviceId(code: DeviceTypeCode, seq: number): string {
  return `${code}-${String(seq).padStart(4, '0')}`;
}

export function parseDeviceId(
  deviceId: string
): { code: DeviceTypeCode; seq: number } | null {
  if (typeof deviceId !== 'string') return null;
  const match = deviceId.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;

  const [, code, seqStr] = match;
  if (!isValidDeviceType(code)) return null;

  const seq = parseInt(seqStr, 10);
  if (isNaN(seq) || seq <= 0) return null;

  return {
    code: code as DeviceTypeCode,
    seq,
  };
}
