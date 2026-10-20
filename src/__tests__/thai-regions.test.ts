import { describe, it, expect } from 'vitest';
import {
  THAI_REGIONS,
  getProvincesByRegion,
  isProvinceInRegion,
} from '../data/thai-regions';

describe('Phase 1: ข้อมูลภาค-จังหวัด (6 ภาค 77 จังหวัด)', () => {
  it('มีครบ 6 ภาค', () => {
    expect(THAI_REGIONS).toHaveLength(6);
    const regionNames = THAI_REGIONS.map((r) => r.regionName);
    expect(regionNames).toEqual([
      'เหนือ',
      'ตะวันออกเฉียงเหนือ',
      'กลาง',
      'ตะวันออก',
      'ตะวันตก',
      'ใต้',
    ]);
  });

  it('จังหวัดรวมเท่ากับ 77 และไม่มีจังหวัดซ้ำข้ามภาค', () => {
    const allProvinces = THAI_REGIONS.flatMap((r) => r.provinces);
    expect(allProvinces).toHaveLength(77);

    const uniqueProvinces = new Set(allProvinces);
    expect(uniqueProvinces.size).toBe(77);
  });

  it('จำนวนจังหวัดต่อภาคถูกต้องตามเกณฑ์ราชบัณฑิตยสภา', () => {
    const counts = Object.fromEntries(
      THAI_REGIONS.map((r) => [r.regionName, r.provinces.length])
    );

    expect(counts['เหนือ']).toBe(9);
    expect(counts['ตะวันออกเฉียงเหนือ']).toBe(20);
    expect(counts['กลาง']).toBe(22);
    expect(counts['ตะวันออก']).toBe(7);
    expect(counts['ตะวันตก']).toBe(5);
    expect(counts['ใต้']).toBe(14);
  });

  it('getProvincesByRegion คืนค่าถูกต้องทุกภาค ทั้งแบบ regionId และ regionName', () => {
    // By regionId
    expect(getProvincesByRegion('north')).toHaveLength(9);
    expect(getProvincesByRegion('north')).toContain('เชียงใหม่');
    expect(getProvincesByRegion('northeast')).toHaveLength(20);
    expect(getProvincesByRegion('central')).toHaveLength(22);
    expect(getProvincesByRegion('central')).toContain('กรุงเทพมหานคร');
    expect(getProvincesByRegion('east')).toHaveLength(7);
    expect(getProvincesByRegion('west')).toHaveLength(5);
    expect(getProvincesByRegion('south')).toHaveLength(14);

    // By regionName
    expect(getProvincesByRegion('เหนือ')).toHaveLength(9);
    expect(getProvincesByRegion('กลาง')).toHaveLength(22);

    // When region does not exist or empty
    expect(getProvincesByRegion('unknown')).toEqual([]);
    expect(getProvincesByRegion('')).toEqual([]);
    expect(getProvincesByRegion(null)).toEqual([]);
    expect(getProvincesByRegion(undefined)).toEqual([]);
  });

  it('isProvinceInRegion ตรวจสอบและปฏิเสธจังหวัดที่ไม่อยู่ในภาคนั้น', () => {
    // Valid cases
    expect(isProvinceInRegion('north', 'เชียงใหม่')).toBe(true);
    expect(isProvinceInRegion('เหนือ', 'เชียงใหม่')).toBe(true);
    expect(isProvinceInRegion('central', 'กรุงเทพมหานคร')).toBe(true);
    expect(isProvinceInRegion('กลาง', 'กรุงเทพมหานคร')).toBe(true);
    expect(isProvinceInRegion('south', 'ภูเก็ต')).toBe(true);

    // Invalid province in region
    expect(isProvinceInRegion('north', 'กรุงเทพมหานคร')).toBe(false);
    expect(isProvinceInRegion('เหนือ', 'ภูเก็ต')).toBe(false);
    expect(isProvinceInRegion('south', 'เชียงใหม่')).toBe(false);

    // Unknown province or region
    expect(isProvinceInRegion('central', 'โตเกียว')).toBe(false);
    expect(isProvinceInRegion('mars', 'เชียงใหม่')).toBe(false);
    expect(isProvinceInRegion('', 'เชียงใหม่')).toBe(false);
  });
});
