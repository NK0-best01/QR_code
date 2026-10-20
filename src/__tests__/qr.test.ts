import { describe, it, expect, vi } from 'vitest';
import { decodeQrFromImageData } from '../lib/qr';
import jsQR from 'jsqr';

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

describe('Phase 6: QR Decoding Unit Tests (src/lib/qr.ts)', () => {
  it('คืน null เมื่อข้อมูลเป็น null, undefined หรือขนาด <= 0', () => {
    expect(decodeQrFromImageData(null as unknown as ImageData)).toBeNull();
    expect(decodeQrFromImageData(undefined as unknown as ImageData)).toBeNull();
    expect(
      decodeQrFromImageData({
        data: new Uint8ClampedArray(0),
        width: 0,
        height: 0,
      })
    ).toBeNull();
    expect(
      decodeQrFromImageData({
        data: new Uint8ClampedArray(10),
        width: -1,
        height: 10,
      })
    ).toBeNull();
  });

  it('คืน null เมื่อไม่พบ QR Code ในภาพ', () => {
    vi.mocked(jsQR).mockReturnValueOnce(null);

    const fakeImage = {
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10,
    };

    const result = decodeQrFromImageData(fakeImage);
    expect(result).toBeNull();
    expect(jsQR).toHaveBeenCalledWith(fakeImage.data, 10, 10, {
      inversionAttempts: 'attemptBoth',
    });
  });

  it('คืนข้อความที่ตัดช่องว่างออกแล้ว เมื่อพบ QR Code', () => {
    vi.mocked(jsQR).mockReturnValueOnce({
      data: '   DEVICE-UID-7788   ',
    } as unknown as ReturnType<typeof jsQR>);

    const fakeImage = {
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10,
    };

    const result = decodeQrFromImageData(fakeImage);
    expect(result).toBe('DEVICE-UID-7788');
  });

  it('คืน null เมื่อ jsQR คืนข้อความที่เป็นช่องว่างล้วน', () => {
    vi.mocked(jsQR).mockReturnValueOnce({
      data: '     ',
    } as unknown as ReturnType<typeof jsQR>);

    const fakeImage = {
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10,
    };

    expect(decodeQrFromImageData(fakeImage)).toBeNull();
  });

  it('คืน null ปลอดภัยเมื่อ jsQR throw exception', () => {
    vi.mocked(jsQR).mockImplementationOnce(() => {
      throw new Error('Corrupted image buffer');
    });

    const fakeImage = {
      data: new Uint8ClampedArray(400),
      width: 10,
      height: 10,
    };

    expect(decodeQrFromImageData(fakeImage)).toBeNull();
  });
});
