import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { ScanPanel } from '../components/ScanPanel';
import messages from '../lib/messages';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

interface MockMediaQueryList extends MediaQueryList {
  _triggerChange: (matches: boolean) => void;
}

function createMatchMediaMock(initialMatches: Record<string, boolean>) {
  const listenersMap = new Map<string, Set<MatchMediaListener>>();
  const matchesState = { ...initialMatches };

  const mockFn = vi.fn().mockImplementation((query: string): MockMediaQueryList => {
    if (!listenersMap.has(query)) {
      listenersMap.set(query, new Set());
    }

    return {
      get matches() {
        return matchesState[query] ?? false;
      },
      media: query,
      onchange: null,
      addListener: vi.fn((listener: MatchMediaListener) => {
        listenersMap.get(query)?.add(listener);
      }),
      removeListener: vi.fn((listener: MatchMediaListener) => {
        listenersMap.get(query)?.delete(listener);
      }),
      addEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === 'change') {
          listenersMap.get(query)?.add(listener as MatchMediaListener);
        }
      }),
      removeEventListener: vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === 'change') {
          listenersMap.get(query)?.delete(listener as MatchMediaListener);
        }
      }),
      dispatchEvent: vi.fn(),
      _triggerChange: (newMatches: boolean) => {
        matchesState[query] = newMatches;
        const listeners = listenersMap.get(query);
        if (listeners) {
          const event = { matches: newMatches, media: query } as MediaQueryListEvent;
          listeners.forEach((l) => l(event));
        }
      },
    };
  });

  return {
    mockFn,
    setMatches: (query: string, matches: boolean) => {
      matchesState[query] = matches;
      const listeners = listenersMap.get(query);
      if (listeners) {
        const event = { matches, media: query } as MediaQueryListEvent;
        listeners.forEach((l) => l(event));
      }
    },
  };
}

describe('Phase 2: Responsive Detection + Layout หน้าแรก (ScanPanel)', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    // Default mock media devices with both features available
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
        getDisplayMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('mock matchMedia: 1024px (Desktop) แสดงปุ่มอัปโหลด (อัปโหลดภาพ QR จากโฟลเดอร์)', () => {
    const { mockFn } = createMatchMediaMock({
      '(max-width: 767px)': false,
      '(pointer: coarse)': false,
    });
    window.matchMedia = mockFn;

    render(<ScanPanel />);

    const scanBtn = screen.getByTestId('btn-scan-qr');
    expect(scanBtn).toHaveTextContent(messages.scan.scanQrUpload);
    expect(scanBtn).not.toBeDisabled();
    expect(screen.getByTestId('btn-manual-input')).toHaveTextContent(messages.scan.manualInput);
  });

  it('mock matchMedia: 375px (Mobile) แสดงปุ่มกล้อง (เปิดกล้องสแกน QR)', () => {
    const { mockFn } = createMatchMediaMock({
      '(max-width: 767px)': true,
      '(pointer: coarse)': true,
    });
    window.matchMedia = mockFn;

    render(<ScanPanel />);

    const scanBtn = screen.getByTestId('btn-scan-qr');
    expect(scanBtn).toHaveTextContent(messages.scan.scanQrCamera);
    expect(scanBtn).not.toBeDisabled();
  });

  it('แยก PC vs Mobile ตามขนาดหน้าจอ: จอกว้าง (>= 768px) เป็น PC (Upload), จอแคบ (< 768px) เป็น Mobile (กล้อง)', () => {
    // 1. PC: จอกว้าง
    const { mockFn: mockPc } = createMatchMediaMock({
      '(max-width: 767px)': false,
    });
    window.matchMedia = mockPc;
    const { unmount } = render(<ScanPanel />);
    expect(screen.getByTestId('btn-scan-qr')).toHaveTextContent(messages.scan.scanQrUpload);
    unmount();

    // 2. Mobile: จอแคบ
    const { mockFn: mockMobile } = createMatchMediaMock({
      '(max-width: 767px)': true,
    });
    window.matchMedia = mockMobile;
    render(<ScanPanel />);
    expect(screen.getByTestId('btn-scan-qr')).toHaveTextContent(messages.scan.scanQrCamera);
  });

  it('resize ข้าม breakpoint → ปุ่มเปลี่ยนตาม', () => {
    const { mockFn, setMatches } = createMatchMediaMock({
      '(max-width: 767px)': false,
      '(pointer: coarse)': false,
    });
    window.matchMedia = mockFn;

    render(<ScanPanel />);

    // Initially desktop upload
    expect(screen.getByTestId('btn-scan-qr')).toHaveTextContent(messages.scan.scanQrUpload);

    // Simulate resizing to mobile width
    act(() => {
      setMatches('(max-width: 767px)', true);
    });

    // Should change to camera
    expect(screen.getByTestId('btn-scan-qr')).toHaveTextContent(messages.scan.scanQrCamera);

    // Resize back to desktop
    act(() => {
      setMatches('(max-width: 767px)', false);
    });

    expect(screen.getByTestId('btn-scan-qr')).toHaveTextContent(messages.scan.scanQrUpload);
  });

  it('โหมด snip ที่ไม่มี getDisplayMedia → ปุ่ม Snip ใช้ไม่ได้ + แสดงข้อความเตือน', () => {
    render(
      <ScanPanel
        scanModeHook={{
          mode: 'snip',
          autoMode: 'snip',
          isHydrated: true,
          isCameraSupported: true,
          isScreenSupported: false,
          isUploadSupported: true,
          isButton1Supported: false,
          unsupportedMessage: messages.scan.screenNotSupported,
        }}
      />
    );

    const scanBtn = screen.getByTestId('btn-scan-qr');
    expect(scanBtn).toBeDisabled();
    expect(scanBtn).toHaveTextContent(messages.scan.scanQrScreen);
    expect(screen.getByTestId('unsupported-warning')).toHaveTextContent(
      messages.scan.screenNotSupported
    );
  });

  it('ไม่มี getUserMedia → ปุ่มกล้อง disabled + แสดงข้อความเตือน', () => {
    const { mockFn } = createMatchMediaMock({
      '(max-width: 767px)': true,
      '(pointer: coarse)': true,
    });
    window.matchMedia = mockFn;

    // Simulate lack of getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: undefined,
        getDisplayMedia: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    render(<ScanPanel />);

    const scanBtn = screen.getByTestId('btn-scan-qr');
    expect(scanBtn).toBeDisabled();
    expect(screen.getByTestId('unsupported-warning')).toHaveTextContent(
      messages.scan.cameraNotSupported
    );
  });
});

