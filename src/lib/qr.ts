import jsQR from 'jsqr';

export interface QrLocation {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
  bottomRightCorner: { x: number; y: number };
  bottomLeftCorner: { x: number; y: number };
}

export interface QrDecodeResult {
  data: string;
  location?: QrLocation;
}

/**
 * Decodes a QR code from ImageData or a compatible { data, width, height } buffer.
 * Returns the trimmed string content of the QR code, or null if no QR code was found.
 */
export function decodeQrFromImageData(
  imageData: ImageData | { data: Uint8ClampedArray; width: number; height: number }
): string | null {
  if (
    !imageData ||
    !imageData.data ||
    typeof imageData.width !== 'number' ||
    typeof imageData.height !== 'number' ||
    imageData.width <= 0 ||
    imageData.height <= 0
  ) {
    return null;
  }

  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (code && typeof code.data === 'string' && code.data.trim().length > 0) {
      return code.data.trim();
    }

    return null;
  } catch {
    return null;
  }
}
