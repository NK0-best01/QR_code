'use client';

import React, { useState } from 'react';
import { ScanPanel } from '@/components/ScanPanel';
import { ManualInput } from '@/components/ManualInput';
import { CameraScanner } from '@/components/CameraScanner';
import { RegionSnipper } from '@/components/RegionSnipper';
import { ImageUploader } from '@/components/ImageUploader';
import { useScanMode } from '@/hooks/useScanMode';
import messages from '@/lib/messages';
import Link from 'next/link';

export default function HomePage() {
  const [showManualInput, setShowManualInput] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showRegionSnipper, setShowRegionSnipper] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const scanModeHook = useScanMode();

  const handleScanClick = () => {
    if (scanModeHook.mode === 'camera') {
      setShowCameraScanner(true);
      setShowManualInput(false);
      setShowRegionSnipper(false);
      setShowImageUploader(false);
    } else if (scanModeHook.mode === 'snip') {
      setShowRegionSnipper(true);
      setShowManualInput(false);
      setShowCameraScanner(false);
      setShowImageUploader(false);
    } else {
      // mode === 'upload' (default on PC/Desktop)
      setShowImageUploader(true);
      setShowManualInput(false);
      setShowCameraScanner(false);
      setShowRegionSnipper(false);
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* Top-Right Staff Login Link */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Link
          href="/login"
          id="link-staff-login"
          data-testid="link-staff-login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-xs hover:shadow transition"
        >
          <svg
            className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
            />
          </svg>
          <span>เข้าสู่ระบบเจ้าหน้าที่</span>
        </Link>
      </div>

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

        {/* Dynamic Section: Camera Scanner | Image Uploader | Region Snipper | Manual Input | Scan Panel */}
        {showCameraScanner ? (
          <CameraScanner
            onClose={() => setShowCameraScanner(false)}
            onSwitchToManual={() => {
              setShowCameraScanner(false);
              setShowManualInput(true);
            }}
          />
        ) : showImageUploader ? (
          <ImageUploader
            onClose={() => setShowImageUploader(false)}
            onSwitchToManual={() => {
              setShowImageUploader(false);
              setShowManualInput(true);
            }}
          />
        ) : showRegionSnipper ? (
          <RegionSnipper
            onClose={() => setShowRegionSnipper(false)}
            onSwitchToManual={() => {
              setShowRegionSnipper(false);
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
