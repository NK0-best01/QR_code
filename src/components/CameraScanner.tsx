'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decodeQrFromImageData } from '@/lib/qr';
import { processScannedUid } from '@/lib/uid-navigation';
import messages from '@/lib/messages';

interface CameraScannerProps {
  onClose?: () => void;
  onSwitchToManual?: () => void;
  /** For testing injection or custom stream handling */
  customStream?: MediaStream;
  /** For testing: callback when a raw QR string is detected */
  onQrDetected?: (qr: string) => void;
}

export function CameraScanner({
  onClose,
  onSwitchToManual,
  customStream,
  onQrDetected,
}: CameraScannerProps) {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const hasScannedRef = useRef<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uidError, setUidError] = useState<string | null>(null);
  const [detectedUid, setDetectedUid] = useState<string | null>(null);

  // Stop all media tracks and cancel animation loop
  const stopCamera = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore error on stop
        }
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleDetectedQr = useCallback(
    async (rawQr: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      // Stop camera tracks immediately on detection
      stopCamera();

      setDetectedUid(rawQr);
      if (onQrDetected) {
        onQrDetected(rawQr);
      }

      await processScannedUid(rawQr, router, {
        onError: (errMessage) => {
          setUidError(errMessage);
        },
      });
    },
    [router, stopCamera, onQrDetected]
  );

  const scanFrameRef = useRef<() => void>(() => {});

  // Frame processing loop with ~150ms throttle
  const scanFrame = useCallback(() => {
    if (hasScannedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const now = performance.now();
      // Throttle to save CPU and battery on mobile
      if (now - lastScanTimeRef.current >= 150) {
        lastScanTimeRef.current = now;

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const imageData = ctx.getImageData(0, 0, width, height);
            const qrText = decodeQrFromImageData(imageData);

            if (qrText) {
              void handleDetectedQr(qrText);
              return;
            }
          }
        }
      }
    }

    rafIdRef.current = requestAnimationFrame(() => scanFrameRef.current());
  }, [handleDetectedQr]);

  useEffect(() => {
    scanFrameRef.current = scanFrame;
  }, [scanFrame]);

  const startCamera = useCallback(() => {
    hasScannedRef.current = false;

    void Promise.resolve().then(async () => {
      // Check secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setIsLoading(false);
        setCameraError(messages.scan.cameraInsecureContext);
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setIsLoading(false);
        setCameraError(messages.scan.cameraNotSupported);
        return;
      }

      try {
        const stream = customStream
          ? customStream
          : await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => {});
        }

        setIsLoading(false);
        rafIdRef.current = requestAnimationFrame(() => scanFrameRef.current());
      } catch (err: unknown) {
        setIsLoading(false);
        const error = err as { name?: string };

        if (
          error.name === 'NotAllowedError' ||
          error.name === 'PermissionDeniedError'
        ) {
          setCameraError(messages.scan.cameraPermissionDenied);
        } else if (
          error.name === 'NotFoundError' ||
          error.name === 'DevicesNotFoundError'
        ) {
          setCameraError(messages.scan.cameraNotFound);
        } else if (
          error.name === 'NotReadableError' ||
          error.name === 'TrackStartError'
        ) {
          setCameraError(messages.scan.cameraInUse);
        } else {
          setCameraError(messages.scan.cameraNotSupported);
        }
      }
    });
  }, [customStream]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setCameraError(null);
    setUidError(null);
    setDetectedUid(null);
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div
      data-testid="camera-scanner"
      className="w-full max-w-md mx-auto p-5 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-4"
    >
      {/* Top Header & Close Button */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {messages.scan.scanQrCamera}
          </h2>
        </div>

        <button
          type="button"
          id="btn-close-camera"
          data-testid="btn-close-camera"
          onClick={() => {
            stopCamera();
            onClose?.();
          }}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition cursor-pointer"
          aria-label={messages.scan.closeCamera}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true" />

      {/* Viewport / Video Area */}
      <div className="relative aspect-[4/3] w-full bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
        {/* Live Video */}
        <video
          ref={videoRef}
          data-testid="camera-video"
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoading || cameraError ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Viewfinder Target Overlays (Visible when streaming) */}
        {!isLoading && !cameraError && !uidError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            <div className="relative w-48 h-48 border-2 border-dashed border-white/60 rounded-2xl shadow-sm flex items-center justify-center">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

              {/* Laser scanning beam animation */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
            </div>

            <p className="mt-4 text-xs font-medium text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur">
              {messages.scan.scanScanning}
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div
            data-testid="camera-loading"
            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-2 bg-zinc-950/80"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            <span className="text-xs">{messages.scan.processing}</span>
          </div>
        )}

        {/* Camera Permission / Device Error View */}
        {cameraError && (
          <div
            data-testid="camera-error-banner"
            role="alert"
            className="absolute inset-0 p-5 bg-zinc-900/95 text-white flex flex-col items-center justify-center text-center space-y-3 z-10"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-xs text-zinc-300 max-w-[280px] leading-relaxed">
              {cameraError}
            </p>
            <div className="flex gap-2 pt-1 w-full max-w-[240px]">
              <button
                type="button"
                id="btn-retry-camera"
                data-testid="btn-retry-camera"
                onClick={handleRetry}
                className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer"
              >
                {messages.register.retry}
              </button>
              <button
                type="button"
                id="btn-switch-to-manual-error"
                data-testid="btn-switch-to-manual-error"
                onClick={() => {
                  stopCamera();
                  onSwitchToManual?.();
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
              >
                {messages.scan.manualInput}
              </button>
            </div>
          </div>
        )}

        {/* UID Validation or Duplicate Error View */}
        {uidError && (
          <div
            data-testid="camera-uid-error"
            role="alert"
            className="absolute inset-0 p-5 bg-zinc-900/95 text-white flex flex-col items-center justify-center text-center space-y-3 z-10"
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            {detectedUid && (
              <p className="text-xs font-mono bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">
                UID: {detectedUid}
              </p>
            )}
            <p className="text-sm font-semibold text-amber-300">
              {uidError}
            </p>
            <div className="flex gap-2 pt-1 w-full max-w-[240px]">
              <button
                type="button"
                id="btn-rescan-camera"
                data-testid="btn-rescan-camera"
                onClick={handleRetry}
                className="flex-1 py-2 px-3 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer"
              >
                สแกนใหม่
              </button>
              <button
                type="button"
                id="btn-switch-to-manual-uid"
                data-testid="btn-switch-to-manual-uid"
                onClick={() => {
                  stopCamera();
                  onSwitchToManual?.();
                }}
                className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
              >
                {messages.scan.manualInput}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action: Switch to Manual Input */}
      <button
        type="button"
        id="btn-switch-to-manual"
        data-testid="btn-switch-to-manual"
        onClick={() => {
          stopCamera();
          onSwitchToManual?.();
        }}
        className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900/50 transition cursor-pointer flex items-center justify-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
