'use client';

import React, { useState } from 'react';
import { ScanPanel } from '@/components/ScanPanel';
import { ManualInput } from '@/components/ManualInput';
import { CameraScanner } from '@/components/CameraScanner';
import { useScanMode } from '@/hooks/useScanMode';
import messages from '@/lib/messages';

export default function HomePage() {
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scanModeHook = useScanMode();

  const handleScanClick = () => {
    if (scanModeHook.mode === 'camera') {
      setShowCameraScanner(true);
      setShowManualInput(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mb-2 shadow-inner">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {messages.app.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {messages.app.subtitle}
          </p>
        </div>

        {/* Dynamic Section: Camera Scanner | Manual Input | Scan Panel */}
        {showCameraScanner ? (
          <CameraScanner
            onClose={() => setShowCameraScanner(false)}
            onSwitchToManual={() => {
              setShowCameraScanner(false);
              setShowManualInput(true);
            }}
          />
        ) : showManualInput ? (
          <ManualInput onCancel={() => setShowManualInput(false)} />
        ) : (
          <ScanPanel
            scanModeHook={scanModeHook}
            onScanClick={handleScanClick}
            onManualClick={() => setShowManualInput(true)}
          />
        )}
      </div>
    </main>
  );
}
