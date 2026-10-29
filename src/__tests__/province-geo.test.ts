import { describe, it, expect } from "vitest";
import {
  isPointInProvince,
  getAllProvincesGeo,
  getAllProvinceNames,
  getProvinceBBox,
  getProvinceSamplePoint,
} from "../lib/province-geo";
import { THAI_REGIONS } from "../data/thai-regions";

describe("Phase 13: 77 Provinces GeoJSON & Point-in-Polygon Tests", () => {
  // 1. Data Integrity: All 77 provinces match thai-regions.ts
  it("ข้อมูลต้องมีครบ 77 จังหวัด และตรงกับ thai-regions.ts ครบถ้วน 100%", () => {
    const geoFeatures = getAllProvincesGeo();
    expect(geoFeatures.length).toBe(77);

    // Extract all provinces from thai-regions.ts
    const allThaiRegionProvinces = THAI_REGIONS.flatMap((r) => r.provinces);
    expect(allThaiRegionProvinces.length).toBe(77);

    const geoNames = getAllProvinceNames();
    expect(geoNames.length).toBe(77);

    // Every province in thai-regions.ts must exist in GeoJSON
    for (const province of allThaiRegionProvinces) {
      expect(geoNames).toContain(province);
    }
  });

  // 2. Real landmark reference points within provinces
  describe("จุดอ้างอิงพิกัดจริง อยู่ในจังหวัดของตัวเอง", () => {
    it("เชียงใหม่ (18.7883, 98.9853) → อยู่ในเชียงใหม่", () => {
      expect(isPointInProvince("เชียงใหม่", 18.7883, 98.9853)).toBe(true);
    });

    it("กรุงเทพมหานคร (13.7563, 100.5018) → อยู่ในกรุงเทพมหานคร", () => {
      expect(isPointInProvince("กรุงเทพมหานคร", 13.7563, 100.5018)).toBe(true);
    });

    it("ภูเก็ต (7.8804, 98.3923) → อยู่ในภูเก็ต (MultiPolygon เกาะ)", () => {
      expect(isPointInProvince("ภูเก็ต", 7.8804, 98.3923)).toBe(true);
    });

    it("อุบลราชธานี (15.2448, 104.8473) → อยู่ในอุบลราชธานี", () => {
      expect(isPointInProvince("อุบลราชธานี", 15.2448, 104.8473)).toBe(true);
    });

    it("สงขลา/หาดใหญ่ (7.0086, 100.4747) → อยู่ในสงขลา", () => {
      expect(isPointInProvince("สงขลา", 7.0086, 100.4747)).toBe(true);
    });
  });

  // 3. Negative assertions: Points must NOT be in other provinces
  describe("จุดของจังหวัดหนึ่ง ต้องไม่อยู่ในอีกจังหวัดหนึ่ง", () => {
    it("จุดเชียงใหม่ (18.7883, 98.9853) ไม่อยู่ในเชียงราย", () => {
      expect(isPointInProvince("เชียงราย", 18.7883, 98.9853)).toBe(false);
    });

    it("จุดกรุงเทพมหานคร ไม่อยู่ในเชียงใหม่", () => {
      expect(isPointInProvince("เชียงใหม่", 13.7563, 100.5018)).toBe(false);
    });

    it("จุดภูเก็ต ไม่อยู่ในกรุงเทพมหานคร", () => {
      expect(isPointInProvince("กรุงเทพมหานคร", 7.8804, 98.3923)).toBe(false);
    });
  });

  // 4. Coordinates outside land (Gulf of Thailand sea point)
  it("จุดกลางอ่าวไทย (10.0, 101.5) → ไม่อยู่ในจังหวัดใดเลย", () => {
    const seaLat = 10.0;
    const seaLng = 101.5;

    expect(isPointInProvince("ชลบุรี", seaLat, seaLng)).toBe(false);
    expect(isPointInProvince("ประจวบคีรีขันธ์", seaLat, seaLng)).toBe(false);
    expect(isPointInProvince("สุราษฎร์ธานี", seaLat, seaLng)).toBe(false);
    expect(isPointInProvince("กรุงเทพมหานคร", seaLat, seaLng)).toBe(false);
  });

  // 5. Inverted lat/lng test (anti-swap guard)
  it("สลับค่า lat/lng โดยตั้งใจ (98.9853, 18.7883) → คืน false", () => {
    // Correct: lat=18.7883, lng=98.9853
    // Swapped: lat=98.9853 (> 90 invalid!), lng=18.7883
    expect(isPointInProvince("เชียงใหม่", 98.9853, 18.7883)).toBe(false);

    // Another swap within [-90, 90]: lat=13.7563, lng=100.5018
    // Swapped lat=100.5018 (out of range)
    expect(isPointInProvince("กรุงเทพมหานคร", 100.5018, 13.7563)).toBe(false);
  });

  // 6. Test all 77 provinces using their representative surface points
  it("จุดตัวแทนของทั้ง 77 จังหวัด (sample_point) ต้องผ่านการตรวจของจังหวัดตัวเองครบ 100%", () => {
    const allProvinces = getAllProvinceNames();
    expect(allProvinces.length).toBe(77);

    for (const province of allProvinces) {
      const sample = getProvinceSamplePoint(province);
      expect(sample).toBeDefined();
      expect(typeof sample.lat).toBe("number");
      expect(typeof sample.lng).toBe("number");

      const isInside = isPointInProvince(province, sample.lat, sample.lng);
      expect(isInside).toBe(true);
    }
  });

  // 7. Error handling on unknown province names
  it("ชื่อจังหวัดที่ไม่มีในระบบ → throw Error ชัดเจน", () => {
    expect(() => isPointInProvince("จังหวัดสมมุติ", 13.75, 100.5)).toThrowError(
      /ไม่พบข้อมูลจังหวัด/
    );
    expect(() => isPointInProvince("Tokyo", 35.6, 139.6)).toThrowError(
      /ไม่พบข้อมูลจังหวัด/
    );
    expect(() => isPointInProvince("", 13.75, 100.5)).toThrowError(
      /ชื่อจังหวัดไม่ถูกต้อง/
    );
  });

  // 8. Sanity check: NaN / Infinity / Out-of-bounds coords return false
  it("พิกัด NaN หรือ Infinity หรือ นอกขอบเขตโลก → คืน false", () => {
    expect(isPointInProvince("เชียงใหม่", NaN, 98.98)).toBe(false);
    expect(isPointInProvince("เชียงใหม่", 18.78, NaN)).toBe(false);
    expect(isPointInProvince("เชียงใหม่", Infinity, 98.98)).toBe(false);
    expect(isPointInProvince("เชียงใหม่", 18.78, -Infinity)).toBe(false);
    expect(isPointInProvince("เชียงใหม่", 999, 98.98)).toBe(false);
    expect(isPointInProvince("เชียงใหม่", 18.78, 999)).toBe(false);
  });

  // 9. Performance Benchmark: 1,000 calls must finish in < 50ms
  it("Performance: ตรวจสอบพิกัดซ้ำ 1,000 ครั้ง ต้องเสร็จภายใน 50ms (พิสูจน์การแคช)", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      isPointInProvince("เชียงใหม่", 18.7883, 98.9853);
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(50); // Under 50ms for 1,000 checks
  });

  // 10. BBox helper
  it("getProvinceBBox คืนค่า minLng, minLat, maxLng, maxLat ถูกต้อง", () => {
    const bbox = getProvinceBBox("เชียงใหม่");
    expect(bbox.length).toBe(4);
    const [minLng, minLat, maxLng, maxLat] = bbox;
    expect(minLng).toBeLessThan(maxLng);
    expect(minLat).toBeLessThan(maxLat);
    expect(minLat).toBeGreaterThan(17.0);
    expect(maxLat).toBeLessThan(21.0);
  });
});
