/**
 * Helper สำหรับสร้าง Google Maps URL
 */

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
