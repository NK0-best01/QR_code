export interface Point {
  x: number;
  y: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Normalizes two screen coordinates (e.g. from mouse drag) so that
 * x, y is always the top-left corner, and width/height are non-negative.
 * Handles reverse dragging (e.g. bottom-right to top-left) seamlessly.
 */
export function normalizeSelection(p1: Point, p2: Point): NormalizedRect {
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.abs(p2.x - p1.x);
  const height = Math.abs(p2.y - p1.y);

  return { x, y, width, height };
}

/**
 * Checks if the selection box meets the minimum size requirement (default 10px).
 * Selections smaller than this should be skipped / ignored.
 */
export function isSelectionValid(
  rect: { width: number; height: number },
  minSize = 10
): boolean {
  return rect.width >= minSize && rect.height >= minSize;
}

/**
 * Scales a display-space rectangle to natural image/canvas coordinate space,
 * taking into account natural resolution vs display size (including devicePixelRatio / HiDPI).
 * Clamps coordinates to ensure they stay strictly within image boundaries.
 */
export function scaleDisplayToNatural(
  rect: NormalizedRect,
  display: Dimensions,
  natural: Dimensions
): CropRect | null {
  if (
    display.width <= 0 ||
    display.height <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return null;
  }

  const scaleX = natural.width / display.width;
  const scaleY = natural.height / display.height;

  const rawX = Math.round(rect.x * scaleX);
  const rawY = Math.round(rect.y * scaleY);
  const rawW = Math.round(rect.width * scaleX);
  const rawH = Math.round(rect.height * scaleY);

  // Clamp x and y within [0, natural bounds]
  const clampedX = Math.max(0, Math.min(natural.width, rawX));
  const clampedY = Math.max(0, Math.min(natural.height, rawY));

  // Clamp width and height so x + width <= natural.width, y + height <= natural.height
  const clampedW = Math.max(0, Math.min(natural.width - clampedX, rawW));
  const clampedH = Math.max(0, Math.min(natural.height - clampedY, rawH));

  if (clampedW <= 0 || clampedH <= 0) {
    return null;
  }

  return {
    x: clampedX,
    y: clampedY,
    width: clampedW,
    height: clampedH,
  };
}

/**
 * Extracts the cropped ImageData from an HTMLCanvasElement using the calculated CropRect.
 */
export function cropCanvasToImageData(
  canvas: HTMLCanvasElement,
  cropRect: CropRect
): ImageData | null {
  if (!canvas || cropRect.width <= 0 || cropRect.height <= 0) {
    return null;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    return ctx.getImageData(
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height
    );
  } catch {
    return null;
  }
}
