import { describe, it, expect } from 'vitest';
import { buildGoogleMapsUrl } from '@/lib/google-maps';

describe('buildGoogleMapsUrl', () => {
  it('สร้าง URL ได้ถูกต้องสำหรับพิกัดปกติ', () => {
    const url = buildGoogleMapsUrl(13.7563, 100.5018);
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=13.7563,100.5018');
  });

  it('รองรับพิกัดที่มีค่าลบ ศูนย์ และทศนิยมหลายตำแหน่ง', () => {
    const url = buildGoogleMapsUrl(0, 0);
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=0,0');

    const urlNegative = buildGoogleMapsUrl(-33.8688, 151.2093);
    expect(urlNegative).toBe('https://www.google.com/maps/search/?api=1&query=-33.8688,151.2093');
  });

  it('โยนข้อผิดพลาดหากพิกัดไม่ใช่ตัวเลข finite', () => {
    expect(() => buildGoogleMapsUrl(NaN, 100)).toThrow();
    expect(() => buildGoogleMapsUrl(13, Infinity)).toThrow();
    expect(() => buildGoogleMapsUrl('13' as unknown as number, 100)).toThrow();
  });
});
