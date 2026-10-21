'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decodeQrFromImageData } from '@/lib/qr';
import { processScannedUid } from '@/lib/uid-navigation';
import messages from '@/lib/messages';

export interface ImageUploaderProps {
  onClose?: () => void;
  onSwitchToManual?: () => void;
  /** For testing/E2E: callback when a raw QR string is detected */
  onQrDetected?: (qr: string) => void;
  /** For testing: custom decoder to mock decoding in test environments without full canvas */
  customDecoder?: (file: File) => Promise<string | null>;
}

export function ImageUploader({
  onClose,
  onSwitchToManual,
  onQrDetected,
  customDecoder,
}: ImageUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successUid, setSuccessUid] = useState<string | null>(null);

  // Clean up preview object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle keyboard Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Process selected file
  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setSuccessUid(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(messages.scan.invalidImageType);
        return;
      }

      setFileName(file.name);
      setIsProcessing(true);

      // Preview URL
      let currentBlobUrl: string | null = null;
      if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
        try {
          currentBlobUrl = URL.createObjectURL(file);
          setPreviewUrl(currentBlobUrl);
        } catch {
          // ignore preview error
        }
      }

      // If custom decoder provided (e.g. in tests)
      if (customDecoder) {
        try {
          const qr = await customDecoder(file);
          if (!qr) {
            setError(messages.scan.qrNotFoundInImage);
            setIsProcessing(false);
            return;
          }
          onQrDetected?.(qr);
          setSuccessUid(qr);
          await processScannedUid(qr, router, {
            onError: (msg) => {
              setError(msg);
              setIsProcessing(false);
            },
          });
        } catch {
          setError(messages.scan.fileReadError);
          setIsProcessing(false);
        }
        return;
      }

      // Decode using HTML Image and Canvas
      const reader = new FileReader();

      reader.onerror = () => {
        setError(messages.scan.fileReadError);
        setIsProcessing(false);
      };

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();

        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              setError(messages.scan.fileReadError);
              setIsProcessing(false);
              return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = decodeQrFromImageData(imageData);

            if (!qr) {
              setError(messages.scan.qrNotFoundInImage);
              setIsProcessing(false);
              return;
            }

            onQrDetected?.(qr);
            setSuccessUid(qr);
            await processScannedUid(qr, router, {
              onError: (msg) => {
                setError(msg);
                setIsProcessing(false);
              },
            });
          } catch {
            setError(messages.scan.fileReadError);
            setIsProcessing(false);
          }
        };

        img.onerror = () => {
          setError(messages.scan.fileReadError);
          setIsProcessing(false);
        };

        img.src = dataUrl;
      };

      reader.readAsDataURL(file);
    },
    [customDecoder, onQrDetected, router]
  );

  // Handle Clipboard Paste (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    // Reset file input value so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      data-testid="image-uploader-card"
      className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-md space-y-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          <span>{messages.scan.uploadTitle}</span>
        </h2>
        {onClose && (
          <button
            type="button"
            id="btn-close-uploader"
            data-testid="btn-close-uploader"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
          >
            {messages.scan.closeUpload}
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        id="image-file-input"
        data-testid="image-file-input"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        data-testid="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFilePicker}
        className={`w-full p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-700/30'
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerFilePicker();
          }
        }}
        aria-label={messages.scan.uploadInstructions}
      >
        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {isDragging ? messages.scan.dropImageHere : messages.scan.uploadInstructions}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {messages.scan.uploadHint}
          </p>
        </div>

        <button
          type="button"
          id="btn-choose-file"
          data-testid="btn-choose-file"
          onClick={(e) => {
            e.stopPropagation();
            triggerFilePicker();
          }}
          disabled={isProcessing}
          className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-medium rounded-lg transition shadow-sm cursor-pointer"
        >
          {messages.scan.scanQrUpload}
        </button>
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div
          data-testid="uploader-processing"
          className="flex items-center justify-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-sm"
        >
          <svg
            className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>{messages.scan.readingImage}</span>
        </div>
      )}

      {/* Selected File Name */}
      {fileName && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono text-center truncate px-2">
          {fileName}
        </p>
      )}

      {/* Success State */}
      {successUid && (
        <div
          data-testid="uploader-success"
          className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{messages.scan.scanSuccess}: <strong>{successUid}</strong></span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          id="upload-error"
          role="alert"
          data-testid="upload-error"
          className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs space-y-2"
        >
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 mt-0.5 shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="leading-relaxed">{error}</p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              id="btn-retry-upload"
              data-testid="btn-retry-upload"
              onClick={triggerFilePicker}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium cursor-pointer transition shadow-sm"
            >
              {messages.scan.chooseNewImage}
            </button>
            {onSwitchToManual && (
              <button
                type="button"
                id="btn-switch-manual"
                data-testid="btn-switch-manual"
                onClick={onSwitchToManual}
                className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium cursor-pointer transition"
              >
                {messages.scan.manualInput}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Fallback: Switch to Manual Text Input */}
      {onSwitchToManual && !error && (
        <button
          type="button"
          id="btn-uploader-manual"
          data-testid="btn-uploader-manual"
          onClick={onSwitchToManual}
          className="w-full py-2.5 px-4 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/40 rounded-xl transition"
        >
          <svg
            className="w-4 h-4"
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
      )}
    </div>
  );
}

export default ImageUploader;
