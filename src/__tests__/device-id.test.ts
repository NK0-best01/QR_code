import { describe, it, expect } from 'vitest';
import { formatDeviceId, parseDeviceId } from '../lib/device-id';

describe('Phase 4A: device-id formatting and parsing', () => {
  it('formats device ID correctly with 4-digit zero padding', () => {
    expect(formatDeviceId('KSK', 1)).toBe('KSK-0001');
    expect(formatDeviceId('KPD', 42)).toBe('KPD-0042');
    expect(formatDeviceId('MNU', 999)).toBe('MNU-0999');
    expect(formatDeviceId('KSK', 1000)).toBe('KSK-1000');
  });

  it('seq เกิน 9999 ไม่ crash และขยายเป็น 5 หลักอัตโนมัติ', () => {
    expect(formatDeviceId('KSK', 10000)).toBe('KSK-10000');
    expect(formatDeviceId('MNU', 123456)).toBe('MNU-123456');
  });

  it('parses valid device ID correctly', () => {
    expect(parseDeviceId('MNU-0007')).toEqual({ code: 'MNU', seq: 7 });
    expect(parseDeviceId('KSK-0001')).toEqual({ code: 'KSK', seq: 1 });
    expect(parseDeviceId('KPD-9999')).toEqual({ code: 'KPD', seq: 9999 });
    expect(parseDeviceId('KSK-10000')).toEqual({ code: 'KSK', seq: 10000 });
  });

  it('returns null on invalid format or unknown code', () => {
    expect(parseDeviceId('XYZ-0001')).toBeNull();
    expect(parseDeviceId('KSK-0')).toBeNull();
    expect(parseDeviceId('KSK-abcd')).toBeNull();
    expect(parseDeviceId('KSK0001')).toBeNull();
    expect(parseDeviceId('')).toBeNull();
    expect(parseDeviceId('INVALID')).toBeNull();
  });
});
