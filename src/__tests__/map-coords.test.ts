import { describe, it, expect } from 'vitest';
import {
  createThailandProjection,
  coordsToSvgPoint,
  svgPointToCoords,
  DEFAULT_MAP_WIDTH,
  DEFAULT_MAP_HEIGHT,
} from '@/lib/map-coords';

describe('Phase 16: Map Coordinates Utilities', () => {
  describe('createThailandProjection', () => {
    it('creates a projection centered on Thailand', () => {
      const projection = createThailandProjection();
      expect(projection).toBeDefined();
      expect(typeof projection).toBe('function');
      expect(typeof projection.invert).toBe('function');
    });
  });

  describe('Round-trip coordinate conversions', () => {
    const referencePoints = [
      { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
      { name: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
      { name: 'Phuket', lat: 7.8804, lng: 98.3923 },
      { name: 'Khon Kaen', lat: 16.4322, lng: 102.8236 },
      { name: 'Ubon Ratchathani', lat: 15.2448, lng: 104.8473 },
    ];

    referencePoints.forEach(({ name, lat, lng }) => {
      it(`accurately converts ${name} (${lat}, ${lng}) to SVG and back`, () => {
        const svgPt = coordsToSvgPoint(lat, lng);
        expect(svgPt).not.toBeNull();
        expect(svgPt![0]).toBeGreaterThan(0);
        expect(svgPt![0]).toBeLessThan(DEFAULT_MAP_WIDTH);
        expect(svgPt![1]).toBeGreaterThan(0);
        expect(svgPt![1]).toBeLessThan(DEFAULT_MAP_HEIGHT);

        const inverted = svgPointToCoords(svgPt![0], svgPt![1]);
        expect(inverted).not.toBeNull();
        // Accuracy within 0.001 degree (~100m ground distance)
        expect(inverted![0]).toBeCloseTo(lat, 2);
        expect(inverted![1]).toBeCloseTo(lng, 2);
      });
    });
  });

  describe('Responsive container sizes', () => {
    const sizes = [
      { width: 400, height: 500 },
      { width: 800, height: 1000 },
      { width: 1200, height: 1500 },
    ];

    sizes.forEach(({ width, height }) => {
      it(`scales coordinates properly for ${width}x${height} container`, () => {
        const lat = 13.7563;
        const lng = 100.5018;

        const pt = coordsToSvgPoint(lat, lng, width, height);
        expect(pt).not.toBeNull();
        expect(pt![0]).toBeGreaterThan(0);
        expect(pt![0]).toBeLessThan(width);
        expect(pt![1]).toBeGreaterThan(0);
        expect(pt![1]).toBeLessThan(height);

        const back = svgPointToCoords(pt![0], pt![1], width, height);
        expect(back).not.toBeNull();
        expect(back![0]).toBeCloseTo(lat, 2);
        expect(back![1]).toBeCloseTo(lng, 2);
      });
    });
  });

  describe('Invalid inputs and edge cases', () => {
    it('returns null for invalid coordinates in coordsToSvgPoint', () => {
      expect(coordsToSvgPoint(NaN as unknown as number, 100.5)).toBeNull();
      expect(coordsToSvgPoint(13.7, Infinity as unknown as number)).toBeNull();
      expect(coordsToSvgPoint(null as unknown as number, 100.5)).toBeNull();
      expect(coordsToSvgPoint(undefined as unknown as number, 100.5)).toBeNull();
    });

    it('returns null for invalid coordinates in svgPointToCoords', () => {
      expect(svgPointToCoords(NaN as unknown as number, 500)).toBeNull();
      expect(svgPointToCoords(400, Infinity as unknown as number)).toBeNull();
      expect(svgPointToCoords(null as unknown as number, 500)).toBeNull();
      expect(svgPointToCoords(undefined as unknown as number, 500)).toBeNull();
    });
  });
});
