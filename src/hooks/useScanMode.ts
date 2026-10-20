'use client';

import { useState, useSyncExternalStore, useCallback } from 'react';

export type ScanMode = 'camera' | 'snip';

export interface UseScanModeReturn {
  mode: ScanMode | undefined;
  autoMode: ScanMode | undefined;
  isHydrated: boolean;
  isCameraSupported: boolean;
  isScreenSupported: boolean;
  isButton1Supported: boolean;
  unsupportedMessage: string | null;
  toggleMode: () => void;
  setMode: (mode: ScanMode) => void;
}

// Breakpoint md = 768px (PC: >= 768px, Mobile: < 768px)
const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function subscribeMedia(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mqMobile = window.matchMedia(MOBILE_MEDIA_QUERY);
  const listener = () => callback();

  if (mqMobile.addEventListener) {
    mqMobile.addEventListener('change', listener);
  } else {
    mqMobile.addListener(listener);
  }

  return () => {
    if (mqMobile.removeEventListener) {
      mqMobile.removeEventListener('change', listener);
    } else {
      mqMobile.removeListener(listener);
    }
  };
}

function getClientAutoMode(): ScanMode {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'camera';
  }
  // แยกตามขนาดหน้าจอ: จอแคบ (< 768px) เป็นมือถือ (กล้อง), จอกว้าง (>= 768px) เป็น PC (snip)
  const isMobile = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  return isMobile ? 'camera' : 'snip';
}

function getServerAutoMode(): ScanMode | undefined {
  return undefined;
}

function getIsCameraSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  return typeof navigator.mediaDevices.getUserMedia === 'function';
}

function getIsScreenSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  return typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

export function useScanMode(): UseScanModeReturn {
  const autoMode = useSyncExternalStore(
    subscribeMedia,
    getClientAutoMode,
    getServerAutoMode
  );

  const [manualOverride, setManualOverride] = useState<ScanMode | null>(null);

  const mode = manualOverride ?? autoMode;
  const isHydrated = mode !== undefined;

  const isCameraSupported = isHydrated ? getIsCameraSupported() : true;
  const isScreenSupported = isHydrated ? getIsScreenSupported() : true;

  const isButton1Supported =
    mode === 'camera' ? isCameraSupported : isScreenSupported;

  let unsupportedMessage: string | null = null;
  if (mode === 'camera' && !isCameraSupported) {
    unsupportedMessage = 'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง กรุณาใช้ปุ่มกรอกข้อความแทน';
  } else if (mode === 'snip' && !isScreenSupported) {
    unsupportedMessage = 'เบราว์เซอร์นี้ไม่รองรับการจับภาพหน้าจอ กรุณาใช้ปุ่มกรอกข้อความแทน';
  }

  const toggleMode = useCallback(() => {
    setManualOverride((current) => {
      const active = current ?? getClientAutoMode();
      return active === 'camera' ? 'snip' : 'camera';
    });
  }, []);

  const setMode = useCallback((newMode: ScanMode) => {
    setManualOverride(newMode);
  }, []);

  return {
    mode,
    autoMode,
    isHydrated,
    isCameraSupported,
    isScreenSupported,
    isButton1Supported,
    unsupportedMessage,
    toggleMode,
    setMode,
  };
}
