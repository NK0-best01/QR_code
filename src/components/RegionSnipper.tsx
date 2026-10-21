'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decodeQrFromImageData } from '@/lib/qr';
import {
  normalizeSelection,
  isSelectionValid,
  scaleDisplayToNatural,
  cropCanvasToImageData,
  Point,
  NormalizedRect,
} from '@/lib/crop';
import { processScannedUid } from '@/lib/uid-navigation';
import messages from '@/lib/messages';

export interface RegionSnipperProps {
  onClose?: () => void;
  onSwitchToManual?: () => void;
  /** For testing: custom stream to avoid real getDisplayMedia */
  customStream?: MediaStream;
  /** For testing/E2E: custom image data to directly populate screenshot without prompt */
  customImageData?: ImageData;
  /** For testing/E2E: custom image src URL */
  customImageSrc?: string;
  /** For testing: callback when a raw QR string is detected */
  onQrDetected?: (qr: string) => void;
}

export function RegionSnipper({
  onClose,
  onSwitchToManual,
  customStream,
  customImageData,
  customImageSrc,
  onQrDetected,
}: RegionSnipperProps) {
  const router = useRouter();

  // References
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // States
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [uidError, setUidError] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Dragging selection states
  const isDraggingRef = useRef<boolean>(false);
  const startPointRef = useRef<Point | null>(null);
  const currentRectRef = useRef<NormalizedRect | null>(null);

  // Image natural & display dimensions
  const dimensionsRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    displayWidth: number;
    displayHeight: number;
  }>({ naturalWidth: 0, naturalHeight: 0, displayWidth: 0, displayHeight: 0 });

  // Cleanup media stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Redraw the interactive display canvas
  const drawDisplay = useCallback(
    (selection: NormalizedRect | null) => {
      const displayCanvas = displayCanvasRef.current;
      const snapshotCanvas = snapshotCanvasRef.current;
      if (!displayCanvas || !snapshotCanvas) return;

      const ctx = displayCanvas.getContext('2d');
      if (!ctx) return;

      const { displayWidth, displayHeight } = dimensionsRef.current;
      if (displayWidth <= 0 || displayHeight <= 0) return;

      // 1. Draw snapshot image scaled to display dimensions
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.drawImage(snapshotCanvas, 0, 0, displayWidth, displayHeight);

      // 2. Draw semi-transparent dark mask over entire screen
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // 3. If there is an active selection, clear mask inside selection to reveal bright image
      if (selection && selection.width > 0 && selection.height > 0) {
        ctx.save();
        // Clear mask in selection area
        ctx.beginPath();
        ctx.rect(selection.x, selection.y, selection.width, selection.height);
        ctx.clip();
        ctx.drawImage(snapshotCanvas, 0, 0, displayWidth, displayHeight);
        ctx.restore();

        // Draw crisp border around selection
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);

        // Draw corner brackets
        const bracketSize = Math.min(12, Math.min(selection.width, selection.height) / 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(selection.x, selection.y + bracketSize);
        ctx.lineTo(selection.x, selection.y);
        ctx.lineTo(selection.x + bracketSize, selection.y);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(selection.x + selection.width - bracketSize, selection.y);
        ctx.lineTo(selection.x + selection.width, selection.y);
        ctx.lineTo(selection.x + selection.width, selection.y + bracketSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(selection.x, selection.y + selection.height - bracketSize);
        ctx.lineTo(selection.x, selection.y + selection.height);
        ctx.lineTo(selection.x + bracketSize, selection.y + selection.height);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(selection.x + selection.width - bracketSize, selection.y + selection.height);
        ctx.lineTo(selection.x + selection.width, selection.y + selection.height);
        ctx.lineTo(selection.x + selection.width, selection.y + selection.height - bracketSize);
        ctx.stroke();
      }
    },
    []
  );

  // Setup snapshot canvas from ImageData
  const loadFromImageData = useCallback(
    (imgData: ImageData) => {
      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = imgData.width;
      snapshotCanvas.height = imgData.height;
      const ctx = snapshotCanvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(imgData, 0, 0);
      }
      snapshotCanvasRef.current = snapshotCanvas;

      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      dimensionsRef.current = {
        naturalWidth: imgData.width,
        naturalHeight: imgData.height,
        displayWidth: winWidth,
        displayHeight: winHeight,
      };

      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        displayCanvas.width = winWidth;
        displayCanvas.height = winHeight;
      }

      setIsReady(true);
      setIsInitializing(false);
      drawDisplay(null);
    },
    [drawDisplay]
  );

  // Capture screen frame via getDisplayMedia
  const captureScreenshot = useCallback(() => {
    void Promise.resolve().then(async () => {
      setIsInitializing(true);
      setScreenError(null);
      setUidError(null);
      setWarningMessage(null);

      // E2E or window injected image data check
    if (typeof window !== 'undefined' && (window as unknown as { __INJECT_SNIP_IMAGE__?: ImageData }).__INJECT_SNIP_IMAGE__) {
      loadFromImageData((window as unknown as { __INJECT_SNIP_IMAGE__: ImageData }).__INJECT_SNIP_IMAGE__);
      return;
    }

    if (customImageData) {
      loadFromImageData(customImageData);
      return;
    }

    if (customImageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let snapshotCanvas = snapshotCanvasRef.current;
        if (!snapshotCanvas) {
          snapshotCanvas = document.createElement('canvas');
          snapshotCanvasRef.current = snapshotCanvas;
        }
        snapshotCanvas.width = img.naturalWidth || img.width;
        snapshotCanvas.height = img.naturalHeight || img.height;
        const ctx = snapshotCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, snapshotCanvas.width, snapshotCanvas.height);
          loadFromImageData(data);
        }
      };
      img.onerror = () => {
        setIsInitializing(false);
        setScreenError(messages.scan.screenNotSupported);
      };
      img.src = customImageSrc;
      return;
    }

    // Check Secure Context or getDisplayMedia availability
    if (
      !customStream &&
      (typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getDisplayMedia !== 'function')
    ) {
      setIsInitializing(false);
      setScreenError(messages.scan.screenNotSupported);
      return;
    }

    let stream: MediaStream | null = null;
    try {
      setIsCapturing(true);

      stream = customStream
        ? customStream
        : await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
            } as MediaTrackConstraints,
            audio: false,
          });

      streamRef.current = stream;

      // Extract a single still frame to canvas
      const video = document.createElement('video');
      video.playsInline = true;
      try {
        video.srcObject = stream;
      } catch {
        // ignore srcObject assignment error in jsdom
      }

      try {
        if (typeof video.play === 'function') {
          const p = video.play();
          if (p && typeof p.catch === 'function') {
            await Promise.race([
              p.catch(() => {}),
              new Promise<void>((resolve) => setTimeout(resolve, 200)),
            ]);
          }
        }
      } catch {
        // ignore play() not implemented in jsdom
      }

      // Ensure video metadata is loaded before drawing in real browsers
      if (!customStream && video.readyState < 2 && typeof video.addEventListener === 'function') {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 50);
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      }

      const naturalW = video.videoWidth || (typeof window !== 'undefined' ? window.innerWidth : 1920);
      const naturalH = video.videoHeight || (typeof window !== 'undefined' ? window.innerHeight : 1080);

      const snapshotCanvas = document.createElement('canvas');
      snapshotCanvas.width = naturalW;
      snapshotCanvas.height = naturalH;

      const sCtx = snapshotCanvas.getContext('2d', { willReadFrequently: true });
      if (sCtx) {
        try {
          sCtx.drawImage(video, 0, 0, naturalW, naturalH);
        } catch {
          // ignore drawImage in jsdom
        }
      }
      snapshotCanvasRef.current = snapshotCanvas;

      const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

      dimensionsRef.current = {
        naturalWidth: naturalW,
        naturalHeight: naturalH,
        displayWidth: winWidth,
        displayHeight: winHeight,
      };

      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas) {
        displayCanvas.width = winWidth;
        displayCanvas.height = winHeight;
      }

      setIsReady(true);
      setIsCapturing(false);
      setIsInitializing(false);
      drawDisplay(null);
    } catch (err: unknown) {
      setIsCapturing(false);
      setIsInitializing(false);

      const errName = err instanceof Error ? err.name : '';
      const errMsg = err instanceof Error ? err.message : String(err);

      if (
        errName === 'NotAllowedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('cancel') ||
        errMsg.toLowerCase().includes('aborted')
      ) {
        setScreenError(messages.scan.screenPermissionDenied);
      } else {
        setScreenError(messages.scan.screenNotSupported);
      }
    } finally {
      // REQUIREMENT: getDisplayMedia -> draw single frame to canvas -> STOP stream IMMEDIATELY in finally
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
    }
    });
  }, [customImageData, customImageSrc, customStream, drawDisplay, loadFromImageData]);

  // Initial screenshot capture & keyboard Esc handler
  useEffect(() => {
    captureScreenshot();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopStream();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      stopStream();
    };
  }, [captureScreenshot, onClose, stopStream]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (!isReady) return;
      const displayCanvas = displayCanvasRef.current;
      if (displayCanvas && typeof window !== 'undefined') {
        displayCanvas.width = window.innerWidth;
        displayCanvas.height = window.innerHeight;
        dimensionsRef.current.displayWidth = window.innerWidth;
        dimensionsRef.current.displayHeight = window.innerHeight;
        drawDisplay(currentRectRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawDisplay, isReady]);

  // Process mouse / pointer drag selection
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isReady) return;
    const canvas = displayCanvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }

    isDraggingRef.current = true;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    currentRectRef.current = null;
    setWarningMessage(null);
    setUidError(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !startPointRef.current) return;

    const currentPoint: Point = { x: e.clientX, y: e.clientY };
    const rect = normalizeSelection(startPointRef.current, currentPoint);
    currentRectRef.current = rect;
    drawDisplay(rect);
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const canvas = displayCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    const rect =
      currentRectRef.current ??
      (startPointRef.current
        ? normalizeSelection(startPointRef.current, { x: e.clientX, y: e.clientY })
        : null);

    if (!rect || !isSelectionValid(rect, 10)) {
      // Box too small (< 10px), skip processing and reset display
      currentRectRef.current = null;
      drawDisplay(null);
      return;
    }

    const snapshotCanvas = snapshotCanvasRef.current;
    if (!snapshotCanvas) return;

    const { naturalWidth, naturalHeight, displayWidth, displayHeight } = dimensionsRef.current;

    const cropRect = scaleDisplayToNatural(
      rect,
      { width: displayWidth, height: displayHeight },
      { width: naturalWidth, height: naturalHeight }
    );

    if (!cropRect) {
      drawDisplay(null);
      return;
    }

    const croppedImageData = cropCanvasToImageData(snapshotCanvas, cropRect);
    if (!croppedImageData) {
      setWarningMessage(messages.scan.qrNotFoundInRegion);
      drawDisplay(rect);
      return;
    }

    const qrText = decodeQrFromImageData(croppedImageData);

    if (qrText) {
      stopStream();
      if (onQrDetected) {
        onQrDetected(qrText);
      }

      await processScannedUid(qrText, router, {
        onError: (errMessage) => {
          setUidError(errMessage);
        },
      });
    } else {
      setWarningMessage(messages.scan.qrNotFoundInRegion);
      drawDisplay(rect);
    }
  };

  // If there's an error during capture (or denied permission)
  if (screenError) {
    return (
      <div
        data-testid="region-snipper-error"
        className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-4 text-center"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {messages.scan.scanQrScreen}
          </h2>
          <p id="screen-error-text" data-testid="screen-error-text" className="text-sm text-zinc-600 dark:text-zinc-400">
            {screenError}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            id="btn-retry-snipper"
            data-testid="btn-retry-snipper"
            onClick={() => void captureScreenshot()}
            className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer"
          >
            {messages.register.retry}
          </button>
          {onSwitchToManual && (
            <button
              type="button"
              id="btn-snipper-manual"
              data-testid="btn-snipper-manual"
              onClick={onSwitchToManual}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
            >
              {messages.scan.manualInput}
            </button>
          )}
          <button
            type="button"
            id="btn-close-snipper"
            data-testid="btn-close-snipper"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl font-medium text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
          >
            {messages.scan.closeSnipper}
          </button>
        </div>
      </div>
    );
  }

  // Fullscreen snipping overlay view
  return (
    <div
      data-testid="region-snipper"
      className="fixed inset-0 z-50 overflow-hidden bg-black select-none cursor-crosshair flex flex-col"
    >
      {/* Top Banner Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 pointer-events-none">
        <div className="bg-zinc-900/90 text-white backdrop-blur border border-zinc-700/80 px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 text-xs pointer-events-auto">
          <div className="flex items-center gap-1.5 font-medium">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>ลากเมาส์เพื่อครอบพื้นที่ QR Code</span>
          </div>

          <span className="text-zinc-600">|</span>

          {onSwitchToManual && (
            <button
              type="button"
              id="btn-snipper-top-manual"
              data-testid="btn-snipper-top-manual"
              onClick={onSwitchToManual}
              className="text-zinc-300 hover:text-white transition cursor-pointer"
            >
              {messages.scan.manualInput}
            </button>
          )}

          <button
            type="button"
            id="btn-snipper-cancel"
            data-testid="btn-snipper-cancel"
            onClick={onClose}
            className="text-zinc-400 hover:text-red-400 transition cursor-pointer"
          >
            {messages.scan.closeSnipper}
          </button>
        </div>

        {/* Warning Toast if QR not found in selection */}
        {warningMessage && (
          <div
            data-testid="snipper-warning-toast"
            role="alert"
            className="bg-amber-500/90 text-zinc-950 font-medium px-4 py-1.5 rounded-full shadow-lg text-xs flex items-center gap-1.5 animate-bounce"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{warningMessage}</span>
          </div>
        )}

        {/* UID Error Alert (e.g. UID already registered) */}
        {uidError && (
          <div
            data-testid="snipper-uid-error"
            role="alert"
            className="bg-red-600 text-white font-medium px-4 py-2 rounded-xl shadow-lg text-xs max-w-sm text-center"
          >
            <span>{uidError}</span>
          </div>
        )}
      </div>

      {/* Loading Screen Overlay while requesting stream */}
      {(isInitializing || isCapturing) && (
        <div
          data-testid="snipper-loading"
          className="absolute inset-0 z-30 flex flex-col items-center justify-center text-white gap-3 bg-zinc-950/80"
        >
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium">{messages.scan.processing}</span>
        </div>
      )}

      {/* Interactive Display Canvas */}
      <canvas
        ref={displayCanvasRef}
        data-testid="snipper-canvas"
        className="w-full h-full block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Off-screen Snapshot Source Canvas */}
      <canvas ref={snapshotCanvasRef} style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}
