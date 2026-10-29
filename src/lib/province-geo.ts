import thailandGeoData from "@/data/thailand-provinces.json";

export interface ProvinceFeature {
  type: string;
  properties: {
    name_th: string;
    name_en: string;
    name: string;
    bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
    sample_point: { lat: number; lng: number };
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

// Ray-casting planar point-in-ring algorithm
function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Polygon check: Inside outer boundary (ring 0) AND NOT inside any hole (ring 1..n)
function isPointInPolygonCoordinates(
  lng: number,
  lat: number,
  rings: number[][][]
): boolean {
  if (rings.length === 0) return false;
  // Must be inside outer ring
  if (!isPointInRing(lng, lat, rings[0])) {
    return false;
  }
  // Must NOT be inside any inner hole
  for (let k = 1; k < rings.length; k++) {
    if (isPointInRing(lng, lat, rings[k])) {
      return false;
    }
  }
  return true;
}

// Check point in Polygon or MultiPolygon
function isPointInGeometry(
  lng: number,
  lat: number,
  geometry: ProvinceFeature["geometry"]
): boolean {
  if (geometry.type === "Polygon") {
    return isPointInPolygonCoordinates(
      lng,
      lat,
      geometry.coordinates as number[][][]
    );
  }

  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates as number[][][][];
    for (let i = 0; i < polygons.length; i++) {
      if (isPointInPolygonCoordinates(lng, lat, polygons[i])) {
        return true;
      }
    }
    return false;
  }

  return false;
}

// Pre-index provinces once on module load for fast O(1) lookup
const provinceMap = new Map<string, ProvinceFeature>();

function initializeProvinceCache() {
  const features = (thailandGeoData as unknown as { features: ProvinceFeature[] }).features;
  for (const feature of features) {
    const th = feature.properties.name_th?.trim();
    const en = feature.properties.name_en?.trim();
    if (th) provinceMap.set(th, feature);
    if (en) provinceMap.set(en.toLowerCase(), feature);
  }
}

initializeProvinceCache();

/**
 * Returns all cached province GeoJSON features.
 */
export function getAllProvincesGeo(): ProvinceFeature[] {
  return (thailandGeoData as unknown as { features: ProvinceFeature[] }).features;
}

/**
 * Returns list of all 77 Thai province names.
 */
export function getAllProvinceNames(): string[] {
  return (thailandGeoData as unknown as { features: ProvinceFeature[] }).features.map(
    (f) => f.properties.name_th
  );
}

/**
 * Returns province bounding box [minLng, minLat, maxLng, maxLat].
 */
export function getProvinceBBox(
  provinceName: string
): [number, number, number, number] {
  const feature = findProvinceFeature(provinceName);
  if (!feature) {
    throw new Error(`ไม่พบข้อมูลจังหวัด: "${provinceName}"`);
  }
  return feature.properties.bbox;
}

/**
 * Returns a guaranteed representative internal point (lat, lng) within the province.
 */
export function getProvinceSamplePoint(
  provinceName: string
): { lat: number; lng: number } {
  const feature = findProvinceFeature(provinceName);
  if (!feature) {
    throw new Error(`ไม่พบข้อมูลจังหวัด: "${provinceName}"`);
  }
  return feature.properties.sample_point;
}

/**
 * Finds province feature by Thai or English name (case-insensitive for English).
 */
export function findProvinceFeature(name: string): ProvinceFeature | null {
  if (!name || typeof name !== "string") return null;
  const trimmed = name.trim();
  return provinceMap.get(trimmed) || provinceMap.get(trimmed.toLowerCase()) || null;
}

/**
 * Checks whether a given (latitude, longitude) coordinate falls strictly within the specified province.
 *
 * Golden Rules:
 * - Latitude valid range: [-90, 90]
 * - Longitude valid range: [-180, 180]
 * - Coordinates are matched against GeoJSON [lng, lat]
 * - If provinceName is unknown: throws Error
 * - If coordinate is NaN, Infinity, or outside world bounds: returns false
 */
export function isPointInProvince(
  provinceName: string,
  latitude: number,
  longitude: number
): boolean {
  if (!provinceName || typeof provinceName !== "string") {
    throw new Error(`ชื่อจังหวัดไม่ถูกต้อง: "${provinceName}"`);
  }

  const feature = findProvinceFeature(provinceName);
  if (!feature) {
    throw new Error(`ไม่พบข้อมูลจังหวัด: "${provinceName}"`);
  }

  // Validate numeric coordinate sanity
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    !isFinite(latitude) ||
    !isFinite(longitude)
  ) {
    return false;
  }

  // Check world coordinate range
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return false;
  }

  // Fast Bounding Box check (minLng, minLat, maxLng, maxLat) in O(1)
  const [minLng, minLat, maxLng, maxLat] = feature.properties.bbox;
  if (
    longitude < minLng ||
    longitude > maxLng ||
    latitude < minLat ||
    latitude > maxLat
  ) {
    return false;
  }

  // Exact planar ray-casting test
  return isPointInGeometry(longitude, latitude, feature.geometry);
}
