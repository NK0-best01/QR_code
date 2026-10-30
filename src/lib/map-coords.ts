import { geoMercator, GeoProjection } from 'd3-geo';

export const DEFAULT_MAP_WIDTH = 800;
export const DEFAULT_MAP_HEIGHT = 1000;
export const MAP_CENTER_LNG = 100.5;
export const MAP_CENTER_LAT = 13.5;
export const MAP_SCALE = 2600;

/**
 * Creates a calibrated Mercator projection centered on Thailand.
 */
export function createThailandProjection(
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT
): GeoProjection {
  return geoMercator()
    .center([MAP_CENTER_LNG, MAP_CENTER_LAT])
    .translate([width / 2, height / 2])
    .scale(MAP_SCALE);
}

/**
 * Converts geographic coordinates [latitude, longitude] to SVG point [x, y].
 */
export function coordsToSvgPoint(
  latitude: number,
  longitude: number,
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT
): [number, number] | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const projection = createThailandProjection(width, height);
  const pt = projection([longitude, latitude]);
  if (!pt) return null;

  return [Math.round(pt[0] * 100) / 100, Math.round(pt[1] * 100) / 100];
}

/**
 * Converts SVG point [x, y] to geographic coordinates [latitude, longitude].
 */
export function svgPointToCoords(
  svgX: number,
  svgY: number,
  width = DEFAULT_MAP_WIDTH,
  height = DEFAULT_MAP_HEIGHT
): [number, number] | null {
  if (
    typeof svgX !== 'number' ||
    typeof svgY !== 'number' ||
    !Number.isFinite(svgX) ||
    !Number.isFinite(svgY)
  ) {
    return null;
  }

  const projection = createThailandProjection(width, height);
  if (!projection.invert) return null;

  const inverted = projection.invert([svgX, svgY]);
  if (!inverted || !Number.isFinite(inverted[0]) || !Number.isFinite(inverted[1])) {
    return null;
  }

  const [longitude, latitude] = inverted;
  return [
    Math.round(latitude * 1e6) / 1e6,
    Math.round(longitude * 1e6) / 1e6,
  ];
}

/**
 * Converts client/screen mouse event coordinates to SVG coordinates
 * taking into account SVG viewBox and bounding client rect scaling.
 */
export function clientToSvgCoordinates(
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement
): [number, number] | null {
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return null;

  const inverse = ctm.inverse();
  const point = svgElement.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const transformed = point.matrixTransform(inverse);
  return [
    Math.round(transformed.x * 100) / 100,
    Math.round(transformed.y * 100) / 100,
  ];
}
