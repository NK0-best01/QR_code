import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { RegionSnipper } from '../components/RegionSnipper';
import messages from '../lib/messages';
import * as qrLib from '../lib/qr';

// Mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('Phase 7: RegionSnipper Component & Integration Tests', () => {
  let mockStop: ReturnType<typeof vi.fn>;
  let mockTrack: MediaStreamTrack;
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStop = vi.fn();
    mockTrack = {
      stop: mockStop,
      kind: 'video',
      enabled: true,
      readyState: 'live',
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });

    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      strokeRect: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
        width: 100,
        height: 100,
      })),
      putImageData: vi.fn(),
    }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Mock setPointerCapture / releasePointerCapture
    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('เมื่อผู้ใช้ยกเลิกการแชร์หน้าจอ (NotAllowedError) → แสดงข้อความ screenPermissionDenied', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValueOnce(error);

    render(<RegionSnipper />);

    await waitFor(() => {
      const banner = screen.getByTestId('region-snipper-error');
      expect(banner).toBeInTheDocument();
      expect(screen.getByTestId('screen-error-text')).toHaveTextContent(
        messages.scan.screenPermissionDenied
      );
    });
  });

  it('เมื่อเบราว์เซอร์ไม่รองรับ getDisplayMedia → แสดงข้อความ screenNotSupported', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<RegionSnipper />);

    await waitFor(() => {
      const banner = screen.getByTestId('region-snipper-error');
      expect(banner).toBeInTheDocument();
      expect(screen.getByTestId('screen-error-text')).toHaveTextContent(
        messages.scan.screenNotSupported
      );
    });
  });

  it('ดึงภาพสำเร็จ → สั่ง stop stream ทันทีใน finally เพื่อไม่ให้ค้างการแชร์หน้าจอ', async () => {
    render(<RegionSnipper customStream={mockStream} />);

    await waitFor(() => {
      expect(screen.getByTestId('region-snipper')).toBeInTheDocument();
    });

    // Stream must be stopped immediately after taking the single frame
    expect(mockStop).toHaveBeenCalled();
  });

  it('กดปุ่ม Esc บนคีย์บอร์ด → ปิด overlay และเรียก onClose', async () => {
    const onCloseMock = vi.fn();
    render(<RegionSnipper customStream={mockStream} onClose={onCloseMock} />);

    await waitFor(() => {
      expect(screen.getByTestId('region-snipper')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('กดปุ่ม ยกเลิก (Esc) บน Top toolbar → เรียก onClose', async () => {
    const onCloseMock = vi.fn();
    render(<RegionSnipper customStream={mockStream} onClose={onCloseMock} />);

    await waitFor(() => {
      expect(screen.getByTestId('region-snipper')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByTestId('btn-snipper-cancel');
    fireEvent.click(cancelBtn);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('กดปุ่ม "กรอกข้อความเอง" → เรียก onSwitchToManual', async () => {
    const onManualMock = vi.fn();
    render(
      <RegionSnipper customStream={mockStream} onSwitchToManual={onManualMock} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('region-snipper')).toBeInTheDocument();
    });

    const manualBtn = screen.getByTestId('btn-snipper-top-manual');
    fireEvent.click(manualBtn);

    expect(onManualMock).toHaveBeenCalled();
  });

  it('ลากกรอบขนาดเล็กเกินไป (< 10px) → ข้ามการประมวลผล ไม่เรียก decode', async () => {
    const decodeSpy = vi.spyOn(qrLib, 'decodeQrFromImageData');
    render(<RegionSnipper customStream={mockStream} />);

    await waitFor(() => {
      expect(screen.getByTestId('snipper-canvas')).toBeInTheDocument();
    });

    const canvas = screen.getByTestId('snipper-canvas');

    // Drag 5px by 5px
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 105, clientY: 105, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 105, clientY: 105, pointerId: 1 });

    expect(decodeSpy).not.toHaveBeenCalled();
  });

  it('ลากกรอบแล้วไม่พบ QR ในพื้นที่ → แสดง warning toast และสามารถลากใหม่ได้', async () => {
    vi.spyOn(qrLib, 'decodeQrFromImageData').mockReturnValue(null);
    render(<RegionSnipper customStream={mockStream} />);

    await waitFor(() => {
      expect(screen.getByTestId('snipper-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId('snipper-loading')).not.toBeInTheDocument();
    });

    const canvas = screen.getByTestId('snipper-canvas');

    // Drag 100px by 100px
    fireEvent.pointerDown(canvas, { clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 150, clientY: 150, pointerId: 1 });

    await waitFor(() => {
      const toast = screen.getByTestId('snipper-warning-toast');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveTextContent(messages.scan.qrNotFoundInRegion);
    });
  });

  it('ลากกรอบแล้วพบ QR → ถอดรหัสสำเร็จและเรียก onQrDetected', async () => {
    const expectedUid = 'ROBOQ-PC-SNIP-001';
    vi.spyOn(qrLib, 'decodeQrFromImageData').mockReturnValue(expectedUid);
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    } as Response);

    const onQrDetectedMock = vi.fn();
    render(
      <RegionSnipper
        customStream={mockStream}
        onQrDetected={onQrDetectedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('snipper-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId('snipper-loading')).not.toBeInTheDocument();
    });

    const canvas = screen.getByTestId('snipper-canvas');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 250, clientY: 250, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 250, clientY: 250, pointerId: 1 });

    await waitFor(() => {
      expect(onQrDetectedMock).toHaveBeenCalledWith(expectedUid);
      expect(pushMock).toHaveBeenCalledWith(`/register?uid=${expectedUid}`);
    });
  });

  it('ลากทิศทางกลับ (ขวาล่างไปซ้ายบน) → คำนวณกรอบได้ถูกต้องและถอดรหัสสำเร็จ', async () => {
    const expectedUid = 'ROBOQ-REVERSE-DRAG';
    vi.spyOn(qrLib, 'decodeQrFromImageData').mockReturnValue(expectedUid);
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    } as Response);

    const onQrDetectedMock = vi.fn();
    render(
      <RegionSnipper
        customStream={mockStream}
        onQrDetected={onQrDetectedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('snipper-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId('snipper-loading')).not.toBeInTheDocument();
    });

    const canvas = screen.getByTestId('snipper-canvas');

    // Drag from (300, 300) to (100, 100)
    fireEvent.pointerDown(canvas, { clientX: 300, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 100, clientY: 100, pointerId: 1 });

    await waitFor(() => {
      expect(onQrDetectedMock).toHaveBeenCalledWith(expectedUid);
      expect(pushMock).toHaveBeenCalledWith(`/register?uid=${expectedUid}`);
    });
  });
});
