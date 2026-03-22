import { DEG } from '../constants.js';

/**
 * Convert latitude/longitude to a unit vector on a sphere.
 * @param {number} lat - Latitude in degrees (-90 to 90)
 * @param {number} lng - Longitude in degrees (-180 to 180)
 * @returns {{ x: number, y: number, z: number }}
 */
export function latLngToUnitVector(lat, lng) {
  const latRad = lat * DEG;
  const lngRad = lng * DEG;
  return {
    x: Math.cos(latRad) * Math.cos(lngRad),
    y: Math.sin(latRad),
    z: Math.cos(latRad) * Math.sin(lngRad)
  };
}

/**
 * Compute angular diameter of an object.
 * @param {number} physicalDiameter - Actual diameter
 * @param {number} distance - Distance to object
 * @returns {number} Angular diameter in degrees
 */
export function angularDiameter(physicalDiameter, distance) {
  return 2 * Math.atan(physicalDiameter / (2 * distance)) / DEG;
}

/**
 * Normalize an angle to [0, 360) degrees.
 */
export function normalizeDeg(angle) {
  return ((angle % 360) + 360) % 360;
}

/**
 * Normalize an angle to [0, 2π) radians.
 */
export function normalizeRad(angle) {
  const TWO_PI = 2 * Math.PI;
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Rotate a point around the Y axis.
 */
export function rotateY(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x * c + point.z * s,
    y: point.y,
    z: -point.x * s + point.z * c
  };
}

/**
 * Rotate a point around the X axis.
 */
export function rotateX(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x,
    y: point.y * c - point.z * s,
    z: point.y * s + point.z * c
  };
}

/**
 * Rotate a point around the Z axis.
 */
export function rotateZ(point, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: point.x * c - point.y * s,
    y: point.x * s + point.y * c,
    z: point.z
  };
}

/**
 * Format a number with commas for display.
 */
export function formatNumber(n, decimals = 0) {
  return n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format degrees to D°M'S" notation.
 */
export function formatDMS(degrees) {
  const d = Math.floor(Math.abs(degrees));
  const m = Math.floor((Math.abs(degrees) - d) * 60);
  const s = ((Math.abs(degrees) - d) * 60 - m) * 60;
  const sign = degrees < 0 ? '-' : '';
  return `${sign}${d}\u00B0${m}'${s.toFixed(1)}"`;
}
