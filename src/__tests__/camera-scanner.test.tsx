import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CameraScanner } from '../components/CameraScanner';
import { processScannedUid } from '../lib/uid-navigation';
import messages from '../lib/messages';

// Mock router
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe('Phase 6: CameraScanner Unit & Component Tests', () => {
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

    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('เมื่อผู้ใช้ปฏิเสธสิทธิ์ (NotAllowedError) → แสดงข้อความ cameraPermissionDenied', async () => {
    const error = new Error('Permission denied');
    error.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

    render(<CameraScanner />);

    await waitFor(() => {
      const banner = screen.getByTestId('camera-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(messages.scan.cameraPermissionDenied);
    });
  });

  it('เมื่อไม่พบอุปกรณ์กล้อง (NotFoundError) → แสดงข้อความ cameraNotFound', async () => {
    const error = new Error('No camera found');
    error.name = 'NotFoundError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

    render(<CameraScanner />);

    await waitFor(() => {
      const banner = screen.getByTestId('camera-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(messages.scan.cameraNotFound);
    });
  });

  it('เมื่อกล้องถูกใช้งานโดยแอปอื่น (NotReadableError) → แสดงข้อความ cameraInUse', async () => {
    const error = new Error('Device in use');
    error.name = 'NotReadableError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

    render(<CameraScanner />);

    await waitFor(() => {
      const banner = screen.getByTestId('camera-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(messages.scan.cameraInUse);
    });
  });

  it('เมื่อบริบทไม่ใช่ HTTPS/SecureContext → แสดงข้อความ cameraInsecureContext', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      writable: true,
      configurable: true,
    });

    render(<CameraScanner />);

    await waitFor(() => {
      const banner = screen.getByTestId('camera-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(messages.scan.cameraInsecureContext);
    });
  });

  it('Unmount component แล้วทุก track ของกล้องถูก stop ทันที (ไม่ค้างไฟกล้อง)', async () => {
    const { unmount } = render(<CameraScanner customStream={mockStream} />);

    await waitFor(() => {
      expect(screen.getByTestId('camera-video')).toBeInTheDocument();
    });

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it('กดปุ่มปิดกล้อง → เรียก onClose และสั่ง stop ทุก track', async () => {
    const onCloseMock = vi.fn();
    render(<CameraScanner customStream={mockStream} onClose={onCloseMock} />);

    await waitFor(() => {
      expect(screen.getByTestId('camera-video')).toBeInTheDocument();
    });

    const closeBtn = screen.getByTestId('btn-close-camera');
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  it('กดปุ่ม "กรอกข้อความเอง" → เรียก onSwitchToManual และสั่ง stop ทุก track', async () => {
    const onManualMock = vi.fn();
    render(
      <CameraScanner
        customStream={mockStream}
        onSwitchToManual={onManualMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-video')).toBeInTheDocument();
    });

    const manualBtn = screen.getByTestId('btn-switch-to-manual');
    fireEvent.click(manualBtn);

    expect(onManualMock).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
  });

  it('processScannedUid: UID ใหม่ → push ไปหน้า /register?uid=...', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    } as Response);

    const routerMock = { push: vi.fn() };
    const success = await processScannedUid('NEW-SCAN-001', routerMock);

    expect(success).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith('/register?uid=NEW-SCAN-001');
  });

  it('processScannedUid: UID ซ้ำ → ไม่ navigate และแจ้งเตือนข้อความ UID นี้ลงทะเบียนแล้ว', async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true }),
    } as Response);

    const routerMock = { push: vi.fn() };
    const onErrorMock = vi.fn();
    const success = await processScannedUid('ALREADY-EXISTS-UID', routerMock, {
      onError: onErrorMock,
    });

    expect(success).toBe(false);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalledWith(messages.register.uidAlreadyRegistered);
  });
});
