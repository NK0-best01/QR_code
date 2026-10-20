'use client';

import React from 'react';
import { useScanMode } from '@/hooks/useScanMode';
import messages from '@/lib/messages';

interface ScanPanelProps {
  onScanClick?: () => void;
  onManualClick?: () => void;
  // Allows injecting scanMode state for testing
  scanModeHook?: ReturnType<typeof useScanMode>;
}

export function ScanPanel({
  onScanClick,
  onManualClick,
  scanModeHook,
}: ScanPanelProps) {
  const internalHook = useScanMode();
  const {
    mode,
    isHydrated,
    isButton1Supported,
    unsupportedMessage,
  } = scanModeHook ?? internalHook;

  if (!isHydrated) {
    // Skeleton loading state before client mount to prevent hydration mismatch
    return (
      <div
        data-testid="scan-panel-skeleton"
        className="w-full max-w-md mx-auto space-y-4 animate-pulse p-6 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
      >
        <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        <div className="h-12 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
      </div>
    );
  }

  const isCamera = mode === 'camera';
  const button1Text = isCamera
    ? messages.scan.scanQrCamera
    : messages.scan.scanQrScreen;

  return (
    <div
      data-testid="scan-panel"
      className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-4"
    >
      {/* Primary Action: QR Scan (Camera or Screen Snipper) */}
      <div className="space-y-2">
        <button
          type="button"
          id="btn-scan-qr"
          data-testid="btn-scan-qr"
          disabled={!isButton1Supported}
          onClick={onScanClick}
          className={`w-full py-3.5 px-5 rounded-xl font-medium text-base flex items-center justify-center gap-2 transition-all shadow-sm ${
            isButton1Supported
              ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white cursor-pointer'
              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
          }`}
          aria-label={button1Text}
        >
          {isCamera ? (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
          <span>{button1Text}</span>
        </button>

        {/* Warning if unsupported */}
        {!isButton1Supported && unsupportedMessage && (
          <p
            role="alert"
            data-testid="unsupported-warning"
            className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50 leading-relaxed text-center"
          >
            {unsupportedMessage}
          </p>
        )}
      </div>

      {/* Secondary Action: Manual Text Input */}
      <button
        type="button"
        id="btn-manual-input"
        data-testid="btn-manual-input"
        onClick={onManualClick}
        className="w-full py-3.5 px-5 rounded-xl font-medium text-base bg-zinc-100 dark:bg-zinc-700/60 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 transition-all flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-600 cursor-pointer active:scale-[0.99]"
      >
        <svg
          className="w-5 h-5 text-zinc-500 dark:text-zinc-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span>{messages.scan.manualInput}</span>
      </button>
    </div>
  );
}

export default ScanPanel;
