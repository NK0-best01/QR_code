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

function subscribeMedia(callback: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mqMobile = window.matchMedia('(max-width: 767px)');
  const mqCoarse = window.matchMedia('(pointer: coarse)');

  const listener = () => callback();

  if (mqMobile.addEventListener) {
    mqMobile.addEventListener('change', listener);
    mqCoarse.addEventListener('change', listener);
  } else {
    mqMobile.addListener(listener);
    mqCoarse.addListener(listener);
  }

  return () => {
    if (mqMobile.removeEventListener) {
      mqMobile.removeEventListener('change', listener);
      mqCoarse.removeEventListener('change', listener);
    } else {
      mqMobile.removeListener(listener);
      mqCoarse.removeListener(listener);
    }
  };
}

function getClientAutoMode(): ScanMode {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'camera';
  }
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  return isMobile || isCoarse ? 'camera' : 'snip';
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
