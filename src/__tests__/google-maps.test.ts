import { describe, it, expect } from 'vitest';
import { buildGoogleMapsUrl, parseGoogleMapsUrl } from '@/lib/google-maps';

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

describe('parseGoogleMapsUrl and extractCoordinatesFromText', () => {
  it('สกัดพิกัดจาก URL รูปแบบ ?q=lat,lng', () => {
    const res = parseGoogleMapsUrl('https://www.google.com/maps?q=13.7563,100.5018');
    expect(res).toEqual({
      type: 'COORDINATES',
      latitude: 13.7563,
      longitude: 100.5018,
    });
  });

  it('สกัดพิกัดจาก URL รูปแบบ @lat,lng,zoom', () => {
    const res = parseGoogleMapsUrl('https://www.google.com/maps/place/Bangkok/@13.756333,100.501765,17z/data=...');
    expect(res).toEqual({
      type: 'COORDINATES',
      latitude: 13.756333,
      longitude: 100.501765,
    });
  });

  it('สกัดพิกัดจาก URL ค้นหา ?query=lat,lng', () => {
    const res = parseGoogleMapsUrl('https://www.google.com/maps/search/?api=1&query=18.7883,98.9853');
    expect(res).toEqual({
      type: 'COORDINATES',
      latitude: 18.7883,
      longitude: 98.9853,
    });
  });

  it('สกัดพิกัดจาก data attribute !3d<lat>!4d<lng>', () => {
    const res = parseGoogleMapsUrl('https://www.google.com/maps/place/Grand+Palace/data=!3m1!4b1!4m6!3m5!1s0x...!8m2!3d13.7500!4d100.4914');
    expect(res).toEqual({
      type: 'COORDINATES',
      latitude: 13.75,
      longitude: 100.4914,
    });
  });

  it('ตรวจจับ Short link (maps.app.goo.gl หรือ goo.gl/maps)', () => {
    const res1 = parseGoogleMapsUrl('https://maps.app.goo.gl/abC123XyZ');
    expect(res1).toEqual({
      type: 'SHORT_LINK',
      url: 'https://maps.app.goo.gl/abC123XyZ',
    });

    const res2 = parseGoogleMapsUrl('https://goo.gl/maps/dEf456WvU');
    expect(res2).toEqual({
      type: 'SHORT_LINK',
      url: 'https://goo.gl/maps/dEf456WvU',
    });
  });

  it('รองรับการวางพิกัดตัวเลขตรง ๆ (fallback)', () => {
    const res = parseGoogleMapsUrl('13.7563, 100.5018');
    expect(res).toEqual({
      type: 'COORDINATES',
      latitude: 13.7563,
      longitude: 100.5018,
    });
  });

  it('คืนค่า INVALID เมื่อข้อความว่างหรือไม่มีพิกัด', () => {
    expect(parseGoogleMapsUrl('')).toEqual({ type: 'INVALID' });
    expect(parseGoogleMapsUrl('https://example.com/not-maps')).toEqual({ type: 'INVALID' });
    expect(parseGoogleMapsUrl('ข้อความทั่วไปที่ไม่ใช่ลิงก์')).toEqual({ type: 'INVALID' });
  });
});

