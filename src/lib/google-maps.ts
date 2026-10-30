/**
 * Helper สำหรับสร้าง และถอดรหัสพิกัดจาก Google Maps URL
 */

export interface ParsedCoordinates {
  latitude: number;
  longitude: number;
}

export type ParseGoogleMapsResult =
  | { type: 'COORDINATES'; latitude: number; longitude: number }
  | { type: 'SHORT_LINK'; url: string }
  | { type: 'INVALID' };

export function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    throw new TypeError('Latitude and longitude must be finite numbers');
  }

  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * สกัดพิกัด (latitude, longitude) จากข้อความ URL หรือเนื้อหา HTML
 */
export function extractCoordinatesFromText(text: string): ParsedCoordinates | null {
  if (!text || typeof text !== 'string') return null;

  const decoded = decodeURIComponent(text.trim());

  // 1. Raw Coordinates: "13.7563, 100.5018" หรือ "13.7563,100.5018"
  const rawCoordsMatch = decoded.match(/^(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (rawCoordsMatch) {
    const lat = parseFloat(rawCoordsMatch[1]);
    const lng = parseFloat(rawCoordsMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 2. Query param ?q=lat,lng หรือ &q=lat,lng หรือ ?query=lat,lng
  const queryMatch = decoded.match(/[?&](?:q|query)=(-?\d{1,2}(?:\.\d+)?),\+?(-?\d{1,3}(?:\.\d+)?)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 3. Query param ?ll=lat,lng หรือ &ll=lat,lng
  const llMatch = decoded.match(/[?&]ll=(-?\d{1,2}(?:\.\d+)?),\+?(-?\d{1,3}(?:\.\d+)?)/i);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 4. Center param ?center=lat,lng
  const centerMatch = decoded.match(/[?&]center=(-?\d{1,2}(?:\.\d+)?),\+?(-?\d{1,3}(?:\.\d+)?)/i);
  if (centerMatch) {
    const lat = parseFloat(centerMatch[1]);
    const lng = parseFloat(centerMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 5. Data params !3d<lat>!4d<lng>
  const dataMatch = decoded.match(/!3d(-?\d{1,2}(?:\.\d+)?)(?:!|%21)4d(-?\d{1,3}(?:\.\d+)?)/i);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 6. Path coordinates @<lat>,<lng>
  const atMatch = decoded.match(/@(-?\d{1,2}(?:\.\d+)?),\+?(-?\d{1,3}(?:\.\d+)?)/i);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 7. Path /maps/search/<lat>,<lng>
  const searchPathMatch = decoded.match(/\/maps\/search\/(-?\d{1,2}(?:\.\d+)?),\+?(-?\d{1,3}(?:\.\d+)?)/i);
  if (searchPathMatch) {
    const lat = parseFloat(searchPathMatch[1]);
    const lng = parseFloat(searchPathMatch[2]);
    if (isValidLatLng(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

/**
 * วิเคราะห์ URL ที่แอดมินนำมาวาง
 */
export function parseGoogleMapsUrl(input: string): ParseGoogleMapsResult {
  if (!input || typeof input !== 'string') {
    return { type: 'INVALID' };
  }

  const trimmed = input.trim();

  // ตรวจว่าเป็น Short link ที่ต้อง Resolve ก่อนหรือไม่ (เช่น maps.app.goo.gl หรือ goo.gl/maps)
  if (/^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(trimmed)) {
    return { type: 'SHORT_LINK', url: trimmed };
  }

  // ลองสกัดพิกัดตรง ๆ จาก URL
  const coords = extractCoordinatesFromText(trimmed);
  if (coords) {
    return { type: 'COORDINATES', latitude: coords.latitude, longitude: coords.longitude };
  }

  // ถ้าเป็น URL ของ Google Maps แต่ยังไม่มีพิกัดใน URL (เช่น อาจเป็น place search แบบชื่อ)
  if (/^https?:\/\/(?:www\.)?(?:google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps/i.test(trimmed)) {
    return { type: 'SHORT_LINK', url: trimmed };
  }

  return { type: 'INVALID' };
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

