import { describe, it, expect } from 'vitest';
import {
  normalizeSelection,
  isSelectionValid,
  scaleDisplayToNatural,
} from '@/lib/crop';

describe('Phase 7: lib/crop.ts Unit Tests', () => {
  describe('normalizeSelection', () => {
    it('normalizes drag from top-left to bottom-right', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 100, y: 150 };
      const rect = normalizeSelection(p1, p2);

      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 130,
      });
    });

    it('normalizes reverse drag from bottom-right to top-left', () => {
      const p1 = { x: 100, y: 150 };
      const p2 = { x: 10, y: 20 };
      const rect = normalizeSelection(p1, p2);

      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 130,
      });
    });

    it('normalizes drag from bottom-left to top-right', () => {
      const p1 = { x: 10, y: 150 };
      const p2 = { x: 100, y: 20 };
      const rect = normalizeSelection(p1, p2);

      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 130,
      });
    });

    it('normalizes drag from top-right to bottom-left', () => {
      const p1 = { x: 100, y: 20 };
      const p2 = { x: 10, y: 150 };
      const rect = normalizeSelection(p1, p2);

      expect(rect).toEqual({
        x: 10,
        y: 20,
        width: 90,
        height: 130,
      });
    });
  });

  describe('isSelectionValid', () => {
    it('returns true for selections >= 10px in both width and height', () => {
      expect(isSelectionValid({ width: 10, height: 10 })).toBe(true);
      expect(isSelectionValid({ width: 50, height: 20 })).toBe(true);
    });

    it('returns false for selections smaller than 10px', () => {
      expect(isSelectionValid({ width: 9, height: 10 })).toBe(false);
      expect(isSelectionValid({ width: 10, height: 8 })).toBe(false);
      expect(isSelectionValid({ width: 0, height: 0 })).toBe(false);
    });

    it('allows custom minimum size', () => {
      expect(isSelectionValid({ width: 15, height: 15 }, 20)).toBe(false);
      expect(isSelectionValid({ width: 25, height: 20 }, 20)).toBe(true);
    });
  });

  describe('scaleDisplayToNatural', () => {
    it('scales 1:1 correctly when display matches natural dimensions', () => {
      const rect = { x: 50, y: 50, width: 200, height: 100 };
      const display = { width: 1920, height: 1080 };
      const natural = { width: 1920, height: 1080 };

      const result = scaleDisplayToNatural(rect, display, natural);
      expect(result).toEqual({
        x: 50,
        y: 50,
        width: 200,
        height: 100,
      });
    });

    it('scales correctly for HiDPI / 2x DPR (e.g. Retina displays)', () => {
      const rect = { x: 100, y: 100, width: 200, height: 150 };
      const display = { width: 1000, height: 800 };
      const natural = { width: 2000, height: 1600 }; // 2x

      const result = scaleDisplayToNatural(rect, display, natural);
      expect(result).toEqual({
        x: 200,
        y: 200,
        width: 400,
        height: 300,
      });
    });

    it('scales correctly for fractional scale factors (e.g. 1.25x or 1.5x scaling)', () => {
      const rect = { x: 100, y: 100, width: 100, height: 100 };
      const display = { width: 1000, height: 1000 };
      const natural = { width: 1250, height: 1250 }; // 1.25x

      const result = scaleDisplayToNatural(rect, display, natural);
      expect(result).toEqual({
        x: 125,
        y: 125,
        width: 125,
        height: 125,
      });
    });

    it('clamps coordinates strictly within natural image bounds', () => {
      const rect = { x: 950, y: 950, width: 200, height: 200 };
      const display = { width: 1000, height: 1000 };
      const natural = { width: 1000, height: 1000 };

      const result = scaleDisplayToNatural(rect, display, natural);
      expect(result).toEqual({
        x: 950,
        y: 950,
        width: 50, // 1000 - 950
        height: 50, // 1000 - 950
      });
    });

    it('returns null if display or natural dimensions are invalid (<= 0)', () => {
      const rect = { x: 10, y: 10, width: 50, height: 50 };
      expect(
        scaleDisplayToNatural(rect, { width: 0, height: 500 }, { width: 1000, height: 500 })
      ).toBeNull();
      expect(
        scaleDisplayToNatural(rect, { width: 500, height: 500 }, { width: 0, height: 500 })
      ).toBeNull();
    });
  });
});
